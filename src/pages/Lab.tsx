import React, { useEffect, useMemo, useState } from 'react';
import { BloodDrop, ChevronRight, Plus, Delete, Sliders } from '../components/icons';
import { LabelIcon } from '../components/ui/LabelIcon';
import {
    CalibrationHistoryMode, CalibrationMethod, CalibrationPoint, CalibrationResult, DoseEvent, LabResult, Route,
    convertToNgDl, convertToPgMl, getHormoneLevelAdvisory, isTestosteroneEster, isT_LabUnit,
} from '../../logic';
import { Lang } from '../i18n/translations';
import { LOCALE_MAP } from '../utils/helpers';
import { useHRTMode } from '../contexts/HRTModeContext';
import { useElementSize } from '../hooks/useElementSize';
import LabResultForm from '../components/LabResultForm';
import { makeDayFormatter } from '../components/DoseHeatmap';
import PixelCat from '../components/PixelCat';
import { HormoneLevelAdvisoryLine } from '../components/DoseAdvisory';
import { Button, Lead, ListGroup, ListRow, PageHeader, Section } from '../components/ui';
import { SecondaryPage } from '../components/ui/SecondaryPage';
import { CalibrationChoices, CalibrationSummary, methodName } from './CalibrationSettings';

const NBSP = '\u00a0';

/** Keeps short phrases ("Sep 15", "212 pg/mL") on one line. */
const nb = (s: string) => s.replace(/ /g, NBSP);

const UNIT_LABEL: Record<LabResult['unit'], string> = {
    'pg/ml': 'pg/mL',
    'pmol/l': 'pmol/L',
    'ng/dl': 'ng/dL',
    'nmol/l': 'nmol/L',
};

const E2_PMOL_PER_PG = 3.671;   // 1 pg/mL estradiol = 3.671 pmol/L
const T_NGDL_PER_NMOL = 28.842; // 1 nmol/L testosterone = 28.842 ng/dL

/** Rounds for reading: whole numbers from 10 up, two significant places below. */
const fmtVal = (v: number) => (Math.abs(v) >= 10 ? String(Math.round(v)) : String(Math.round(v * 100) / 100));

/** From a native value (pg/mL for estradiol, ng/dL for testosterone) back to
 *  the unit the result was entered in, so ranges read in that unit. */
const fromNative = (v: number, unit: LabResult['unit']) =>
    unit === 'pmol/l' ? v * E2_PMOL_PER_PG : unit === 'nmol/l' ? v / T_NGDL_PER_NMOL : v;

type Standing = 'above' | 'little_above' | 'in' | 'little_below' | 'below';
type Target = { low: number | null; high: number };

/** The target the app already uses for its status labels and the chart band:
 *  estradiol 100–200 pg/mL; testosterone 300–1000 ng/dL when it is the
 *  treatment, under 50 ng/dL when it is being suppressed. */
const targetFor = (isT: boolean, isTransmasc: boolean): Target =>
    !isT ? { low: 100, high: 200 } : isTransmasc ? { low: 300, high: 1000 } : { low: null, high: 50 };

const standingOf = (r: LabResult, target: Target): Standing => {
    const native = isT_LabUnit(r.unit) ? convertToNgDl(r.concValue, r.unit) : convertToPgMl(r.concValue, r.unit);
    // Within a fifth of the edge reads "a little", as on Today.
    if (native > target.high) return native <= target.high * 1.2 ? 'little_above' : 'above';
    if (target.low !== null && native < target.low) return native >= target.low * 0.8 ? 'little_below' : 'below';
    return 'in';
};

const rangeText = (target: Target, unit: LabResult['unit'], t: (k: string) => string) => {
    const hi = fmtVal(fromNative(target.high, unit));
    if (target.low === null) return t('tests.range_under').replace('{v}', hi);
    return `${fmtVal(fromNative(target.low, unit))}–${hi}`;
};

type Timing = { kind: 'before' } | { kind: 'hours' | 'days'; n: number };

/** When the blood was drawn relative to the shots of the same hormone. */
const timingOf = (r: LabResult, injections: DoseEvent[]): Timing | null => {
    const isT = isT_LabUnit(r.unit);
    const shots = injections.filter(e => isTestosteroneEster(e.ester) === isT);
    if (!shots.length) return null;
    let last: DoseEvent | null = null;
    let next: DoseEvent | null = null;
    for (const s of shots) {
        if (s.timeH <= r.timeH) { if (!last || s.timeH > last.timeH) last = s; }
        else if (!next || s.timeH < next.timeH) next = s;
    }
    if (next && next.timeH - r.timeH <= 12 && (!last || r.timeH - last.timeH >= 24)) return { kind: 'before' };
    if (!last) return null;
    const dh = r.timeH - last.timeH;
    if (dh > 60 * 24) return null;   // too long ago to say anything useful
    if (dh < 24) return { kind: 'hours', n: Math.max(1, Math.round(dh)) };
    return { kind: 'days', n: Math.round(dh / 24) };
};

