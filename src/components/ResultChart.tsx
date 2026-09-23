import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { joinList, joinSentences } from '../i18n/listSeparator';
import { useTranslation } from '../contexts/LanguageContext';
import { formatDate, formatTime, LOCALE_MAP } from '../utils/helpers';
import {
    SimulationResult, DoseEvent, LabResult, HRTMode,
    interpolateConcentration_E2, interpolateConcentration_CPA, interpolateConcentration_T,
    convertToPgMl, convertToNgDl, isT_LabUnit, T_ESTERS,
} from '../../logic';
import { Activity } from './icons';
import { SegmentedControl } from './ui';
import { useHRTMode } from '../contexts/HRTModeContext';
import { useElementSize } from '../hooks/useElementSize';
import { isProjection } from '../hooks/useProjection';

const HOUR = 3600000;
const DAY = 24 * HOUR;

type RangeKey = '7d' | '30d' | 'all';

// Pick a "nice" rounding step (1/2/5 × 10^n) near the requested magnitude.
const niceStep = (raw: number): number => {
    if (!(raw > 0)) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return nice * mag;
};

// Build a padded, tick-friendly [min, max] domain from observed values.
const buildYDomain = (min: number, max: number): [number, number] => {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= 0) return [0, 1];
    if (max === min) max = max + (max * 0.15 || 1);
    const pad = (max - min) * 0.12;
    const step = niceStep((max - min + 2 * pad) / 4);
    const lo = Math.max(0, Math.floor((min - pad) / step) * step);
    let hi = Math.ceil((max + pad) / step) * step;
    if (hi <= lo) hi = lo + step;
    return [lo, hi];
};

const ticksFor = ([lo, hi]: [number, number]): number[] => {
    const step = niceStep((hi - lo) / 4);
    const out: number[] = [];
    for (let v = lo; v <= hi + step * 0.5; v += step) out.push(Math.round(v / step) * step);
    return out;
};

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Eases a [lo, hi] pair toward its target, so a change of scale glides under
 *  the curve instead of snapping to it. This is the axis behaviour from the
 *  product film. `instant` bypasses it, which is what a live drag needs: the
 *  window has to track the finger, not lag behind it. */
const useEasedPair = (target: [number, number], instant: boolean): [number, number] => {
    const [shown, setShown] = useState<[number, number]>(target);
    const shownRef = useRef<[number, number]>(target);
    const targetRef = useRef<[number, number]>(target);
    const rafRef = useRef(0);
    const lastRef = useRef(0);
    targetRef.current = target;

    // The loop lives across renders rather than inside one. It reads the target
    // through a ref, so a target that keeps moving (the window tracks "now", and
    // the y domain follows the slice the ease itself is widening) just steers the
    // animation already in flight. Tearing the effect down and rebuilding it on
    // every target change instead cancelled the pending frame before it could
    // run, and the ease then never advanced at all: switching 30d/all back to 7d
    // left the drawn window stuck on the old one, squeezing the whole visible
    // range into a hairline at the right-hand edge.
    useEffect(() => {
        if (instant || prefersReducedMotion()) {
            if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
            shownRef.current = targetRef.current;
            setShown(targetRef.current);
            return;
        }
        if (rafRef.current) return;                     // already easing — let it keep going
        lastRef.current = performance.now();
        const step = (now: number) => {
            const dt = Math.min(64, now - lastRef.current);
            lastRef.current = now;
            const [tl, th] = targetRef.current;
            const [cl, ch] = shownRef.current;
            const k = 1 - Math.exp(-dt / 95);            // ~95 ms time constant
            const nl = cl + (tl - cl) * k;
            const nh = ch + (th - ch) * k;
            const span = Math.abs(th - tl) || 1;
            const done = Math.abs(nl - tl) / span < 1e-4 && Math.abs(nh - th) / span < 1e-4;
            shownRef.current = done ? [tl, th] : [nl, nh];
            setShown(shownRef.current);
            rafRef.current = done ? 0 : requestAnimationFrame(step);
        };
        rafRef.current = requestAnimationFrame(step);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target[0], target[1], instant]);

    // Zero the ref as well as cancelling: StrictMode (and any remount of a kept
    // instance) runs this cleanup and then the effect above again, and a stale
    // id there reads as "already easing", so the window would never move again.
    useEffect(() => () => { if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; } }, []);

    return shown;
};

/** Holds the outgoing label set on screen alongside the incoming one, so axis
 *  labels dissolve between scales rather than popping in and out. */
function useFadingSet<T>(items: T[], sig: string, instant = false): { prev: T[]; next: T[]; u: number } {
    const last = useRef({ items, sig });
    const [fade, setFade] = useState<{ prev: T[]; u: number }>({ prev: [], u: 1 });

    useEffect(() => {
        if (sig === last.current.sig) return;
        const outgoing = last.current.items;
        last.current = { items, sig };
        // Dates change on every frame of a drag; dissolving each one just
        // reads as flicker, so during a drag they simply swap.
        if (instant || prefersReducedMotion()) { setFade({ prev: [], u: 1 }); return; }
        setFade({ prev: outgoing, u: 0 });
        let raf = 0;
        const start = performance.now();
        const step = (now: number) => {
            const u = Math.min(1, (now - start) / 280);
            setFade(f => ({ prev: f.prev, u }));
            if (u < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sig, instant]);

    if (sig === last.current.sig) last.current.items = items;
    return { prev: fade.prev, next: items, u: fade.u };
}

const fmtAxis = (v: number) => (v >= 100 || v % 1 === 0 ? String(Math.round(v)) : v < 1 ? v.toFixed(2) : v.toFixed(1));

/** A reading as the readout strip says it: "About 243". Cyproterone is small
 *  enough that it keeps a decimal or two. */
const fmtReading = (v: number, fine = false) =>
    fine ? (v >= 10 ? v.toFixed(1) : v.toFixed(2)) : String(Math.round(v));

/** Units as the design writes them. */
const unitLabel = (u: string) => (u === 'pg/ml' ? 'pg/mL' : u === 'ng/dl' ? 'ng/dL' : u === 'ng/ml' ? 'ng/mL' : u);

/** Fills {name} slots in a translated string. */
const fillIn = (s: string, vars: Record<string, string | number>) =>
    s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));

/** Rough rendered width of a label, for sizing the "Now" tab and deciding
 *  whether a direct label has room. CJK glyphs are about one em wide. */
const textWidth = (s: string, px: number, bold = false) => {
    let em = 0;
    for (const ch of s) em += ch.charCodeAt(0) > 0x2e80 ? 1 : bold ? 0.6 : 0.56;
    return em * px;
};

