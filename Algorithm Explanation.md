# How Cadence models hormone concentrations

> Updated: September 26, 2026
>
> An English revision of the December 5, 2025 model explanation, checked against the current Oyama HRT Cadence implementation.
>
> Implementation reference: `logic.ts` in repository revision `c6af429`. This describes the local code reviewed on the date above; it does not establish which version is deployed on a public website.

Cadence turns recorded doses into estimated concentration–time curves. Its core is a linear pharmacokinetic (PK) model: each dose contributes a time-dependent amount of drug, and contributions for the same substance are added together. The current implementation has separate channels for estradiol (E2), cyproterone acetate (CPA), and testosterone (T), plus an optional laboratory-based correction for E2.

This article documents the software's equations, parameter choices, and limitations. The curves are model estimates, not measured blood concentrations or a validated basis for choosing an individual dose. Empirically fitted parameters should not be read as universal physiological constants.

## Contents

1. Model structure and units
2. Ester-to-parent conversion
3. Default parameters and effective availability
4. Mathematical kernels
5. Estradiol routes
6. Testosterone and CPA
7. Simulation grid, concentration conversion, and AUC
8. Interpolation
9. Laboratory calibration
10. Custom parameters and implementation boundaries
11. Changes from the original article
12. Source map and evidence

## 1. Model structure and units

The main input is an array of `DoseEvent` records and a body weight:

```ts
runSimulation(events: DoseEvent[], bodyWeightKG: number): SimulationResult | null
```

An event contains its actual administration time, route, compound, dose, and optional route-specific data. `resolveParams` selects parameters, and `PrecomputedEventModel` constructs a function for the event's contribution.

:::info[Core idea]{open}

For substance $s$, let $\mathcal{J}_s$ be the set of its dose-event indices. The uncalibrated model is:

$$
A_s(t)=\sum_{j\in\mathcal{J}_s} A_j(t),
$$

where $A_j(t)$ is the central-compartment amount in mg. No endogenous baseline, hormone production feedback, or interaction between the three substance channels is added.

:::

| Field or symbol | Meaning | Unit |
| --- | --- | --- |
| `timeH`, $t$ | Hours since the Unix epoch | h |
| `doseMG`, $D$ | Mass of the recorded ester or compound | mg |
| `bodyWeightKG`, $W$ | Body weight used for the simulation | kg |
| $k_{\mathrm{a}},k_1,k_2,k_3$ | First-order rate constants | h⁻¹ |
| `releaseRateUGPerDay` | Nominal patch delivery rate | µg/day |
| `patchWearH` | Planned patch wear duration | h |
| `concPGmL_E2` | Estradiol concentration | pg/mL |
| `concPGmL_CPA` | CPA concentration, despite the field name | **ng/mL** |
| `concNGdL_T` | Model testosterone concentration | ng/dL |

`doseMG` is **not stored as E2-equivalent mass**. If an equivalent-dose field is used in the form, `DoseForm` converts it back to compound mass before saving. Gel dose means active drug mass, not the mass of the gel vehicle. For a rate-based patch, the form saves `doseMG = 0`; delivery is determined by the release-rate extra.

In the equations below, dimensional inputs and outputs are represented by their **numerical values in the stated units**: time in hours, dose and amount in mg, weight in kg, and rates in $\mathrm{h}^{-1}$. Units are stated in the surrounding text and tables, rather than appended to one side of a numerical-value equation. Conversion factors such as $10^9$ operate on these numerical values. Kernel arguments follow this same convention.

The model uses an **apparent distribution volume**, not literal plasma volume. For each substance:

$$
V_{s,\mathrm{mL}}=v_s W\times1000.
$$

| Substance | $v_s$ |
| --- | ---: |
| E2 | 2.0 L/kg |
| CPA | 14.0 L/kg |
| T | 1.0 L/kg |

These volume coefficients are fixed constants in the current engine. Changing body weight rescales the entire simulation; there is no time-varying weight history in `runSimulation`.

## 2. Ester-to-parent conversion