/** "3 days after your shot", as a phrase to go after a date. */
const timingPhrase = (tm: Timing, t: (k: string) => string) => {
    if (tm.kind === 'before') return t('tests.when.before');
    if (tm.kind === 'hours') return tm.n === 1 ? t('tests.when.hour') : t('tests.when.hours').replace('{n}', String(tm.n));
    return tm.n === 1 ? t('tests.when.day') : t('tests.when.days').replace('{n}', String(tm.n));
};

/** A niceish tick step for the comparison chart's value axis. */
const tickStep = (hi: number) => (hi <= 250 ? 50 : hi <= 500 ? 100 : hi <= 1000 ? 200 : 500);

const diamond = (cx: number, cy: number, r = 6) => `M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z`;

/** "Measured against the model": each estradiol test as a hollow diamond (what
 *  the standard model expected) joined to a filled one (what the lab measured),
 *  over the target band. Drawn at its real pixel width so the 13px labels stay
 *  13px. Every measured value sits right of its filled diamond and every
 *  expected value right of its hollow one; when the two are close they are
 *  nudged apart vertically, never swapped. */
const MeasuredChart: React.FC<{
    points: CalibrationPoint[];
    locale: string;
    t: (k: string) => string;
}> = ({ points, locale, t }) => {
    const [el, setEl] = useState<HTMLDivElement | null>(null);
    const { width } = useElementSize(el);
    const W = Math.max(280, Math.round(width || 343));
    const L = 44;              // room for the value axis labels
    const R = W - 36;          // room for the value labels right of the last test
    const TOP = 28;            // room for the unit label
    const PLOT_H = 180;
    const BOT = TOP + PLOT_H;
    const H = BOT + 30;        // date row

    // As many of the latest tests as fit at about 56px each.
    const maxPts = Math.max(3, Math.floor((R - L) / 56));
    const pts = points.slice(-maxPts);

    const vals = pts.flatMap(p => [p.obs, p.pred]);
    const rawHi = Math.max(220, ...vals) * 1.08;
    const step = tickStep(rawHi);
    const hi = Math.ceil(rawHi / step) * step;
    const ticks: number[] = [];
    for (let v = 0; v <= hi + 1e-6; v += step) ticks.push(v);

    const y = (v: number) => BOT - (v / hi) * PLOT_H;
    const x = (i: number) => L + ((R - L) * (i + 0.5)) / pts.length;
    const fmtDate = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
    const bandTop = y(200), bandBot = y(100);

    return (
        <div ref={setEl} className="w-full">
            <svg
                width={W}
                height={H}
                viewBox={`0 0 ${W} ${H}`}
                className="block"
                role="img"
                aria-label={t('tests.chart_aria').replace('{n}', String(pts.length))}
            >
                <text x={0} y={13} fontSize={13} fontWeight={600} fill="var(--c-muted)">pg/mL</text>

                {/* Value axis: hairline grid, a rule for the baseline. */}
                {ticks.map(v => (
                    <g key={v}>
                        <path
                            d={`M${L} ${y(v)}H${W}`}
                            stroke={v === 0 ? 'var(--c-rule)' : 'var(--c-hairline)'}
                            strokeWidth={1}
                            fill="none"
                        />
                        <text x={L - 8} y={y(v) + 4.5} fontSize={13} fontWeight={500} fill="var(--c-muted)" textAnchor="end">
                            {v}
                        </text>
                    </g>
                ))}

                {/* Target band. */}
                <rect x={L} y={bandTop} width={W - L} height={bandBot - bandTop} fill="var(--c-target)" fillOpacity={0.12} />
                <path
                    d={`M${L} ${bandTop}H${W}M${L} ${bandBot}H${W}`}
                    stroke="var(--c-target)"
                    strokeOpacity={0.6}
                    strokeDasharray="3 3"
                    fill="none"
                />

                {pts.map((p, i) => {
                    const cx = x(i);
                    const yo = y(p.obs), yp = y(p.pred);
                    // Labels right of their own diamond; pulled 16px apart when close.
                    let ly = yo, ey = yp;
                    if (Math.abs(yo - yp) < 16) {
                        const mid = (yo + yp) / 2;
                        const measuredOnTop = yo <= yp;
                        ly = measuredOnTop ? mid - 8 : mid + 8;
                        ey = measuredOnTop ? mid + 8 : mid - 8;
                    }
                    const clamp = (v: number) => Math.max(TOP - 6, Math.min(BOT - 2, v));
                    return (
                        <g key={p.id}>
                            <path d={`M${cx} ${yp}V${yo}`} stroke="var(--c-accent)" strokeWidth={2} />
                            <path d={diamond(cx, yp)} fill="var(--c-paper)" stroke="var(--c-ink)" strokeWidth={2} />
                            <path d={diamond(cx, yo)} fill="var(--c-ink)" />
                            <text x={cx + 11} y={clamp(ly) + 4.5} fontSize={13} fontWeight={600} fill="var(--c-ink)">
                                {Math.round(p.obs)}
                            </text>
                            <text x={cx + 11} y={clamp(ey) + 4.5} fontSize={13} fontWeight={500} fill="var(--c-muted)">
                                {Math.round(p.pred)}
                            </text>
                            <text x={cx} y={BOT + 22} textAnchor="middle" fontSize={13} fontWeight={500} fill="var(--c-muted)">
                                {fmtDate.format(new Date(p.timeH * 3600000))}
                            </text>
                        </g>
                    );
                })}
            </svg>

            {/* Legend: the shapes themselves, then their words. */}
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[var(--c-muted)]">
                <span className="inline-flex items-center gap-2">
                    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
                        <path d={diamond(7, 7, 6)} fill="var(--c-ink)" />
                    </svg>
                    {t('tests.legend.measured')}
                </span>
                <span className="inline-flex items-center gap-2">
                    <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true">
                        <path d={diamond(7, 7, 5)} fill="var(--c-paper)" stroke="var(--c-ink)" strokeWidth={2} />
                    </svg>
                    {t('tests.legend.expected')}
                </span>
                <span className="inline-flex items-center gap-2">
                    <svg width={18} height={12} viewBox="0 0 18 12" aria-hidden="true">
                        <rect x={0} y={1} width={18} height={10} fill="var(--c-target)" fillOpacity={0.12} />
                        <path d="M0 1H18M0 11H18" stroke="var(--c-target)" strokeOpacity={0.6} strokeDasharray="3 3" fill="none" />
                    </svg>
                    {nb(t('tests.legend.target').replace('{range}', '100–200'))}
                </span>
            </div>
        </div>
    );
};