const ResultChart = ({
    sim,
    events,
    labResults = [],
    calibrationFn = (_t: number) => 1,
    onPointClick,
    isMono = false,
    mode,
    title,
    timeZone,
    showTitle = true,
    headerClassName = '',
    showCalibrationNote = true,
    projection = null,
}: {
    sim: SimulationResult | null;
    events: DoseEvent[];
    labResults?: LabResult[];
    calibrationFn?: (timeH: number) => number;
    onPointClick?: (e: DoseEvent) => void;
    /** Kept for callers. Colours come from the Cadence tokens, which flip with
     *  the theme class on <html>, so the chart no longer needs to be told. */
    isDarkMode?: boolean;
    isMono?: boolean;
    mode?: HRTMode;
    title?: string;
    timeZone?: string;
    /** False when the page already heads the chart (Today's "This week"). */
    showTitle?: boolean;
    /** Extra classes for the header row, e.g. to hide the range on a phone. */
    headerClassName?: string;
    /** False when the page shows its own calibration note (Timeline). */
    showCalibrationNote?: boolean;
    /** The estimate with the planned doses added (useProjection). When given,
     *  the dashed part after now is drawn from it and reads "If you keep your
     *  schedule", and its planned doses show as outlined triangles. Without it
     *  the dashed part is the logged doses wearing off, and says so. */
    projection?: SimulationResult | null;
}) => {
    const { t, lang } = useTranslation();
    const { isTransmasc: contextIsTransmasc } = useHRTMode();
    const isTransmasc = mode ? mode === 'transmasc' : contextIsTransmasc;
    const clipId = useId().replace(/:/g, '');

    const [plotEl, setPlotEl] = useState<HTMLDivElement | null>(null);
    const { width, height } = useElementSize(plotEl);

    const [range, setRange] = useState<RangeKey>('7d');
    const [hover, setHover] = useState<number | null>(null);
    const [panOffset, setPanOffset] = useState(0); // ms the window is dragged from its centered base
    const [dragging, setDragging] = useState(false);
    const dragRef = useRef<{ startX: number; startY: number; startOffset: number; moved: boolean; pointerId: number } | null>(null);

    const selectRange = (r: RangeKey) => { setRange(r); setPanOffset(0); };

    // Cadence tokens (src/index.css). They are redefined under .dark, so the
    // same values serve both themes, including on a shared page that passes no
    // theme at all. Mono is a grayscale filter over the whole page.
    const c = {
        primary: 'var(--c-accent)',
        second: 'var(--c-second)',
        ink: 'var(--c-ink)',
        muted: 'var(--c-muted)',
        hairline: 'var(--c-hairline)',
        rule: 'var(--c-rule)',
        plate: 'var(--c-plate)',
        paper: 'var(--c-paper)',
        surface: 'var(--c-surface)',
        target: 'var(--c-target)',
    };

    // Which series are relevant for the current mode / logged doses.
    const hasE2 = isTransmasc ? false : events.some(e => e.ester !== 'CPA' && !T_ESTERS.has(e.ester));
    const hasCPA = !isTransmasc && events.some(e => e.ester === 'CPA');
    const primaryIsCPA = !isTransmasc && !hasE2 && hasCPA;
    const hasSecondary = hasE2 && hasCPA; // CPA shown on its own right-hand axis

    const primaryMeta = isTransmasc
        ? { label: t('label.total_t'), unit: 'ng/dl', decimals: 0 }
        : primaryIsCPA
            ? { label: t('chart.cpa'), unit: 'ng/ml', decimals: 2 }
            : { label: t('label.e2'), unit: 'pg/ml', decimals: 1 };
    const unit = unitLabel(primaryMeta.unit);

    // Typical target band for the primary series, matching the reference ranges the
    // app uses for its status labels (see useAppData currentStatus): transmasc total-T
    // sits in the ~300–1000 ng/dL male range; transfem E2 in the ~100–200 pg/mL band.
    // CPA has no target range, so it gets none.
    const primaryTarget = useMemo<{ low: number; high: number } | null>(() => {
        if (isTransmasc) return { low: 300, high: 1000 };
        if (primaryIsCPA) return null;
        return { low: 100, high: 200 };
    }, [isTransmasc, primaryIsCPA]);

    // A clock that ticks, not one that is read on every render. `now` anchors the
    // visible window, the "now" marker and the calibration read-off; taking it
    // from Date.now() inline made every one of those a fresh value on each of the
    // ~60 renders a second an animation produces, so nothing downstream of it
    // could ever settle. A minute is finer than this chart resolves, and it is
    // the cadence the readings above it already refresh on.
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(id);
    }, []);

    // The projection counts only after now, and only as far as it plans doses.
    const proj = projection && projection.timeH.length > 0 ? projection : null;
    const projEndMs = proj
        ? isProjection(proj) ? proj.horizonMs : proj.timeH[proj.timeH.length - 1] * HOUR
        : 0;
    /** The simulation that speaks for a moment: logged doses up to now, the
     *  projection after it. */
    const simAt = (ms: number): SimulationResult | null => (proj && ms > now ? proj : sim);

    // Resample the simulation into the (time, primary, secondary) shape we plot:
    // the logged estimate up to now, then the projection (when there is one).
    const data = useMemo(() => {
        type Pt = { t: number; p: number; s: number | null };
        if (!sim || sim.timeH.length === 0) return [] as Pt[];
        const sample = (src: SimulationResult, i: number): Pt => {
            const h = src.timeH[i];
            const time = h * HOUR;
            if (isTransmasc) return { t: time, p: src.concNGdL_T?.[i] ?? 0, s: null };
            const e2 = src.concPGmL_E2[i] * calibrationFn(h);
            const cpa = src.concPGmL_CPA[i];
            return { t: time, p: primaryIsCPA ? cpa : e2, s: hasSecondary ? cpa : null };
        };
        const out: Pt[] = [];
        for (let i = 0; i < sim.timeH.length; i++) {
            if (proj && sim.timeH[i] * HOUR > now) break;
            out.push(sample(sim, i));
        }
        if (proj) {
            for (let i = 0; i < proj.timeH.length; i++) {
                const time = proj.timeH[i] * HOUR;
                if (time <= now) continue;
                if (time > projEndMs) break;
                out.push(sample(proj, i));
            }
        }
        return out;
    }, [sim, proj, projEndMs, now, calibrationFn, isTransmasc, primaryIsCPA, hasSecondary]);

    const fullMin = data.length ? data[0].t : now;
    const fullMax = data.length ? data[data.length - 1].t : now;

    // Base window (before drag) — centered on "now" for 7d/30d, full span for "all".
    const baseWindow = useMemo<[number, number]>(() => {
        if (range === 'all' || data.length === 0) return [fullMin, fullMax];
        const span = range === '7d' ? 7 * DAY : 30 * DAY;
        const center = Math.min(Math.max(now, fullMin), fullMax);
        let lo = center - span / 2;
        let hi = center + span / 2;
        if (lo < fullMin) { lo = fullMin; hi = Math.min(fullMax, lo + span); }
        if (hi > fullMax) { hi = fullMax; lo = Math.max(fullMin, hi - span); }
        return [lo, hi];
    }, [range, data.length, fullMin, fullMax, now]);

    // How far the window can be dragged in each direction without leaving the data.
    const [minOffset, maxOffset] = useMemo<[number, number]>(() => {
        const a = fullMin - baseWindow[0]; // shifts t0 down to fullMin
        const b = fullMax - baseWindow[1]; // shifts t1 up to fullMax
        return [Math.min(a, b), Math.max(a, b)];
    }, [baseWindow, fullMin, fullMax]);

    // Visible window with the (clamped) drag offset applied.
    const [t0, t1] = useMemo<[number, number]>(() => {
        const off = Math.max(minOffset, Math.min(maxOffset, panOffset));
        return [baseWindow[0] + off, baseWindow[1] + off];
    }, [baseWindow, panOffset, minOffset, maxOffset]);
    const canPan = maxOffset - minOffset > DAY;

    // The window actually on screen. It eases toward the target so a change of
    // range glides, but a live drag is exempt: the plot has to track the finger.
    const [vt0, vt1] = useEasedPair([t0, t1], dragging);

    // Only the slice we draw (plus one neighbour each side so lines reach the
    // edges). It spans the union of the target window and the one currently
    // drawn: mid-ease those differ, and slicing to the target alone leaves the
    // rest of the plot with no data to draw, which is what made 30d to 7d snap
    // rather than stretch.
    const slice = useMemo(() => {
        if (data.length === 0) return [];
        const lo0 = Math.min(t0, vt0), hi0 = Math.max(t1, vt1);
        let lo = 0, hi = data.length - 1;
        while (lo < data.length - 1 && data[lo + 1].t < lo0) lo++;
        while (hi > 0 && data[hi - 1].t > hi0) hi--;
        return data.slice(Math.max(0, lo), Math.min(data.length, hi + 1));
    }, [data, t0, t1, vt0, vt1]);

    const labPoints = useMemo(() => {
        if (!labResults.length) return [];
        return labResults
            .filter(l => (isTransmasc ? isT_LabUnit(l.unit) : !isT_LabUnit(l.unit)))
            .map(l => ({
                t: l.timeH * HOUR,
                v: isTransmasc ? convertToNgDl(l.concValue, l.unit) : convertToPgMl(l.concValue, l.unit),
                raw: l.concValue, unit: l.unit, id: l.id,
            }))
            .filter(l => l.t >= t0 && l.t <= t1)
            .sort((a, b) => a.t - b.t);
    }, [labResults, isTransmasc, t0, t1]);

    // Doses the projection adds. They are drawn outlined and cannot be opened:
    // there is nothing logged to edit yet.
    const planned = useMemo<DoseEvent[]>(
        () => (proj && isProjection(proj) ? proj.planned.filter(e => e.timeH * HOUR > now && e.timeH * HOUR <= projEndMs) : []),
        [proj, projEndMs, now],
    );

    // Dose markers sit on whichever axis their compound belongs to.
    type Marker = { t: number; v: number; axis: 'p' | 's'; event: DoseEvent; planned: boolean };
    const markers = useMemo(() => {
        if (!sim) return [] as Marker[];
        const toMarker = (e: DoseEvent, isPlanned: boolean): Marker | null => {
            const isT = T_ESTERS.has(e.ester);
            const isCPA = e.ester === 'CPA';
            if (isTransmasc ? !isT : isT) return null;
            const src = simAt(e.timeH * HOUR) ?? sim;
            let value: number | null, axis: 'p' | 's';
            if (isTransmasc) { value = interpolateConcentration_T(src, e.timeH); axis = 'p'; }
            else if (isCPA) { value = interpolateConcentration_CPA(src, e.timeH); axis = hasSecondary ? 's' : 'p'; }
            else { const v = interpolateConcentration_E2(src, e.timeH); value = v == null ? null : v * calibrationFn(e.timeH); axis = 'p'; }
            const v = value != null && Number.isFinite(value) ? value : 0;
            // A dose logged ahead of time is still a plan until its moment comes.
            return { t: e.timeH * HOUR, v, axis, event: e, planned: isPlanned || e.timeH * HOUR > now };
        };
        return [
            ...events.map(e => toMarker(e, false)),
            ...planned.map(e => toMarker(e, true)),
        ].filter((m): m is Marker => !!m && m.t >= t0 && m.t <= t1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sim, proj, events, planned, isTransmasc, hasSecondary, calibrationFn, t0, t1, now]);

    // Y domains scale to what's visible in the current window.
    const yPrimary = useMemo(() => {
        let mx = -Infinity;
        for (const d of slice) if (d.p > mx) mx = d.p;
        for (const l of labPoints) if (l.v > mx) mx = l.v;
        for (const m of markers) if (m.axis === 'p' && m.v > mx) mx = m.v;
        // Keep the target band's lower edge on-screen so "below target" reads clearly,
        // without forcing the whole (often much higher) band into view.
        if (primaryTarget) mx = Math.max(mx, primaryTarget.low * 1.05);
        return buildYDomain(0, mx);
    }, [slice, labPoints, markers, primaryTarget]);

    const ySecondary = useMemo(() => {
        if (!hasSecondary) return [0, 1] as [number, number];
        let mx = -Infinity;
        for (const d of slice) if (d.s != null && d.s > mx) mx = d.s;
        for (const m of markers) if (m.axis === 's' && m.v > mx) mx = m.v;
        return buildYDomain(0, mx);
    }, [slice, markers, hasSecondary]);

    // The primary series at an arbitrary hour, calibrated the same way the
    // plotted curve is.
    const primaryAt = (h: number): number | null => {
        const src = simAt(h * HOUR);
        if (!src) return null;
        const v = isTransmasc
            ? interpolateConcentration_T(src, h)
            : primaryIsCPA
                ? interpolateConcentration_CPA(src, h)
                : (() => { const e = interpolateConcentration_E2(src, h); return e == null ? null : e * calibrationFn(h); })();
        return v != null && Number.isFinite(v) ? v : null;
    };

    // How sure the forecast is, read from the person's own blood tests: the
    // typical (root mean square) relative gap between each measurement and the
    // estimate at that moment. Fewer than two tests say nothing about spread,
    // so there is no band until then.
    const spread = useMemo(() => {
        if (!sim || primaryIsCPA) return null;
        const rel: number[] = [];
        for (const l of labResults) {
            if (isTransmasc ? !isT_LabUnit(l.unit) : isT_LabUnit(l.unit)) continue;
            const measured = isTransmasc ? convertToNgDl(l.concValue, l.unit) : convertToPgMl(l.concValue, l.unit);
            const model = primaryAt(l.timeH);
            if (!(model != null && model > 0) || !(measured > 0)) continue;
            rel.push((measured - model) / model);
        }
        if (rel.length < 2) return null;
        const rms = Math.sqrt(rel.reduce((a, r) => a + r * r, 0) / rel.length);
        return Math.min(0.5, Math.max(0.05, rms));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sim, labResults, isTransmasc, primaryIsCPA, calibrationFn]);

    // Layout. The plot is drawn in raw SVG units, so unlike the rest of the UI
    // it does not follow the root font size. Reading that size back keeps the
    // axis type and the gutters it sits in proportional when the desktop scale
    // steps up. Recomputed with the measured size, which is what a breakpoint
    // change triggers.
    const ui = useMemo(() => {
        if (typeof window === 'undefined') return 1;
        const px = parseFloat(getComputedStyle(document.documentElement).fontSize);
        return Number.isFinite(px) && px > 0 ? px / 16 : 1;
    }, [width, height]);
    const axisFont = 13 * ui;

    const mL = 40 * ui;
    const mR = (hasSecondary ? 44 : 8) * ui;
    const mB = 28 * ui;
    const plotW = Math.max(0, width - mL - mR);

    // Unit captions and the "Now" tab share the row above the plot. With two
    // series the captions are long ("Cyproterone (ng/mL)"), so when the tab
    // would land on one, the tab and plot drop a row and the captions keep theirs.
    const nowText = fillIn(t('chart.now_at'), { time: formatTime(new Date(now), timeZone) });
    const leftCaption = hasSecondary ? `${primaryMeta.label} (${unit})` : unit;
    const rightCaption = `${t('chart.cpa')} (ng/mL)`;
    const tabW = textWidth(nowText, axisFont, true) + 16 * ui;
    const tabX = (() => {
        const nx = mL + (vt1 === vt0 ? 0 : ((now - vt0) / (vt1 - vt0)) * plotW);
        return Math.max(0, Math.min(width - tabW, nx - tabW / 2));
    })();
    const tabHitsCaption = tabX < textWidth(leftCaption, axisFont, true) + 6 * ui
        || (hasSecondary && tabX + tabW > width - textWidth(rightCaption, axisFont, true) - 6 * ui);
    const captionRow = tabHitsCaption ? 20 * ui : 0;
    const mT = 34 * ui + captionRow; // room for the "Now" tab above the plot
    const plotH = Math.max(0, height - mT - mB);
    const bottom = mT + plotH;

    // Entrance timing. A marker at x is delayed by however long the sweep takes
    // to reach it, so it lands with the line rather than ahead of it.
    const SWEEP_MS = 900;
    const sweepDelay = (x: number) =>
        plotW > 0 ? `${Math.round(Math.max(0, Math.min(1, (x - mL) / plotW)) * SWEEP_MS)}ms` : '0ms';

    // The vertical axes ease too. Targets stay exact, so hit-testing and the
    // window maths are unaffected; only what is drawn glides.
    const [vy0, vy1] = useEasedPair(yPrimary, false);
    const [vs0, vs1] = useEasedPair(ySecondary, false);

    const X = (time: number) => mL + (vt1 === vt0 ? 0 : ((time - vt0) / (vt1 - vt0)) * plotW);
    const YP = (v: number) => mT + plotH - ((v - vy0) / (vy1 - vy0)) * plotH;
    const YS = (v: number) => mT + plotH - ((v - vs0) / (vs1 - vs0)) * plotH;

    // Monotone cubic Hermite interpolation (Fritsch–Carlson), the same curve
    // family as d3's curveMonotoneX: smoothly connects the sample points
    // without ever overshooting past a local min/max, so a peak never renders
    // higher than the data and a trough never dips below it. Straight `L`
    // segments would always look faceted at the scale a PK curve is viewed at,
    // no matter how dense the underlying simulation grid is.
    const monotonePath = (xs: number[], ys: number[]): string => {
        const n = xs.length;
        if (n === 0) return '';
        if (n === 1) return `M${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;

        const d: number[] = [];
        for (let i = 0; i < n - 1; i++) {
            const h = xs[i + 1] - xs[i];
            d.push(h !== 0 ? (ys[i + 1] - ys[i]) / h : 0);
        }

        const m: number[] = new Array(n);
        m[0] = d[0];
        m[n - 1] = d[n - 2];
        for (let i = 1; i < n - 1; i++) {
            m[i] = (d[i - 1] === 0 || d[i] === 0 || (d[i - 1] < 0) !== (d[i] < 0))
                ? 0
                : (d[i - 1] + d[i]) / 2;
        }
        for (let i = 0; i < n - 1; i++) {
            if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
            const a = m[i] / d[i];
            const b = m[i + 1] / d[i];
            const s = a * a + b * b;
            if (s > 9) {
                const t = 3 / Math.sqrt(s);
                m[i] *= t;
                m[i + 1] *= t;
            }
        }

        let out = `M${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
        for (let i = 0; i < n - 1; i++) {
            const dx = (xs[i + 1] - xs[i]) / 3;
            const c1x = xs[i] + dx;
            const c1y = ys[i] + m[i] * dx;
            const c2x = xs[i + 1] - dx;
            const c2y = ys[i + 1] - m[i + 1] * dx;
            out += `C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${xs[i + 1].toFixed(1)} ${ys[i + 1].toFixed(1)}`;
        }
        return out;
    };

    const linePath = (key: 'p' | 's') => {
        let d = '';
        let xs: number[] = [];
        let ys: number[] = [];
        const flush = () => {
            if (xs.length) d += monotonePath(xs, ys);
            xs = [];
            ys = [];
        };
        for (const pt of slice) {
            const val = key === 'p' ? pt.p : pt.s;
            if (val == null || !Number.isFinite(val)) { flush(); continue; }
            xs.push(X(pt.t));
            ys.push(key === 'p' ? YP(val) : YS(val));
        }
        flush();
        return d;
    };

    // The likely range around the forecast: the curve scaled by ±spread,
    // drawn from the last sample before now onward (the future clip trims it).
    // It follows whatever the dashed line shows, so with a projection it rides
    // the planned doses rather than the wear-off.
    const bandPath = () => {
        if (spread == null) return '';
        let start = 0;
        while (start < slice.length - 1 && slice[start + 1].t < now) start++;
        const xs: number[] = [], up: number[] = [], lo: number[] = [];
        for (let i = start; i < slice.length; i++) {
            const v = slice[i].p;
            if (!Number.isFinite(v)) continue;
            xs.push(X(slice[i].t));
            up.push(YP(v * (1 + spread)));
            lo.push(YP(Math.max(0, v * (1 - spread))));
        }
        if (xs.length < 2) return '';
        const top = monotonePath(xs, up);
        const back = monotonePath([...xs].reverse(), [...lo].reverse());
        return `${top}L${back.slice(1)}Z`;
    };

    const xTicks = useMemo(() => {
        if (plotW <= 0) return [];
        const count = Math.max(2, Math.min(6, Math.floor(plotW / (90 * ui))));
        const seen = new Set<string>();
        const out: { time: number; label: string }[] = [];
        for (let i = 0; i <= count; i++) {
            const time = t0 + ((t1 - t0) * i) / count;
            const label = formatDate(new Date(time), lang, timeZone);
            if (seen.has(label)) continue;
            seen.add(label);
            out.push({ time, label });
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [t0, t1, plotW, lang, timeZone, mL, ui]);

    // Label sets for both axes, each carrying whatever it is replacing.
    const yTickVals = useMemo(() => ticksFor(yPrimary), [yPrimary]);
    const ysTickVals = useMemo(() => ticksFor(ySecondary), [ySecondary]);
    const yFade = useFadingSet(yTickVals, yTickVals.join(','));
    const ysFade = useFadingSet(ysTickVals, ysTickVals.join(','));
    const xFade = useFadingSet(xTicks, xTicks.map(t => t.label).join('|'), dragging);

    // Mid-rescale an incoming set can be crushed together. Its numbers wait
    // until there is room to hold them.
    const roomFor = (vals: number[]) =>
        vals.length < 2 || Math.abs(YP(vals[0]) - YP(vals[1])) >= 26 * ui;

    // The level now, on each curve.
    const nowVal = useMemo(() => primaryAt(now / HOUR),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [sim, now, isTransmasc, primaryIsCPA, calibrationFn]);

    const nowValS = useMemo(() => {
        if (!sim || !hasSecondary) return null;
        const v = interpolateConcentration_CPA(sim, now / HOUR);
        return v != null && Number.isFinite(v) ? v : null;
    }, [sim, now, hasSecondary]);

    // Nearest sample to a moment. `data` is in time order.
    const nearestIndex = (time: number) => {
        let lo = 0, hi = data.length - 1;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (data[mid].t < time) lo = mid; else hi = mid;
        }
        return Math.abs(data[lo].t - time) <= Math.abs(data[hi].t - time) ? lo : hi;
    };

    // Read-off lookup: nearest sample to the pointer.
    const updateHover = (clientX: number) => {
        if (!plotEl || data.length === 0 || plotW <= 0) return;
        const rect = plotEl.getBoundingClientRect();
        const px = clientX - rect.left;
        if (px < mL || px > mL + plotW) { setHover(null); return; }
        setHover(nearestIndex(t0 + ((px - mL) / plotW) * (t1 - t0)));
    };

    const onPointerDown = (e: React.PointerEvent) => {
        if (!canPan) return;
        dragRef.current = { startX: e.clientX, startY: e.clientY, startOffset: panOffset, moved: false, pointerId: e.pointerId };
    };

    const onPointerMove = (e: React.PointerEvent) => {
        const drag = dragRef.current;
        if (drag) {
            const dx = e.clientX - drag.startX;
            const dy = e.clientY - drag.startY;
            if (!drag.moved) {
                // Decide intent from the first decisive movement: horizontal pans
                // the chart, vertical (or a tap) is left to the page scroller.
                if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
                    drag.moved = true;
                    setDragging(true);
                    setHover(null);
                    // Capture so the pan keeps tracking even if the finger leaves the SVG.
                    try { e.currentTarget.setPointerCapture(drag.pointerId); } catch { /* ignore */ }
                } else if (Math.abs(dy) > 6) {
                    dragRef.current = null; // vertical scroll — bail out of the drag
                    return;
                }
            }
            if (drag.moved && plotW > 0) {
                const span = baseWindow[1] - baseWindow[0];
                const next = drag.startOffset - (dx / plotW) * span; // drag right → see earlier time
                setPanOffset(Math.max(minOffset, Math.min(maxOffset, next)));
            }
            return;
        }
        updateHover(e.clientX);
    };

    const endDrag = (e?: React.PointerEvent) => {
        const drag = dragRef.current;
        if (drag && e) { try { e.currentTarget.releasePointerCapture(drag.pointerId); } catch { /* ignore */ } }
        dragRef.current = null;
        if (dragging) setDragging(false);
    };

    // A tap (a press that never became a pan) reads that moment and leaves the
    // reading in the strip, since a finger has no hover to keep it there.
    const onPointerUp = (e: React.PointerEvent) => {
        if (!dragRef.current?.moved) updateHover(e.clientX);
        endDrag(e);
    };

    const onPointerLeave = (e: React.PointerEvent) => {
        endDrag(e);
        if (e.pointerType === 'mouse') setHover(null);
    };

    // With the chart focused, the arrow keys walk the read-off through the
    // window (Shift for bigger steps) and Escape returns it to now.
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (data.length === 0) return;
        if (e.key === 'Escape') { setHover(null); return; }
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        const cur = hover != null ? data[hover] : null;
        const from = cur && cur.t >= t0 && cur.t <= t1 ? cur.t : Math.min(Math.max(now, t0), t1);
        const dir = e.key === 'ArrowLeft' ? -1 : 1;
        const target = Math.min(t1, Math.max(t0, from + dir * (t1 - t0) / (e.shiftKey ? 8 : 48)));
        let idx = nearestIndex(target);
        if (idx === hover) idx = Math.max(0, Math.min(data.length - 1, idx + dir));
        if (data[idx].t < t0 || data[idx].t > t1) return;
        setHover(idx);
    };

    const hoverPt = hover != null ? data[hover] : null;
    const showHover = !dragging && hoverPt != null && hoverPt.t >= t0 && hoverPt.t <= t1 && plotW > 0;
    const calFactor = calibrationFn(now / HOUR);

    const rangeOpts: { value: RangeKey; label: string }[] = [
        { value: '7d', label: t('chart.range_7d') },
        { value: '30d', label: t('chart.range_30d') },
        { value: 'all', label: t('chart.range_all') },
    ];

    if (!sim || sim.timeH.length === 0) {
        return (
            <div className="h-56 md:h-64 flex flex-col items-center justify-center text-[var(--c-muted)]">
                <Activity className="w-10 h-10 mb-3 opacity-40" />
                <p className="m-0 text-sm">{t('timeline.empty')}</p>
            </div>
        );
    }

    // ── Readout strip ──────────────────────────────────────────────────────
    const locale = LOCALE_MAP[lang] || 'en-US';
    const whenText = (ms: number) => {
        const d = new Date(ms);
        if (Number.isNaN(d.getTime())) return '';
        const date = d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric', timeZone });
        return fillIn(t('chart.when'), { date, time: formatTime(d, timeZone) });
    };
    const readT = showHover ? hoverPt!.t : now;
    const readP = showHover ? hoverPt!.p : nowVal;
    const readS = showHover ? hoverPt!.s : nowValS;
    const hoverX = showHover ? X(hoverPt!.t) : null;
    // A blood test under the read-off takes over the strip.
    const readLab = hoverX == null ? null
        : labPoints.reduce<typeof labPoints[number] | null>((best, l) => {
            const dx = Math.abs(X(l.t) - hoverX);
            return dx <= 10 * ui && (!best || dx < Math.abs(X(best.t) - hoverX)) ? l : best;
        }, null);
    let readMain = '';
    if (readLab) {
        const expected = primaryAt(readLab.t / HOUR);
        readMain = expected != null
            ? fillIn(t('chart.readout_lab'), { value: fmtReading(readLab.v, primaryIsCPA), unit, expected: fmtReading(expected, primaryIsCPA) })
            : '';
    }
    if (!readMain && readP != null && Number.isFinite(readP)) {
        const key = readT <= now ? 'chart.readout_est' : proj ? 'chart.readout_forecast' : 'chart.readout_no_more';
        readMain = fillIn(t(key), { value: fmtReading(readP, primaryIsCPA), unit });
    }
    const readSecond = hasSecondary && readS != null && Number.isFinite(readS)
        ? fillIn(t('chart.readout_second'), { series: t('chart.cpa'), value: fmtReading(readS, true), unit: 'ng/mL' })
        : '';

    const calPct = Math.round(Math.abs(calFactor - 1) * 100);
    const calNote = !isTransmasc && !primaryIsCPA && calPct >= 1
        ? fillIn(t(calFactor > 1 ? 'chart.adjusted_up' : 'chart.adjusted_down'), { pct: calPct })
        : '';

    const ariaLabel = joinSentences(lang, [
        fillIn(t('chart.aria_summary'), {
            series: primaryMeta.label,
            from: formatDate(new Date(t0), lang, timeZone),
            to: formatDate(new Date(t1), lang, timeZone),
        }),
        nowVal != null ? fillIn(t('chart.aria_now'), { value: fmtReading(nowVal, primaryIsCPA), unit }) : '',
    ].filter(Boolean) as string[]);

    // ── Geometry shared by several layers ─────────────────────────────────
    const nowIn = now >= vt0 && now <= vt1;
    const nowX = X(now);
    const splitX = Math.max(mL, Math.min(mL + plotW, nowX));
    const tabH = 22 * ui;
    const tabY = 4 * ui + captionRow;

    const pPath = linePath('p');
    const sPath = hasSecondary ? linePath('s') : '';
    const likely = bandPath();

    // Only a projection may promise "if you keep your schedule". Without one the
    // dashed line is the logged doses wearing off, and it says that instead.
    const forecastText = t(proj ? 'chart.if_schedule' : 'chart.if_no_more');
    const forecastX = (now < vt0 ? mL : splitX) + 6 * ui;
    // On a phone the future half of a week is narrow, so the label takes two
    // lines (split at the space nearest the middle) before it gives up.
    const forecastLines = (() => {
        const room = mL + plotW - forecastX - 4 * ui;
        if (now > vt1 || room <= 0) return [] as string[];
        if (textWidth(forecastText, axisFont) <= room) return [forecastText];
        const words = forecastText.split(' ');
        if (words.length < 2) return [] as string[];
        let best: string[] = [];
        let bestW = Infinity;
        for (let i = 1; i < words.length; i++) {
            const a = words.slice(0, i).join(' ');
            const b = words.slice(i).join(' ');
            const w = Math.max(textWidth(a, axisFont), textWidth(b, axisFont));
            if (w <= room && w < bestW) { best = [a, b]; bestW = w; }
        }
        return best;
    })();


    let lastLabelX = -Infinity;

    return (
        <div className="w-full">
            {/* Header: title, then the range as a segmented control */}
            <div className={`mb-3 flex flex-col gap-3 sm:flex-row sm:items-center ${showTitle ? 'sm:justify-between' : 'sm:justify-end'} ${headerClassName}`}>
                {showTitle && (
                    <h2 className="m-0 min-w-0 truncate text-xl font-semibold text-[var(--c-ink)]">
                        {title ?? t('chart.title')}
                    </h2>
                )}
                <SegmentedControl
                    aria-label={t('chart.range_aria')}
                    options={rangeOpts}
                    value={range}
                    onChange={selectRange}
                    className="w-full shrink-0 sm:w-[300px]"
                />
            </div>

            {/* What the marks mean, for screen readers. Sighted readers get direct labels. */}
            <div id={`legend-${clipId}`} className="sr-only">
                <p>{hasSecondary ? joinList(lang, [primaryMeta.label, t('chart.cpa')]) : primaryMeta.label}</p>
                {primaryTarget && <p>{fillIn(t('chart.target_range'), { low: primaryTarget.low, high: primaryTarget.high })}</p>}
                <p>{t(proj ? 'chart.legend_marks' : 'chart.legend_marks_logged')}</p>
                {spread != null && <p>{t('chart.likely_band')}</p>}
                <p>{t('chart.keyboard_hint')}</p>
            </div>

            {/* Plot */}
            <div
                ref={setPlotEl}
                tabIndex={0}
                onKeyDown={onKeyDown}
                aria-describedby={`legend-${clipId}`}
                className="relative h-56 md:h-64 select-none touch-pan-y rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--c-accent)]"
            >
                {width > 0 && (
                    <svg
                        width={width}
                        height={height}
                        role="img"
                        aria-label={ariaLabel}
                        className="block"
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={endDrag}
                        onPointerLeave={onPointerLeave}
                        style={{ touchAction: 'pan-y', cursor: canPan ? (dragging ? 'grabbing' : 'grab') : 'default' }}
                    >
                        <defs>
                            <clipPath id={`sweep-${clipId}`}>
                                <rect className="chart-sweep" x={mL} y={0} width={plotW} height={height} />
                            </clipPath>
                            <clipPath id={`clip-${clipId}`}>
                                <rect x={mL} y={mT - 4} width={plotW} height={plotH + 8} />
                            </clipPath>
                            <clipPath id={`past-${clipId}`}>
                                <rect x={mL - 2} y={0} width={Math.max(0, splitX - mL + 2)} height={height} />
                            </clipPath>
                            <clipPath id={`future-${clipId}`}>
                                <rect x={splitX} y={0} width={Math.max(0, mL + plotW - splitX + 2)} height={height} />
                            </clipPath>
                        </defs>

                        {/* Units, labelled directly. With two series each caption
                            takes its curve's colour and sits over its own axis. */}
                        <text x={0} y={14 * ui} fontSize={axisFont} fontWeight={600} fill={hasSecondary ? c.primary : c.muted}>{leftCaption}</text>
                        {hasSecondary && (
                            <text x={width} y={14 * ui} textAnchor="end" fontSize={axisFont} fontWeight={600} fill={c.second}>
                                {rightCaption}
                            </text>
                        )}

                        {/* Past on a plate tint, future on paper */}
                        {splitX > mL && (
                            <rect x={mL} y={mT} width={splitX - mL} height={plotH} fill={c.plate} />
                        )}

                        {/* Target band */}
                        {primaryTarget && (() => {
                            const yHi = Math.max(mT, Math.min(bottom, YP(primaryTarget.high)));
                            const yLo = Math.max(mT, Math.min(bottom, YP(primaryTarget.low)));
                            if (yLo - yHi < 0.5) return null; // band entirely off-screen
                            const rawLo = YP(primaryTarget.low);
                            const rawHi = YP(primaryTarget.high);
                            const inView = (y: number) => y >= mT - 0.5 && y <= bottom + 0.5;
                            return (
                                <g className="chart-appear" style={{ animationDelay: '120ms' }}>
                                    <rect x={mL} y={yHi} width={plotW} height={yLo - yHi} fill={c.target} fillOpacity={0.12} />
                                    {inView(rawLo) && <line x1={mL} y1={yLo} x2={mL + plotW} y2={yLo} stroke={c.target} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="3 3" />}
                                    {inView(rawHi) && <line x1={mL} y1={yHi} x2={mL + plotW} y2={yHi} stroke={c.target} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="3 3" />}
                                </g>
                            );
                        })()}

                        {/* Top gridline and baseline */}
                        <line x1={mL} y1={mT} x2={mL + plotW} y2={mT} stroke={c.hairline} strokeWidth={1} />
                        <line x1={mL} y1={bottom} x2={mL + plotW} y2={bottom} stroke={c.rule} strokeWidth={1} />

                        {/* Primary axis labels. The outgoing set is kept alongside
                            the incoming one and both are positioned on the eased
                            domain, so a rescale slides and dissolves rather than
                            jumping. */}
                        {([['out', yFade.prev, 1 - yFade.u], ['in', yFade.next, yFade.u]] as const).map(([tag, set, o]) =>
                            o <= 0.002 || !roomFor(set) ? null : (
                                <g key={`yg-${tag}`} opacity={o}>
                                    {set.map((v, i) => {
                                        const y = YP(v);
                                        if (y < mT - 0.5 || y > bottom + 0.5) return null;
                                        return (
                                            <text key={`yp-${i}`}
                                                  className={tag === 'in' ? 'chart-appear' : undefined}
                                                  style={tag === 'in' ? { animationDelay: `${i * 45}ms` } : undefined}
                                                  x={mL - 6 * ui} y={y + 4.5 * ui} textAnchor="end"
                                                  fontSize={axisFont} fontWeight={500} fill={c.muted}>{fmtAxis(v)}</text>
                                        );
                                    })}
                                </g>
                            )
                        )}

                        {/* Secondary (CPA) axis labels */}
                        {hasSecondary && ([['out', ysFade.prev, 1 - ysFade.u], ['in', ysFade.next, ysFade.u]] as const).map(([tag, set, o]) =>
                            o <= 0.002 ? null : (
                                <g key={`ysg-${tag}`} opacity={o}>
                                    {set.map((v, i) => {
                                        const y = YS(v);
                                        if (y < mT - 0.5 || y > bottom + 0.5) return null;
                                        return (
                                            <text key={`ys-${i}`}
                                                  className={tag === 'in' ? 'chart-appear' : undefined}
                                                  style={tag === 'in' ? { animationDelay: `${i * 45}ms` } : undefined}
                                                  x={mL + plotW + 6 * ui} y={y + 4.5 * ui} textAnchor="start"
                                                  fontSize={axisFont} fontWeight={500} fill={c.muted}>{fmtAxis(v)}</text>
                                        );
                                    })}
                                </g>
                            )
                        )}

                        {/* X axis labels, on the same treatment */}
                        {([['out', xFade.prev, 1 - xFade.u], ['in', xFade.next, xFade.u]] as const).map(([tag, set, o]) =>
                            o <= 0.002 ? null : (
                                <g key={`xg-${tag}`} opacity={o}>
                                    {set.map((tk, i) => {
                                        const x = X(tk.time);
                                        if (x < mL - 40 || x > mL + plotW + 40) return null;
                                        return (
                                            <text key={`x-${i}`}
                                                  className={tag === 'in' ? 'chart-appear' : undefined}
                                                  style={tag === 'in' ? { animationDelay: sweepDelay(x) } : undefined}
                                                  x={x} y={bottom + 19 * ui} textAnchor="middle"
                                                  fontSize={axisFont} fontWeight={500} fill={c.muted}>{tk.label}</text>
                                        );
                                    })}
                                </g>
                            )
                        )}

                        <g clipPath={`url(#clip-${clipId})`}>
                            <g clipPath={`url(#sweep-${clipId})`}>
                                {/* What has happened: solid */}
                                <g clipPath={`url(#past-${clipId})`}>
                                    <path d={pPath} fill="none" stroke={c.primary} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
                                          strokeDasharray={isMono && primaryIsCPA ? '2 3' : undefined} />
                                    {hasSecondary && (
                                        <path d={sPath} fill="none" stroke={c.second} strokeWidth={isMono ? 1.5 : 2} strokeLinejoin="round" strokeLinecap="round"
                                              strokeDasharray={isMono ? '2 3' : undefined} />
                                    )}
                                </g>
                                {/* Where it is heading: dashed, over the likely range. From the
                                    projection when there is one (the schedule holds), else the
                                    logged doses wearing off. */}
                                <g clipPath={`url(#future-${clipId})`}>
                                    {likely && <path d={likely} fill={c.ink} fillOpacity={0.07} stroke="none" />}
                                    <path d={pPath} fill="none" stroke={c.primary} strokeWidth={2} strokeLinejoin="round"
                                          strokeDasharray={isMono && primaryIsCPA ? '2 3' : '6 4'} />
                                    {hasSecondary && (
                                        <path d={sPath} fill="none" stroke={c.second} strokeWidth={isMono ? 1.5 : 2} strokeLinejoin="round"
                                              strokeDasharray={isMono ? '2 3' : '6 4'} />
                                    )}
                                </g>
                            </g>

                            {/* Dose markers on the baseline: taken filled, planned outlined.
                                Logged doses open for editing; projected ones have nothing to edit. */}
                            {markers.map((m, i) => {
                                const cx = X(m.t);
                                const col = m.axis === 's' ? c.second : c.primary;
                                const { planned } = m;
                                const h = 7 * ui, w = 4.5 * ui;
                                const projected = m.event.id.startsWith('planned-');
                                const clickable = !!onPointClick && !projected;
                                return (
                                    <g
                                        key={`m-${m.event.id}-${i}`}
                                        className={`chart-mark${clickable ? ' cursor-pointer' : ''}`}
                                        style={{ animationDelay: sweepDelay(cx) }}
                                        onClick={clickable ? () => onPointClick?.(m.event) : undefined}
                                    >
                                        <rect x={cx - 9 * ui} y={bottom - 20 * ui} width={18 * ui} height={22 * ui} fill="transparent" />
                                        <path
                                            d={`M${cx.toFixed(1)} ${(bottom - h).toFixed(1)}L${(cx + w).toFixed(1)} ${bottom.toFixed(1)}L${(cx - w).toFixed(1)} ${bottom.toFixed(1)}Z`}
                                            fill={planned ? c.paper : col}
                                            stroke={planned ? col : 'none'}
                                            strokeWidth={1.5}
                                            strokeLinejoin="round"
                                        />
                                    </g>
                                );
                            })}

                            {/* Blood tests: ink diamonds with the measured value */}
                            {labPoints.map((l, i) => {
                                const cx = X(l.t);
                                const cy = YP(l.v);
                                const d = 4.5 * ui;
                                const labelY = cy - 10 * ui;
                                const showLabel = cx - lastLabelX >= 36 * ui && labelY - axisFont >= mT - 4;
                                if (showLabel) lastLabelX = cx;
                                const selected = readLab?.id === l.id;
                                return (
                                    <g key={`l-${i}`} className="chart-mark" style={{ animationDelay: sweepDelay(cx) }}>
                                        {selected && (
                                            <rect x={cx - 8 * ui} y={cy - 8 * ui} width={16 * ui} height={16 * ui}
                                                  transform={`rotate(45 ${cx} ${cy})`} fill="none" stroke={c.primary} strokeWidth={2} />
                                        )}
                                        <rect x={cx - d} y={cy - d} width={2 * d} height={2 * d}
                                              transform={`rotate(45 ${cx} ${cy})`} fill={c.ink} />
                                        {showLabel && (
                                            <text x={cx} y={labelY} textAnchor="middle" fontSize={axisFont} fontWeight={600} fill={c.ink}>
                                                {fmtReading(l.v, primaryIsCPA)}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}

                            {/* Read-off cursor */}
                            {showHover && hoverX != null && (
                                <g pointerEvents="none">
                                    <line x1={hoverX} y1={mT} x2={hoverX} y2={bottom} stroke={c.ink} strokeWidth={1} />
                                    {hasSecondary && hoverPt!.s != null && (
                                        <circle cx={hoverX} cy={YS(hoverPt!.s)} r={4} fill={c.surface} stroke={c.second} strokeWidth={2} />
                                    )}
                                    {!readLab && (
                                        <circle cx={hoverX} cy={YP(hoverPt!.p)} r={5} fill={c.surface} stroke={c.ink} strokeWidth={2} />
                                    )}
                                </g>
                            )}
                        </g>

                        {/* Direct labels */}
                        {primaryTarget && (() => {
                            const yHi = Math.max(mT, Math.min(bottom, YP(primaryTarget.high)));
                            const yLo = Math.max(mT, Math.min(bottom, YP(primaryTarget.low)));
                            if (yLo - yHi < 0.5) return null;
                            const y = yLo - yHi >= axisFont + 8 * ui ? yLo - 6 * ui : yHi - 6 * ui;
                            return (
                                <text className="chart-appear" style={{ animationDelay: '120ms' }} pointerEvents="none"
                                      x={mL + 4 * ui} y={y} fontSize={axisFont} fontWeight={600} fill={c.target}>
                                    {fillIn(t('chart.target_range'), { low: primaryTarget.low, high: primaryTarget.high })}
                                </text>
                            );
                        })()}
                        {forecastLines.length > 0 && (
                            <text className="chart-appear" style={{ animationDelay: sweepDelay(forecastX) }} pointerEvents="none"
                                  x={forecastX} y={bottom - 12 * ui - (forecastLines.length - 1) * 16 * ui}
                                  fontSize={axisFont} fontWeight={500} fill={c.muted}
                                  stroke={c.paper} strokeWidth={4} strokeLinejoin="round" paintOrder="stroke">
                                {forecastLines.map((line, i) => (
                                    <tspan key={i} x={forecastX} dy={i === 0 ? 0 : 16 * ui}>{line}</tspan>
                                ))}
                            </text>
                        )}

                        {/* Now: a 2px ink rule with its tab above the plot */}
                        {nowIn && (
                            <g className="chart-appear" style={{ animationDelay: sweepDelay(nowX) }} pointerEvents="none">
                                <line x1={nowX} y1={tabY + tabH} x2={nowX} y2={bottom} stroke={c.ink} strokeWidth={2} />
                                <rect x={tabX} y={tabY} width={tabW} height={tabH} rx={6 * ui} fill={c.ink} />
                                <text x={tabX + tabW / 2} y={tabY + 15.5 * ui} textAnchor="middle" fontSize={axisFont} fontWeight={600} fill={c.paper}>
                                    {nowText}
                                </text>
                            </g>
                        )}
                    </svg>
                )}
            </div>

            {/* Readout: what the chart says at the read-off, or now */}
            <div className="mt-2 rounded-xl bg-[var(--c-plate)] px-4 py-3" aria-live="polite">
                <p className="m-0 text-sm font-semibold text-[var(--c-ink)] tabular-nums">{whenText(readT)}</p>
                {(readMain || readSecond) && (
                    <p className="m-0 text-sm text-[var(--c-ink)] tabular-nums">
                        {joinSentences(lang, [readMain, readSecond].filter(Boolean) as string[])}
                    </p>
                )}
            </div>
            {showCalibrationNote && calNote && <p className="m-0 mt-2 text-sm text-[var(--c-muted)]">{calNote}</p>}
        </div>
    );
};

export default ResultChart;