The enzyme-cleavable ester contributes mass that is not part of the parent hormone. Let $M_e$ be the molar mass of compound $e$. For an estradiol ester, the dimensionless parent-mass ratio is:

$$
m_e=\frac{M_{\mathrm{E2}}}{M_e}.
$$

For testosterone esters, the numerator is $M_{\mathrm{T}}$. Although the helper is named `getToE2Factor`, it returns a testosterone-parent ratio for T compounds.

| Code | Compound | Molar mass used by the code ($\mathrm{g}\,\mathrm{mol}^{-1}$) |
| --- | --- | ---: |
| E2 | Estradiol | 272.38 |
| EB | Estradiol benzoate | 376.50 |
| EV | Estradiol valerate | 356.50 |
| EC | Estradiol cypionate | 396.58 |
| EN | Estradiol enanthate | 384.56 |
| EU | Estradiol undecylate | 440.66 |
| T | Testosterone | 288.42 |
| TC | Testosterone cypionate | 412.60 |
| TE | Testosterone enanthate | 400.59 |
| TU | Testosterone undecanoate | 456.70 |

Unesterified E2 and T both have a parent-mass ratio of 1. These are code constants, not a claim about the precision of biological predictions.

For example, the theoretical E2-equivalent dose $D_{\mathrm{E2,eq}}$, expressed in mg, for a 4 mg EV dose is:

$$
D_{\mathrm{E2,eq}} = 4\times\frac{272.38}{356.50}\approx 3.056.
$$

This theoretical mass is distinct from the route's effective systemic contribution. The default injected EV multiplier additionally includes the fitted formation coefficient:

$$
F_{\mathrm{EV},\mathrm{inj}}=0.0623\times\frac{272.38}{356.50}.
$$

:::warning[Apply the mass conversion once]{open}

The saved dose remains 4 mg. The solver applies the conversion through $F$; callers must not pre-convert the saved dose and then apply the same factor again.

:::

CPA is handled separately. Its oral solver uses CPA mass directly with $F=0.7$. The generic `getBioavailabilityMultiplier` helper does not implement this CPA exception and must not be used as the authoritative oral CPA solver parameter.

## 3. Default parameters and effective availability

`getBioavailabilityMultiplier(route, ester, extras)` supplies the effective dose multiplier for the hormone routes. In this article, $F$ includes the parent-mass conversion wherever applicable. For injections it also includes an empirical formation coefficient; it is therefore broader than a directly measured absolute bioavailability.

For estradiol routes:

| Route | Effective multiplier |
| --- | --- |
| Injection | $f_{\mathrm{form},e}\,m_e$ |
| Oral | $0.03\,m_e$ |
| Sublingual | $[\theta+(1-\theta)\,0.03]m_e$ |
| Gel | $F_{\mathrm{site}}\,m_e$ |
| Patch application | $m_e$, normally 1 for E2 |
| Patch removal | 0; changes the delivery window only |

The non-injection E2 elimination constant is $0.41\,\mathrm{h}^{-1}$. Injection uses a separate effective constant, $0.041\,\mathrm{h}^{-1}$. The corresponding single-exponential half-lives, $\ln 2/k$, are approximately 1.69 and 16.9 hours. Neither is the terminal half-life of every complete route-specific curve: slow absorption and ester conversion can control the tail.

The defaults below can be changed only where exposed by `PKCustomParams`. A custom parameter set takes precedence over the documented defaults.

## 4. Mathematical kernels

Let a dose occur at $t_0$, and let $\tau=t-t_0$. Every dose contribution is zero for $\tau<0$.

### 4.1 First-order absorption and elimination

Define the Bateman kernel:

$$
B(\tau;D,F,k_{\mathrm{a}},k_{\mathrm{e}})
=\frac{DFk_{\mathrm{a}}}{k_{\mathrm{a}}-k_{\mathrm{e}}}
\left(e^{-k_{\mathrm{e}}\tau}-e^{-k_{\mathrm{a}}\tau}\right),
\qquad \tau\ge0.
$$

This represents an absorption compartment feeding one central compartment. In the code it appears as `oneCompAmount` and `_analytic2C`.