/** The 40px blood-drop tile at the start of a result row: the hormone this
 *  treatment tracks in the accent, the other one in the second hue. */
const BloodTile: React.FC<{ primary: boolean }> = ({ primary }) => (
    <span
        aria-hidden="true"
        className="grid h-10 w-10 place-items-center rounded-xl"
        style={{
            background: primary ? 'var(--c-accent-container)' : 'var(--c-second-tint)',
            color: primary ? 'var(--c-accent)' : 'var(--c-second)',
        }}
    >
        <BloodDrop size={20} />
    </span>
);

interface LabProps {
    t: (key: string) => string;
    isQuickAddLabOpen: boolean;
    setIsQuickAddLabOpen: (isOpen: boolean) => void;
    labResults: LabResult[];
    onSaveLabResult: (res: LabResult) => void;
    onDeleteLabResult: (id: string) => void;
    onClearLabResults: () => void;
    calibrationMethod: CalibrationMethod;
    calibration: CalibrationResult;
    onOpenCalibrationSettings: () => void;
    lang: Lang;
    /* Optional extras. With `events`, each result says when it was taken
       relative to your shot. With the two setters (and the history mode), the
       method list and switch show inline instead of behind a drill-in row.
       With `onOpenPKParams`, the "Advanced model settings" row shows. */
    events?: DoseEvent[];
    calibrationHistoryMode?: CalibrationHistoryMode;
    onSetCalibrationMethod?: (m: CalibrationMethod) => void;
    onSetCalibrationHistoryMode?: (m: CalibrationHistoryMode) => void;
    onOpenPKParams?: () => void;
    /** True when the model parameters differ from the standard ones. */
    pkCustomized?: boolean;
}

const Lab: React.FC<LabProps> = ({
    t,
    isQuickAddLabOpen,
    setIsQuickAddLabOpen,
    labResults,
    onSaveLabResult,
    onDeleteLabResult,
    onClearLabResults,
    calibrationMethod,
    calibration,
    onOpenCalibrationSettings,
    lang,
    events,
    calibrationHistoryMode,
    onSetCalibrationMethod,
    onSetCalibrationHistoryMode,
    onOpenPKParams,
    pkCustomized,
}) => {
    const { isTransmasc } = useHRTMode();
    const locale = LOCALE_MAP[lang] || 'en-US';
    const [editing, setEditing] = useState<LabResult | null>(null);

    const sheetOpen = isQuickAddLabOpen || editing !== null;
    const closeSheet = () => {
        setEditing(null);
        if (isQuickAddLabOpen) setIsQuickAddLabOpen(false);
    };
    // Opening a new result closes the edit page.
    useEffect(() => { if (isQuickAddLabOpen) setEditing(null); }, [isQuickAddLabOpen]);

    const injections = useMemo(() => (events ?? []).filter(e => e.route === Route.injection), [events]);
    const hormoneAdvisory = useMemo(() => getHormoneLevelAdvisory(labResults), [labResults]);
    const sorted = useMemo(() => labResults.slice().sort((a, b) => b.timeH - a.timeH), [labResults]);

    const dayText = useMemo(() => makeDayFormatter(lang), [lang]);
    const dateOf = (r: LabResult) => nb(dayText(new Date(r.timeH * 3600000)));
    const valueText = (r: LabResult) => `${fmtVal(r.concValue)}${NBSP}${UNIT_LABEL[r.unit]}`;

    // --- Lead: one sentence about the latest test of the hormone this
    // treatment tracks, then one muted line with its date and timing.
    const lead = (() => {
        const mainIsT = isTransmasc;
        const latest = sorted.find(r => isT_LabUnit(r.unit) === mainIsT);
        if (!latest) return null;
        const target = targetFor(mainIsT, isTransmasc);
        const standing = standingOf(latest, target);
        // A ceiling ("under 50 ng/dL") reads after the word "target".
        const tpl = target.low === null ? `tests.lead_under.${standing}` : `tests.lead.${standing}`;
        const first = t(tpl)
            .replace('{value}', valueText(latest))
            .replace('{range}', nb(rangeText(target, latest.unit, t)));
        const tm = timingOf(latest, injections);
        const second = tm
            ? t('tests.lead.taken_timing').replace('{date}', dateOf(latest)).replace('{timing}', timingPhrase(tm, t))
            : t('tests.lead.taken').replace('{date}', dateOf(latest));
        return { first, second };
    })();

    // Latest estradiol tests, oldest first, for the comparison chart (it keeps
    // as many as fit its width).
    const chartPoints = calibration.points.slice(-8);

    const inlineChoices = onSetCalibrationMethod && onSetCalibrationHistoryMode && calibrationHistoryMode;

    const hasResults = labResults.length > 0;

    /* Mobile reads top to bottom in `order`. From xl the page splits into two
       columns (chart and summary left, lists right); the column wrappers are
       `display: contents` below xl so their children join one flex column. */
    return (
        <div className="relative pb-32">
            <div className="w-full max-w-2xl px-4 md:px-8 xl:max-w-none">
                <PageHeader
                    title={t('tests.page_title')}
                    trailing={
                        <Button variant="secondary" compact onClick={() => setIsQuickAddLabOpen(true)}>
                            <Plus size={18} />
                            {t('tests.add')}
                        </Button>
                    }
                />

                <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[520px_minmax(0,1fr)] xl:items-start xl:gap-x-6">
                    {/* Left column: lead, chart, how the curve is adjusted. */}
                    <div className="contents xl:flex xl:flex-col xl:gap-6">
                        {(lead || hormoneAdvisory) && (
                            <div className="order-1 flex flex-col gap-3">
                                {lead && <Lead detail={lead.second}>{lead.first}</Lead>}
                                {hormoneAdvisory && <HormoneLevelAdvisoryLine advisory={hormoneAdvisory} t={t} />}
                            </div>
                        )}

                        {!hasResults && (
                            <div className="order-1 flex flex-col items-center py-12 text-center text-[var(--c-muted)]">
                                <PixelCat pose="loaf" size={130} className="mb-4" />
                                <p className="m-0 max-w-xs text-base">{t('tests.empty')}</p>
                            </div>
                        )}

                        {chartPoints.length > 0 && (
                            <Section title={t('tests.measured')} className="order-2">
                                <MeasuredChart points={chartPoints} locale={locale} t={t} />
                            </Section>
                        )}

                        <Section title={t('tests.adjust_heading')} className="order-4">
                            <div className="flex flex-col gap-6">
                                <CalibrationSummary method={calibrationMethod} calibration={calibration} />
                                {inlineChoices ? (
                                    <CalibrationChoices
                                        method={calibrationMethod}
                                        setMethod={onSetCalibrationMethod}
                                        historyMode={calibrationHistoryMode}
                                        setHistoryMode={onSetCalibrationHistoryMode}
                                    />
                                ) : (
                                    <ListGroup chevronIcon={<ChevronRight size={16} />}>
                                        <ListRow
                                            title={t('tests.cal_title')}
                                            leading={<LabelIcon icon={Sliders} tone="teal" />}
                                            value={methodName(calibrationMethod, t)}
                                            drillIn
                                            onClick={onOpenCalibrationSettings}
                                        />
                                    </ListGroup>
                                )}
                            </div>
                        </Section>
                    </div>

                    {/* Right column: results, then the settings rows and the
                        destructive group at the very bottom. */}
                    <div className="contents xl:flex xl:flex-col xl:gap-6">
                        {sorted.length > 0 && (
                            <Section title={t('tests.results')} className="order-3">
                                <ListGroup>
                                    {sorted.map(res => {
                                        const isT = isT_LabUnit(res.unit);
                                        const primary = isT === isTransmasc;
                                        const standing = standingOf(res, targetFor(isT, isTransmasc));
                                        const tm = timingOf(res, injections);
                                        const sub = tm
                                            ? t('tests.row_sub').replace('{date}', dateOf(res)).replace('{timing}', timingPhrase(tm, t))
                                            : dateOf(res);
                                        // "Estradiol {v}": the name may truncate, the value never does.
                                        const tpl = t(isT ? 'tests.t_value' : 'tests.e2_value');
                                        const at = tpl.indexOf('{v}');
                                        const before = at >= 0 ? tpl.slice(0, at) : `${tpl} `;
                                        const after = at >= 0 ? tpl.slice(at + 3) : '';
                                        const name = before.trimEnd();
                                        const value = `${before !== name ? NBSP : ''}${valueText(res)}${after}`;
                                        return (
                                            <ListRow
                                                key={res.id}
                                                leading={<BloodTile primary={primary} />}
                                                title={
                                                    // Status words sit at the end of the title line, so the
                                                    // date and timing below get the full width. The name gives
                                                    // way before the number does.
                                                    <span className="flex min-w-0 items-baseline gap-3">
                                                        <span className="flex min-w-0 flex-1 font-semibold">
                                                            <span className="truncate">{name}</span>
                                                            <span className="shrink-0 whitespace-nowrap tabular-nums">{value}</span>
                                                        </span>
                                                        <span
                                                            className="shrink-0 whitespace-nowrap text-sm font-semibold"
                                                            style={{ color: standing === 'in' ? 'var(--c-target)' : 'var(--c-attention)' }}
                                                        >
                                                            {t(`tests.status.${standing}`)}
                                                        </span>
                                                    </span>
                                                }
                                                sub={sub}
                                                onClick={() => { setIsQuickAddLabOpen(false); setEditing(res); }}
                                            />
                                        );
                                    })}
                                </ListGroup>
                            </Section>
                        )}

                        {onOpenPKParams && (
                            <ListGroup
                                className="order-5"
                                chevronIcon={<ChevronRight size={16} />}
                                footer={t('tests.advanced_footer')}
                            >
                                <ListRow
                                    title={t('tests.advanced')}
                                    leading={<LabelIcon icon={Sliders} tone="teal" />}
                                    sub={t(pkCustomized ? 'tests.advanced_sub_custom' : 'tests.advanced_sub')}
                                    drillIn
                                    onClick={onOpenPKParams}
                                />
                            </ListGroup>
                        )}

                        {hasResults && (
                            <ListGroup
                                className="order-6"
                                footer={labResults.length === 1
                                    ? t('tests.delete_all_note_one')
                                    : t('tests.delete_all_note').replace('{n}', String(labResults.length))}
                            >
                                <ListRow tone="destructive" title={<span className="field-label"><Delete size={20} />{t('tests.delete_all')}</span>} onClick={onClearLabResults} />
                            </ListGroup>
                        )}
                    </div>
                </div>
            </div>

            {/* Add or edit in the current window. */}
            {sheetOpen && (
                <SecondaryPage
                    title={editing ? t('tests.edit') : t('tests.add')}
                    onBack={closeSheet}
                    backLabel={t('tests.page_title')}
                >
                                <LabResultForm
                                    key={editing?.id ?? 'new'}
                                    resultToEdit={editing}
                                    onSave={(res) => {
                                        onSaveLabResult(res);
                                        closeSheet();
                                    }}
                                    onCancel={closeSheet}
                                    onDelete={onDeleteLabResult}
                                />
                </SecondaryPage>
            )}
        </div>
    );
};

export default Lab;