When $\lvert k_{\mathrm{a}}-k_{\mathrm{e}}\rvert<10^{-9}$, the implementation uses the equal-rate limit:

$$
B(\tau)=DFk_{\mathrm{a}}\tau e^{-k_{\mathrm{e}}\tau}.
$$

### 4.2 Sequential absorption, conversion, and elimination

For an ester requiring an explicit conversion step, and for $\tau\ge 0$ with distinct positive rates, define:

$$
\begin{aligned}
H(\tau;D,F,k_1,k_2,k_3)
&= DFk_1k_2\Biggl[
\frac{\exp(-k_1\tau)}{(k_1-k_2)(k_1-k_3)}\\[6pt]
&\qquad + \frac{\exp(-k_2\tau)}{(k_2-k_1)(k_2-k_3)}\\[6pt]
&\qquad + \frac{\exp(-k_3\tau)}{(k_3-k_1)(k_3-k_2)}
\Biggr].
\end{aligned}
$$

The stages are an absorption depot, an ester/conversion compartment, and the parent-hormone central compartment. `_analytic3C` evaluates this expression.

:::warning[Numerical stability]{open}

The old article said nearly equal rates cause the function to return zero. That is no longer the implementation. `_separateRates` uses a separation scale of $10^{-6}\max(k_1,k_2,k_3)$, keeps $k_1$ fixed, and perturbs nearby $k_2$ and $k_3$ before evaluating the expression. This is a numerical approximation around removable singularities, not an explicit symbolic equal-rate solution or a guarantee of accuracy for every parameter combination.

When there is no ester-conversion step, the route dispatcher uses the Bateman kernel rather than substituting $k_2=0$ into the three-stage expression.

:::

## 5. Estradiol routes

### 5.1 Injection

The injection model splits the dose between two parallel depots. Let $f$ be the fraction assigned to the branch labeled fast, with $1-f$ assigned to the branch labeled slow:

$$
\begin{aligned}
A(\tau) &= H(\tau;Df,F,k_{1,\mathrm{f}},k_2,k_3)\\[4pt]
&\quad + H(\tau;D(1-f),F,k_{1,\mathrm{s}},k_2,k_3).
\end{aligned}
$$

The current default parameters are:

| Compound | $f$ | $k_{1,\mathrm{f}}$ | $k_{1,\mathrm{s}}$ | $k_2$ | $f_{\mathrm{form}}$ |
| --- | ---: | ---: | ---: | ---: | ---: |
| EB | 0.90 | 0.144 | 0.114 | 0.090 | 0.1092 |
| EV | 0.40 | 0.0216 | 0.0138 | 0.070 | 0.0623 |
| EC | 0.229164549 | 0.005035046 | 0.004510574 | 0.045 | 0.1173 |
| EN | 0.05 | 0.0010 | 0.0050 | 0.015 | 0.12 |
| EU | 0.08 | 0.0060 | 0.0022 | 0.012 | 0.040 |
| E2 | 1.0 | 0.5 | 0 | 0 | 1.0 |

All rates are in h⁻¹. Here $F=f_{\mathrm{form}}m_e$, and $k_3=0.041$ by default. E2 absorption rates are multiplied by the fixed `depotK1Corr = 1.0`.

The names “fast” and “slow” are implementation labels. In the EN row, the branch named “fast” actually has the smaller rate constant. The values above intentionally preserve that behavior.

Unesterified E2 has $k_2=0$, so its injection contribution uses $B$ instead of $H$. The generic `injection` route does not separately encode intramuscular versus subcutaneous kinetics, injection site, oil vehicle, or injection volume.

### 5.2 Oral E2 and EV

Both oral E2 and oral EV use the Bateman kernel:

$$
A(\tau)=B(\tau;D,0.03m_e,k_{\mathrm{a}},0.41),
$$

with $k_{\mathrm{a}}$ expressed in $\mathrm{h}^{-1}$:

$$
k_{\mathrm{a}}=\begin{cases}
0.05, & \text{if } e=\mathrm{EV}\\[4pt]
0.32, & \text{if } e=\mathrm{E2}
\end{cases}
.
$$

`resolveParams` assigns a nonzero $k_2$ to oral EV, but `PrecomputedEventModel` calls `oneCompAmount`, which does not use it. There is no additional explicit hydrolysis stage in the oral EV curve. This distinction matters when reading parameter objects rather than following the executed solver path.

### 5.3 Sublingual E2 and EV

The dose is split into a mucosal branch $D\theta$ and a swallowed branch $D(1-\theta)$.

A finite `extras.sublingualTheta` takes precedence and is clamped to $[0,1]$. Otherwise, a numeric `sublingualTier` selects a preset; the default is Standard.

| Tier index | Preset | Default $\theta$ | Associated hold-time label |
| --- | --- | ---: | ---: |
| 0 | Quick | 0.01 | 2 min |
| 1 | Casual | 0.04 | 5 min |
| 2 | Standard | 0.11 | 10 min |
| 3 | Strict | 0.18 | 15 min |

These are preset mappings. The runtime does not integrate a tablet-dissolution or swallowing model from elapsed hold time. The four preset $\theta$ values can be customized.

For E2:

$$
A_{\mathrm{E2}}(\tau)
=B(\tau;D\theta,1,1.8,0.41)
+B(\tau;D(1-\theta),0.03,0.32,0.41).
$$

For EV, only the mucosal branch has explicit ester conversion:

$$
\begin{aligned}
A_{\mathrm{EV}}(\tau) &= H(\tau;D\theta,m_{\mathrm{EV}},1.8,0.070,0.41)\\[4pt]
&\quad + B(\tau;D(1-\theta),0.03m_{\mathrm{EV}},0.05,0.41).
\end{aligned}
$$

The swallowed EV branch uses the same simplified kernel as oral EV. Consequently, setting $\theta=0$ reproduces the corresponding oral E2 or EV curve. The original article's description of two three-stage EV branches is outdated.

### 5.4 Gel

The E2 gel model is:

$$
A(\tau)=B(\tau;D,F_{\mathrm{site}}m_e,0.0193,0.41).
$$

For the usual E2 compound, $m_e=1$. `gelSite` is a numeric index into `GEL_SITE_ORDER`:

| Index | Site key | Default E2 $F_{\mathrm{site}}$ |
| --- | --- | ---: |
| 0 | `arm` | 0.05 |
| 1 | `thigh` | 0.05 |
| 2 | `scrotal` | 0.25 |

The literal absorption rate in the code is **0.0193 h⁻¹**, approximately $\ln 2/36$, replacing the original article's 0.022 h⁻¹.

The 36-hour reference is product-specific: the [EstroGel FDA label](https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/021166s019lbl.pdf) reports an apparent terminal half-life of about 36 hours, whereas the [Divigel FDA label](https://www.accessdata.fda.gov/drugsatfda_docs/label/2007/022038lbl.pdf) reports about 10 hours. Using 36 hours as an absorption timescale is the model's assumption; it is not a universal measured absorption constant for estradiol gels.

The arm/thigh value of 0.05 is an effective calibration choice documented in the code. The scrotal value of 0.25 is an extrapolated model parameter, not a directly established E2-gel bioavailability. These parameters do not establish that a formulation is suitable for a particular application site.

Although an `areaCM2` extra exists, the current PK solver does not use application area or dose density. It also does not explicitly model washing, skin transfer, vehicle differences, or saturable absorption.

### 5.5 Patches

:::info[Two patch modes]{open}

1. **Constant-rate delivery:** a finite, positive `releaseRateUGPerDay` specifies the nominal delivery rate.
2. **Legacy first-order delivery:** without a valid positive release rate, the model approximates absorption from the recorded patch dose.

Both modes stop input at the resolved end of the wear period and then model elimination of the remaining central-compartment amount.

:::

A finite, positive `releaseRateUGPerDay` activates constant-rate delivery. Let $r$ be the nominal rate in µg/day. The effective input rate $R$, expressed in mg/h, is:

$$
R = \frac{rF}{24\times1000}.
$$

For an E2 patch, $F=1$. If the wear duration is $T_{\mathrm{w}}$:

$$
A(\tau)=\begin{cases}
\dfrac{R}{k_3}(1-e^{-k_3\tau}),&0\le\tau\le T_{\mathrm{w}}\\[6pt]
\dfrac{R}{k_3}(1-e^{-k_3T_{\mathrm{w}}})e^{-k_3(\tau-T_{\mathrm{w}})},&\tau>T_{\mathrm{w}}
\end{cases}
.
$$

No reservoir-capacity limit is imposed in this branch; `doseMG` does not cap the amount delivered.

Without a valid positive release rate, the legacy branch uses $B$ with $k_{\mathrm{a}}=0.0075\,\mathrm{h}^{-1}$ for E2. After removal:

$$
A(\tau)=B(T_{\mathrm{w}};D,F,k_{\mathrm{a}},k_3)e^{-k_3(\tau-T_{\mathrm{w}})}.
$$

Patch timing is resolved in this order:

1. Applications and removals are walked chronologically. Each removal is paired with the oldest unpaired application: first in, first out.
2. A paired removal strictly later than application determines wear duration, overriding the planned duration.
3. Otherwise, a finite positive `patchWearH` is used.
4. Without either, delivery is treated as continuing indefinitely.

Pairing is based on event order, not a patch identifier or compound. Planned expiry does not remove an application from the pairing queue. Therefore, complex overlapping or mixed-compound patch histories can be ambiguous. A removal recorded at exactly the application time does not produce zero wear under the current strict comparison; the resolver falls back to the planned duration or indefinite wear.

## 6. Testosterone and CPA

### 6.1 Testosterone

Testosterone events use a separate parameter set and concentration channel. The same mathematical kernels are reused.

| Parameter | Default |
| --- | ---: |
| Apparent distribution volume | 1.0 L/kg |
| Non-injection elimination $k_3$ | 0.5 h⁻¹ |
| Injection elimination $k_3$ | 0.035 h⁻¹ |
| Gel absorption $k_{\mathrm{a}}$ | 0.05 h⁻¹ |
| Legacy patch absorption $k_{\mathrm{a}}$ | 0.03 h⁻¹ |
| Gel site multipliers: arm / thigh / scrotal | 0.10 / 0.10 / 0.50 |

For testosterone ester injections:

| Compound | $f$ | $k_{1,\mathrm{f}}$ | $k_{1,\mathrm{s}}$ | $k_2$ | Formation coefficient |
| --- | ---: | ---: | ---: | ---: | ---: |
| TC | 0.35 | 0.025 | 0.005 | 0.20 | 0.025 |
| TE | 0.40 | 0.035 | 0.008 | 0.20 | 0.025 |
| TU | 0.10 | 0.008 | 0.0009 | 0.20 | 0.025 |

The effective multiplier is the formation coefficient times $M_{\mathrm{T}}/M_e$. Gel similarly applies the site multiplier and parent-mass ratio. T patches use the same constant-rate or legacy equations as E2, with T-specific rates and volume.

The implementation returns zero for oral T, sublingual T, and unesterified T injection. This describes the software's supported paths, not a claim that all other formulations or routes are medically impossible. Although the output is labeled total testosterone, it contains only the contribution modeled from logged doses; endogenous production, suppression, aromatization, and binding dynamics are not separately simulated.

### 6.2 Cyproterone acetate

Oral CPA uses:

$$
A_{\mathrm{CPA}}(\tau)=B(\tau;D,0.7,1.0,0.017).
$$

The apparent distribution volume is 14 L/kg, and the output is **ng/mL**. This special case bypasses the hormone-equivalent conversion. CPA concentration is not converted into a predicted testosterone suppression effect or an E2 contribution.

## 7. Simulation grid, concentration conversion, and AUC

### 7.1 Time range and sampling

`runSimulation` returns `null` for an empty event list or a body weight less than or equal to zero. For valid inputs it sorts a copy of the events by `timeH` and constructs one model per non-removal event.

Let $t_{\min}$ and $t_{\max}$ be the first and last recorded event times. The simulation range is:

$$
t_{\mathrm{start}}=t_{\min}-24,
$$

$$
t_{\mathrm{end}}=\max(t_{\max}+336,\ t_{\mathrm{now}}+24).
$$

The current clock therefore affects the output range even when dose records do not change. Reproducible comparisons should hold the clock fixed.

The base point count is:

$$
N=\min\left(100000,\max\left(2000,\left\lceil t_{\mathrm{end}}-t_{\mathrm{start}}\right\rceil\right)\right),
$$

with uniform spacing $\Delta t=(t_{\mathrm{end}}-t_{\mathrm{start}})/(N-1)$. This provides roughly hourly or finer sampling before the cap is reached, replacing the old fixed 1,000-point grid.

The engine then adds every explicit event time and selected points at 0.25, 0.5, 1, 2, 4, 6, 8, 12, 24, and 48 hours after dose events. Extra sampling is skipped for events whose age at the simulation end exceeds twice their computed lifetime. The merged times are deduplicated and sorted, so the **final grid is nonuniform and can contain more than 100,000 points**. Planned patch-expiry times are not automatically inserted as dedicated grid points.

### 7.2 Contribution pruning

The engine keeps a sliding set of active dose models. For non-patch events it estimates a lifetime using the slowest positive resolved rate:

$$
L=\left\lceil\frac{13.816}{k_{\min}}\right\rceil.
$$

For finite-duration patches it uses wear time plus $\lceil13.816/k_3\rceil$; indefinite patches are not pruned. Contributions are skipped once their lifetime expires.

This is an exponential-tail performance heuristic. It is not an exact relative-error bound for every sum of exponentials or nearly equal-rate limit. Patch lifetime lookup also identifies an application by timestamp, so multiple applications at the same time with different wear durations can share the wrong pruning duration even though the contribution model itself is paired by event identity.

### 7.3 Substance-specific concentrations

Amounts are accumulated separately. The following equations return E2 in pg/mL, CPA in ng/mL, and T in ng/dL, using amounts in mg and apparent volumes in mL:

$$
C_{\mathrm{E2}}(t)=\frac{A_{\mathrm{E2}}(t)10^9}{V_{\mathrm{E2},\mathrm{mL}}},
$$

$$
C_{\mathrm{CPA}}(t)=\frac{A_{\mathrm{CPA}}(t)10^6}{V_{\mathrm{CPA},\mathrm{mL}}},
$$

$$
C_{\mathrm{T}}(t)=\frac{A_{\mathrm{T}}(t)10^8}{V_{\mathrm{T},\mathrm{mL}}}.
$$

Use the substance-specific arrays to interpret hormone concentrations.

### 7.4 What the returned AUC actually measures

The legacy compatibility array is:

$$
C_{\mathrm{legacy}}(t)=C_{\mathrm{E2}}(t)+1000C_{\mathrm{CPA}}(t).
$$

Testosterone is excluded. Let $n$ be the number of samples in the final grid. The `auc` property integrates this legacy array using the trapezoidal rule:

$$
\mathrm{AUC}_{\mathrm{returned}}\approx
\sum_{i=1}^{n-1}
\frac{C_{\mathrm{legacy}}(t_i)+C_{\mathrm{legacy}}(t_{i-1})}{2}
(t_i-t_{i-1}).
$$

If CPA is present, this adds the mass concentrations of two different drugs after a unit conversion. It has **no interpretation as a combined hormone effect or E2 exposure**. Only when CPA is absent does it equal the uncalibrated E2 AUC over the sampled window. A T-only simulation has zero returned legacy AUC despite a nonzero T curve.

For meaningful substance-specific AUC, integrate the relevant array separately: E2 in pg·h/mL, CPA in ng·h/mL, and T in ng·h/dL. For calibrated E2 exposure, integrate the corrected E2 curve. `runSimulation().auc` is not automatically recalculated by laboratory calibration.

All these sampled AUCs cover a finite window, not necessarily the full dose tail or a steady-state dosing interval. For comparison, the ideal untruncated Bateman kernel satisfies:

$$
\int_0^\infty B(\tau;D,F,k_{\mathrm{a}},k_{\mathrm{e}})\,\mathrm{d}\tau
= \frac{DF}{k_{\mathrm{e}}}.
$$

The concentration integral also requires the volume and unit conversion.

## 8. Interpolation

The four interpolation functions use the corresponding output channel:

| Function | Output |
| --- | --- |
| `interpolateConcentration` | Legacy E2 + converted CPA sum |
| `interpolateConcentration_E2` | E2, pg/mL |
| `interpolateConcentration_CPA` | CPA, ng/mL |
| `interpolateConcentration_T` | T, ng/dL |

An empty time array returns `null`. A query at or outside either endpoint returns that endpoint's concentration; the functions do not extrapolate a new PK tail.

Inside the range, binary search locates adjacent samples and evaluates:

$$
C(t)=C(t_i)+\frac{t-t_i}{t_{i+1}-t_i}\left[C(t_{i+1})-C(t_i)\right].
$$

Interpolation works on the final nonuniform grid. It approximates the sampled curve rather than reevaluating each event's analytical kernel at the requested time.

## 9. Laboratory calibration

The base PK engine and laboratory calibration are separate stages. `computeCalibration` returns a time-dependent correction:

$$
C_{\mathrm{E2},\mathrm{cal}}(t)=C_{\mathrm{E2},\mathrm{base}}(t)\,r(t).
$$

The current-level calculation in `useAppData` applies this factor to E2. CPA and T remain unchanged.

### 9.1 Laboratory inputs

E2 results in pmol/L are divided by 3.671 to obtain pg/mL. Results recorded in ng/dL or nmol/L are classified as testosterone results and excluded from E2 calibration. For testosterone, the code converts nmol/L to ng/dL by multiplying by 28.842.

For each eligible E2 result, the code compares the observation with interpolated baseline E2 at the blood-draw time. Observations at or below zero and predictions below 1 pg/mL are excluded. The implementation can fall back to the nearest sample if interpolation fails. The comparison ratio is observation divided by prediction.

Laboratory times outside the simulation window inherit interpolation's endpoint clamping; calibration does not separately reject those times. Accurate dose and draw timestamps remain essential to interpreting the fit.

### 9.2 Available methods

| Method | Behavior |
| --- | --- |
| `off` | Returns $r(t)=1$. |
| `ekf` | Extended Kalman filter for log-amplitude and log-clearance, processing results chronologically. |
| `ou_kalman` | Time-varying log correction with Ornstein–Uhlenbeck mean reversion; no clearance adjustment. |
| `mipd` | Model-informed maximum-a-posteriori fit using Gaussian parameter priors and a robust Student-t likelihood. |

The function defaults to `mipd` with `retrospective` history. User settings may select a different method or history mode.

EKF and MIPD evaluate E2 responses on 21 log-spaced clearance multipliers from 0.5 to 2.0, multiplying both E2 elimination constants. Fit calculations interpolate log predictions across this grid. The correction curve selects the nearest grid simulation and combines its concentration ratio with an amplitude scale. Thus changing clearance changes curve shape as well as height.

Clearance learning is enabled when at least three eligible labs are available. This is a software threshold, not evidence that any three draws uniquely identify clearance. In forward MIPD it is checked separately for each prefix of the lab history. In EKF it is checked once against the full supplied lab count, so adding a third lab can change earlier fitted snapshots.

The grid spans 0.5–2.0, but the optimizer state itself is not strictly clamped to that interval. An out-of-range fitted `kMul` can therefore be reported while the concentration response is evaluated at a grid boundary. The grid range should not be described as a guaranteed bound on the reported parameter.

For OU-Kalman, the mean-reversion timescale is 336 hours and the stationary log standard deviation is 0.5. The correction relaxes toward 1 between or after observations. Retrospective mode additionally uses smoothing across the lab history.

### 9.3 Historical application and interpretation

In `forward` mode, the correction before the first eligible lab is 1. Later segments use the available per-lab fit or forward-filter correction. In `retrospective` mode, later observations can change earlier estimates. Because of the EKF clearance threshold described above, forward EKF should not be presented as an absolute guarantee that adding a lab can never revise earlier output.

Returned factors are constrained to approximately 0.01–100. `fitErrPct` is a summary of log-space residuals, not a prediction interval, a confidence level, or a measure of clinical validation. A good fit can absorb errors in dose history, route assumptions, timing, and baseline production as well as genuine individual PK differences.

## 10. Custom parameters and implementation boundaries

`DEFAULT_PK_PARAMS` defines the baseline. `applyPKOverrides` sanitizes supplied values, merges them with defaults, and activates the result. Configurable values include E2 and T elimination rates, ester-injection formation coefficients, E2 oral availability, sublingual preset fractions, and gel site fractions.

Absorption rates, ester-conversion rates, depot splits, CPA parameters, and apparent distribution volumes are not exposed through the current `PKCustomParams` interface. `runSimulationWithParams` temporarily applies an explicit parameter set and restores the previous one in a `finally` block; calibration uses it to evaluate candidate curves.

Parameter sanitization is not full event validation. The low-level `runSimulation` entry point only checks for no events or nonpositive body weight; it does not independently enforce every finite-number, date, dose, or route/compound constraint. Normal app input and import validation must supply valid records.

The model also omits explicit SHBG/albumin binding, estrone and estrone-sulfate pools, endogenous production, endocrine suppression, and drug–drug interactions. The E2 output must not be described as a calculated unbound or “free E2” assay value: there is no binding model separating free and bound fractions. Brand, application technique, and individual physiological differences are only partly represented by route constants and calibration.

## 11. Changes from the original article

| Original description | Current implementation |
| --- | --- |
| E2 and four estradiol esters | Adds EU, separate testosterone channels, and oral CPA |
| Oral availability described simply as 0.03 | Hormone solver includes the ester-to-parent mass ratio |
| Two three-stage branches for sublingual EV | Three-stage mucosal branch plus Bateman swallowed branch |
| Gel absorption 0.022 h⁻¹ and one availability value | 0.0193 h⁻¹ and site-dependent availability |
| Near-equal three-stage rates return zero | Rates are perturbed before analytical evaluation |
| Injection always uses the three-stage expression | Unesterified E2 uses the Bateman fallback |
| Patch duration determined only by a later removal | FIFO pairing, planned wear fallback, then indefinite wear |
| 1,000 uniformly spaced samples | Adaptive base grid plus event and selected peri-event samples |
| End time is last event plus 14 days | Also extends to at least the current time plus 24 hours |
| One concentration and E2 AUC | Separate substance channels; legacy AUC mixes E2 and CPA |
| No laboratory correction | Optional E2 calibration with four methods and two history modes |

## 12. Source map and evidence

The implementation is the source of truth for statements about what this version calculates:

| Source | Relevant definitions |
| --- | --- |
| `logic.ts` | `DoseEvent`, `SimulationResult`, molecular weights and PK constants |
| `logic.ts` | `DEFAULT_PK_PARAMS`, `getBioavailabilityMultiplier`, `resolveParams` |
| `logic.ts` | `_analytic2C`, `_analytic3C`, `oneCompAmount`, `PrecomputedEventModel` |
| `logic.ts` | `patchRemovalTimes`, `resolvePatchWearH`, `computeMaxLifetimeH` |
| `logic.ts` | `runSimulation` and the four interpolation functions |
| `logic.ts` | `computeCalibrationPoints`, `computeCalibration`, calibration estimators |
| `src/components/DoseForm.tsx` | Compound-mass storage and route-specific extras |
| `src/hooks/useAppData.ts` | Application of E2 calibration to the current level |

The gel half-life discussion was checked against the [EstroGel FDA label, clinical pharmacology section](https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/021166s019lbl.pdf) and the [Divigel FDA label, clinical pharmacology section](https://www.accessdata.fda.gov/drugsatfda_docs/label/2007/022038lbl.pdf). Those documents support the product-specific observations cited above; they do not validate the complete Cadence model, its empirical site multipliers, or its use for individual dosing decisions.

Other numerical tables in this article report implementation defaults. Their presence in source code establishes reproducibility, not independent clinical validation.
