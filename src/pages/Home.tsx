import React from 'react';
import { joinSentences } from '../i18n/listSeparator';
import {
    DoseEvent,
    SimulationResult,
    LabResult,
    getDoseAdvisory,
    getHormoneLevelAdvisory,
    interpolateConcentration_E2,
    interpolateConcentration_T,
    isT_LabUnit,
} from '../../logic';
import ResultChart from '../components/ResultChart';
import EstimateInfoModal from '../components/EstimateInfoModal';
import DoseAdvisoryNotice from '../components/DoseAdvisory';
import PixelCat from '../components/PixelCat';
import { Button, PageHeader, Section } from '../components/ui';
import { BackedUp, CloudOff, Down, InTarget, Plus, Share, Sync, Up } from '../components/icons';
import RhythmDial from '../components/today/RhythmDial';
import RangeRuler, { TargetRange, rulerScale } from '../components/today/RangeRuler';
import ComingUp, { LogDosePrefill, ROUTE_ICON, prefillFor } from '../components/today/ComingUp';
import {
    dayAndTime,
    doseText,
    fmt,
    formatTime,
    inline,
    longDateTitle,
    medInline,
    relativeTime,
    shortDateTitle,
    weekdayLong,
    whenInline,
} from '../components/today/format';
import {
    UpcomingDose,
    addLocalDays,
    cycleState,
    dailySlots,
    inferRegimens,
    isPrimaryHormone,
    pickDialRegimens,
    startOfLocalDay,
    toMs,
    upcomingDoses,
} from '../utils/schedule';
import { useHRTMode } from '../contexts/HRTModeContext';
import { AppTheme } from '../constants';
import { useTranslation } from '../contexts/LanguageContext';
import { getShareCopy } from '../i18n/share';
import type { SyncStatus } from '../hooks/useCloudSync';

export type { LogDosePrefill } from '../components/today/ComingUp';

interface HomeProps {
    t: (key: string) => string;
    currentLevel: number;
    currentCPA: number;
    currentT: number;
    currentStatus: { label: string, color: string, bg: string, border: string } | null;
    events: DoseEvent[];
    simulation: SimulationResult | null;
    /** The estimate if the routine carries on (useProjection). Draws the
     *  chart's dashed line and the look-ahead in the trend sentence. */
    projection?: SimulationResult | null;
    labResults: LabResult[];
    onEditEvent: (e: DoseEvent) => void;
    calibrationFn: (timeH: number) => number;
    theme: AppTheme;
    onNavigateToHistory: () => void;
    onNavigateToLab: () => void;
    onNavigateToShare: () => void;
    authToken: string | null;
    onAuthRequired: () => void;
    /**
     * Opens the new-dose form. Called with no argument from "Log a dose", and
     * with a prefill (medicine, route, amount, due time) from a "Coming up" row;
     * ignoring the prefill is fine. When absent, the button is hidden.
     */
    onLogDose?: (prefill?: LogDosePrefill) => void;
    /** Cloud backup state for the header icon. Hidden when absent or 'off'. */
    syncStatus?: SyncStatus;
    lastSyncedAt?: number | null;
    /** Where the backup icon goes (e.g. Account). Without it the icon is a plain status. */
    onOpenBackup?: () => void;
}

const MS_H = 3_600_000;

/** Target bands the app already uses (useAppData currentStatus, ResultChart's band). */
const TARGET_E2: TargetRange = { low: 100, high: 200 };
const TARGET_T: TargetRange = { low: 300, high: 1000 };

type LevelWords = 'in' | 'little_above' | 'above' | 'little_below' | 'below';

function levelWords(v: number, { low, high }: TargetRange): LevelWords {
    if (v > high) return v <= high * 1.2 ? 'little_above' : 'above';
    if (v < low) return v >= low * 0.8 ? 'little_below' : 'below';
    return 'in';
}

/** Re-renders once a minute so "now", the hand and "in 7 hours" stay current. */
function useNow(): number {
    const [now, setNow] = React.useState(() => Date.now());
    React.useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(id);
    }, []);
    return now;
}

const Home: React.FC<HomeProps> = ({
    t,
    currentLevel,
    currentCPA,
    currentT,
    events,
    simulation,
    projection = null,
    labResults,
    onEditEvent,
    calibrationFn,
    theme,
    onNavigateToHistory,
    onNavigateToLab,
    onNavigateToShare,
    authToken,
    onAuthRequired,
    onLogDose,
    syncStatus,
    lastSyncedAt,
    onOpenBackup,
}) => {
    const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const isMono = theme === 'mono';
    const [isEstimateInfoOpen, setIsEstimateInfoOpen] = React.useState(false);
    const { isTransmasc } = useHRTMode();
    const { lang } = useTranslation();
    const shareCopy = getShareCopy(lang);
    const nowMs = useNow();
    const nowH = nowMs / MS_H;

    // ── Notices ───────────────────────────────────────────────────────────
    const doseAdvisory = React.useMemo(() => getDoseAdvisory(events), [events]);
    const hormoneAdvisory = React.useMemo(() => getHormoneLevelAdvisory(labResults), [labResults]);
    const modeLabs = labResults.filter(l => (isTransmasc ? isT_LabUnit(l.unit) : !isT_LabUnit(l.unit)));
    const showCalibrate = events.length > 0 && modeLabs.length === 0;

    // ── Routine ───────────────────────────────────────────────────────────
    // Recomputed each minute with `nowMs`: due times and slot states move with the clock.
    const regimens = React.useMemo(() => inferRegimens(events, nowMs), [events, nowMs]);
    const dialPick = React.useMemo(() => pickDialRegimens(regimens, isTransmasc), [regimens, isTransmasc]);
    const cycle = React.useMemo(() => (dialPick.outer ? cycleState(dialPick.outer, nowMs) : null), [dialPick.outer, nowMs]);
    const slots = React.useMemo(
        () => (cycle && dialPick.inner ? dailySlots(dialPick.inner, cycle.cycleStartMs, cycle.cycleDays, nowMs) : null),
        [cycle, dialPick.inner, nowMs],
    );
    const upcoming = React.useMemo(() => upcomingDoses(regimens, nowMs).slice(0, 4), [regimens, nowMs]);
    const next = upcoming[0] ?? null;

    // ── Level ─────────────────────────────────────────────────────────────
    const level = isTransmasc ? currentT : currentLevel;
    const unit = isTransmasc ? 'ng/dL' : 'pg/mL';
    const hormone = isTransmasc ? t('label.t') : t('label.e2');
    const target = isTransmasc ? TARGET_T : TARGET_E2;
    const hasLevel = level > 0;
    const shownLevel = hasLevel ? Math.round(level) : null;

    // The level at an hour, as the chart draws it: the logged estimate up to
    // now, then the projection, so a look ahead counts the doses the routine
    // still brings (tonight's tablet, tomorrow's gel) and not just the wear-off.
    const levelAt = React.useCallback((h: number): number => {
        const src = projection && h > nowH ? projection : simulation;
        if (!src) return 0;
        if (isTransmasc) return interpolateConcentration_T(src, h) ?? 0;
        return (interpolateConcentration_E2(src, h) ?? 0) * calibrationFn(h);
    }, [simulation, projection, nowH, isTransmasc, calibrationFn]);

    // Trend over the last 3 hours, then where it is heading before the next
    // dose of the level's own medicine (only when that dose follows a cycle).
    // Looking ahead reads the projection through levelAt.
    const trendText = React.useMemo(() => {
        if (!hasLevel || !simulation) return null;
        const past = levelAt(nowH - 3);
        const cur = levelAt(nowH);
        if (!(cur > 0) || !(past > 0)) return null;
        const pctPerH = ((cur - past) / cur / 3) * 100;
        const dir = Math.abs(pctPerH) < 0.4 ? 'steady' : pctPerH < 0 ? 'falling' : 'rising';
        const words = dir === 'steady' ? 'steady' : Math.abs(pctPerH) < 2 ? `${dir}_slowly` : dir;
        const parts = [t(`today.trend.${words}`)];

        const outer = cycle?.regimen;
        if (outer && isPrimaryHormone(outer.ester, isTransmasc) && cycle && cycle.nextDueMs > nowMs) {
            const dueH = cycle.nextDueMs / MS_H;
            if (dir === 'rising') {
                let peak = cur;
                let peakH = nowH;
                for (let h = nowH; h <= dueH; h += 1) {
                    const v = levelAt(h);
                    if (v > peak) { peak = v; peakH = h; }
                }
                if (peakH > nowH + 1) {
                    parts.push(fmt(t('today.trend.high_at'), { when: dayAndTime(peakH * MS_H, nowMs, lang), value: Math.round(peak) }));
                }
            } else {
                const low = levelAt(dueH - 0.1);
                if (low > 0) {
                    const key = outer.family === 'injection' ? 'today.trend.low_before_shot' : 'today.trend.low_before_dose';
                    parts.push(fmt(t(key), { day: weekdayLong(cycle.nextDueMs, lang), value: Math.round(low) }));
                }
            }
        }
        return joinSentences(lang, parts);
    }, [hasLevel, simulation, levelAt, nowH, nowMs, cycle, isTransmasc, lang, t]);

    const estimatedText =
        modeLabs.length === 0 ? t('today.estimated_none')
            : modeLabs.length === 1 ? t('today.estimated_one')
                : fmt(t('today.estimated_many'), { n: modeLabs.length });

    // "How this is worked out" sheet: model value, lab adjustment, last dose.
    const explanation = React.useMemo(() => {
        if (!hasLevel || !simulation) return undefined;
        const lines: string[] = [];
        const value = Math.round(level);
        if (!isTransmasc) {
            const raw = interpolateConcentration_E2(simulation, nowH) ?? 0;
            const factor = calibrationFn(nowH);
            lines.push(fmt(t('today.info.model'), { value: Math.round(raw), unit }));
            if (modeLabs.length === 0) lines.push(t('today.info.no_labs'));
            else if (Math.abs(factor - 1) < 0.02) lines.push(fmt(t('today.info.adjusted_same'), { value }));
            else {
                const pct = Math.round(Math.abs(factor - 1) * 100);
                lines.push(fmt(t(factor > 1 ? 'today.info.adjusted_up' : 'today.info.adjusted_down'), { pct, value }));
            }
        } else {
            lines.push(fmt(t('today.info.model'), { value, unit }));
        }
        const lastPrimary = [...events]
            .filter(e => isPrimaryHormone(e.ester, isTransmasc) && toMs(e.timeH) <= nowMs)
            .sort((a, b) => b.timeH - a.timeH)[0];
        if (lastPrimary) {
            lines.push(fmt(t('today.info.last_dose'), {
                when: dayAndTime(toMs(lastPrimary.timeH), nowMs, lang),
                dose: `${medInline(lastPrimary.ester, t, lang)} ${doseText(lastPrimary)}`,
            }));
        }
        lines.push(t('today.info.only_test'));
        return lines;
    }, [hasLevel, simulation, level, isTransmasc, nowH, calibrationFn, modeLabs.length, unit, events, nowMs, lang, t]);

    const openInfo = () => setIsEstimateInfoOpen(true);

    // ── Words around the dial ─────────────────────────────────────────────
    const cycleTitle = cycle
        ? cycle.cycleDays === 7
            ? fmt(t('today.cycle.weekly'), { day: cycle.day })
            : fmt(t('today.cycle.days'), { day: cycle.day, n: cycle.cycleDays })
        : null;

    const cycleLine = React.useMemo(() => {
        if (!cycle) return null;
        const fam = cycle.regimen.family;
        const kind = fam === 'injection' ? 'injection' : fam === 'patch' ? 'patch' : 'other';
        return fmt(t(`today.cycle.${kind}${cycle.overdue ? '_overdue' : ''}`), {
            taken: dayAndTime(cycle.lastDoseMs, nowMs, lang),
            next: dayAndTime(cycle.nextDueMs, nowMs, lang),
        });
    }, [cycle, nowMs, lang, t]);

    const legendLine = React.useMemo(() => {
        if (!cycle) return null;
        const parts: string[] = [];
        const outerMed = medInline(cycle.regimen.ester, t, lang);
        parts.push(cycle.cycleDays === 7
            ? fmt(t('today.legend.outer_weekly'), { med: outerMed })
            : fmt(t('today.legend.outer_days'), { med: outerMed, n: cycle.cycleDays }));
        if (dialPick.inner && slots) {
            parts.push(fmt(t('today.legend.inner'), { med: medInline(dialPick.inner.ester, t, lang) }));
            const missed = slots.filter(s => s.state === 'missed');
            if (missed.length === 1) parts.push(fmt(t('today.legend.missed_one'), { day: weekdayLong(missed[0].dayStartMs, lang) }));
            else if (missed.length > 1) parts.push(fmt(t('today.legend.missed_many'), { n: missed.length }));
        }
        return joinSentences(lang, parts);
    }, [cycle, dialPick.inner, slots, lang, t]);

    const nextLine = next
        ? fmt(t('today.next'), {
            dose: `${medInline(next.regimen.ester, t, lang)} ${doseText(next.regimen.last)}`,
            when: whenInline(next.dueMs, nowMs, lang, t),
        })
        : null;

    const openUpcoming = onLogDose ? (item: UpcomingDose) => onLogDose(prefillFor(item, nowMs)) : undefined;

    // ── Header ────────────────────────────────────────────────────────────
    const title = (
        <>
            <span className="xl:hidden">{shortDateTitle(nowMs, lang)}</span>
            <span className="hidden xl:inline">{longDateTitle(nowMs, lang)}</span>
        </>
    );
    const modeName = t(isTransmasc ? 'mode.transmasc' : 'mode.transfem');
    const subtitle = (
        <>
            <span className="xl:hidden">{modeName}</span>
            <span className="hidden xl:inline">{`${modeName}. ${fmt(t('today.updated'), { time: formatTime(nowMs, lang) })}`}</span>
        </>
    );

    const share = () => {
        if (!authToken) { onAuthRequired(); return; }
        onNavigateToShare();
    };
    const shareTitle = events.length ? shareCopy.modalDescription : shareCopy.noData;

    const backup = (() => {
        if (!syncStatus || syncStatus === 'off') return null;
        let icon: React.ReactNode;
        let label: string;
        let tone = 'text-[var(--c-muted)]';
        if (syncStatus === 'syncing') { icon = <Sync size={22} />; label = t('today.backup.syncing'); }
        else if (syncStatus === 'error') { icon = <CloudOff size={22} />; label = t('today.backup.error'); tone = 'text-[var(--c-attention)]'; }
        else if (syncStatus === 'locked') { icon = <CloudOff size={22} />; label = t('today.backup.locked'); tone = 'text-[var(--c-attention)]'; }
        else {
            icon = <BackedUp size={22} />;
            tone = 'text-[var(--c-target)]';
            label = lastSyncedAt
                ? fmt(t('today.backup.synced'), { when: relativeTime(lastSyncedAt, nowMs, lang) })
                : t('today.backup.syncing');
        }
        return onOpenBackup ? (
            <Button variant="icon" aria-label={label} title={label} onClick={onOpenBackup} className={tone}>{icon}</Button>
        ) : (
            <span role="img" aria-label={label} title={label} className={`grid h-11 w-11 place-items-center ${tone}`}>{icon}</span>
        );
    })();

    const trailing = (
        <>
            {backup}
            <Button
                variant="icon"
                className="xl:hidden"
                aria-label={shareCopy.action}
                title={shareTitle}
                disabled={!events.length}
                onClick={share}
            >
                <Share size={22} />
            </Button>
            <Button
                variant="secondary"
                compact
                className="hidden xl:inline-flex"
                title={shareTitle}
                disabled={!events.length}
                onClick={share}
            >
                <Share size={20} />
                {shareCopy.action}
            </Button>
        </>
    );

    // ── Blocks ────────────────────────────────────────────────────────────
    const centre = (
        <>
            <PixelCat pose="donut" size={52} className="xl:h-[45px] xl:w-[78px]" />
            <span className="block text-[44px] font-semibold leading-[44px] tabular-nums xl:text-[64px] xl:leading-[64px]">
                {shownLevel ?? '--'}
            </span>
            <span className="block text-[15px] font-semibold leading-5 text-[var(--c-muted)] xl:text-lg">{unit}</span>
        </>
    );
    const centreAria = shownLevel != null
        ? fmt(t('today.centre_aria'), { hormone, value: shownLevel, unit })
        : t('today.how');

    const words = hasLevel ? levelWords(level, target) : null;
    const statusLine = words && (
        <p className={`m-0 flex items-center gap-2 text-base font-semibold ${words === 'in' ? 'text-[var(--c-target)]' : 'text-[var(--c-attention)]'}`}>
            {words === 'in' ? <InTarget size={20} /> : words.endsWith('above') ? <Up size={20} /> : <Down size={20} />}
            <span>{fmt(t(`today.status.${words}`), { low: target.low, high: target.high })}</span>
        </p>
    );

    const [scaleMin, scaleMax] = rulerScale(target);
    const levelDetails = (
        <>
            {statusLine}
            {hasLevel && (
                <RangeRuler
                    value={level}
                    target={target}
                    targetLabel={fmt(t('today.ruler.target'), { low: target.low, high: target.high })}
                    ariaLabel={fmt(t('today.ruler.aria'), {
                        value: Math.round(level), unit, min: scaleMin, max: scaleMax, low: target.low, high: target.high,
                    })}
                />
            )}
            {trendText && <p className="m-0 text-base text-[var(--c-ink)]">{trendText}</p>}
            <div className="flex flex-col gap-0.5">
                <p className="m-0 text-sm text-[var(--c-muted)]">{estimatedText}</p>
                {isTransmasc && currentT > 0 && (
                    <p className="m-0 text-sm text-[var(--c-muted)]">{fmt(t('today.t_nmol'), { value: (currentT / 28.842).toFixed(1) })}</p>
                )}
                {!isTransmasc && currentCPA > 0 && (
                    <p className="m-0 text-sm text-[var(--c-muted)]">{fmt(t('today.cpa_level'), { value: currentCPA.toFixed(1) })}</p>
                )}
            </div>
            <Button variant="plain" onClick={openInfo} className="-ml-3 self-start">
                {t('today.how')}
            </Button>
        </>
    );

    const plate = 'flex flex-col gap-3 rounded-[28px] bg-[var(--c-plate)] p-4 xl:p-6';

    const dialPlate = cycle ? (
        <section aria-label={cycleTitle ?? undefined} className={plate}>
            <div className="flex flex-col gap-0.5">
                <p className="m-0 text-base font-semibold text-[var(--c-ink)]">{cycleTitle}</p>
                <p className="m-0 text-sm text-[var(--c-muted)]">{cycleLine}</p>
            </div>
            <RhythmDial
                cycleDays={cycle.cycleDays}
                cycleStartMs={cycle.cycleStartMs}
                hasDose
                fraction={cycle.fraction}
                nowMs={nowMs}
                glyph={ROUTE_ICON[cycle.regimen.family]}
                slots={slots}
                lang={lang}
                ariaLabel={joinSentences(lang, [cycleTitle, cycleLine, legendLine].filter(Boolean) as string[])}
                onCentreClick={openInfo}
                centreAriaLabel={centreAria}
            >
                {centre}
            </RhythmDial>
            {levelDetails}
            {legendLine && <p className="m-0 text-sm text-[var(--c-muted)]">{legendLine}</p>}
        </section>
    ) : (
        // List-first fallback: no cycle to draw, so the level block stands alone.
        <section aria-label={hormone} className={plate}>
            <button
                type="button"
                onClick={openInfo}
                aria-label={centreAria}
                className="flex flex-col items-center gap-0.5 self-center rounded-2xl px-6 py-2 text-[var(--c-ink)] hover:bg-[var(--c-plate-strong)]"
            >
                {centre}
            </button>
            {levelDetails}
            {regimens.length === 0 && <p className="m-0 text-sm text-[var(--c-muted)]">{t('today.fallback.hint')}</p>}
        </section>
    );

    const logButton = (label: string, onClick: () => void) => (
        <Button variant="primary" block onClick={onClick}>
            <Plus size={20} />
            {label}
        </Button>
    );

    // ── Empty state (C26): an empty dial starting today, the cat, one button ──
    if (events.length === 0) {
        const todayStart = startOfLocalDay(nowMs);
        const fraction = (nowMs - todayStart) / (addLocalDays(todayStart, 7) - todayStart);
        return (
            <div className="w-full max-w-2xl px-4 pb-32 md:px-8">
                <EstimateInfoModal isOpen={isEstimateInfoOpen} onClose={() => setIsEstimateInfoOpen(false)} />
                <PageHeader title={title} subtitle={subtitle} trailing={backup} />
                <div className="flex flex-col gap-4">
                    <section aria-label={t('today.empty.title')} className={plate}>
                        <RhythmDial
                            cycleDays={7}
                            cycleStartMs={todayStart}
                            hasDose={false}
                            fraction={fraction}
                            nowMs={nowMs}
                            slots={null}
                            lang={lang}
                            ariaLabel={t('today.empty.title')}
                        >
                            <PixelCat pose="donut" size={52} className="xl:h-[45px] xl:w-[78px]" />
                            <span className="block px-2 text-base font-semibold leading-6">{t('today.empty.title')}</span>
                        </RhythmDial>
                        <p className="m-0 text-base text-[var(--c-ink)]">{t('today.empty.body')}</p>
                    </section>
                    {logButton(t('today.log_first'), () => (onLogDose ? onLogDose() : onNavigateToHistory()))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl px-4 pb-32 md:px-8 xl:max-w-[1120px]">
            <EstimateInfoModal
                isOpen={isEstimateInfoOpen}
                onClose={() => setIsEstimateInfoOpen(false)}
                explanation={explanation}
            />

            <PageHeader title={title} subtitle={subtitle} trailing={trailing} />

            <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[520px_minmax(0,1fr)] xl:items-start">
                {/* Left: the dial plate, notices and the one main action */}
                <div className="flex min-w-0 flex-col gap-4">
                    {dialPlate}
                    <DoseAdvisoryNotice
                        advisory={doseAdvisory}
                        hormoneAdvisory={hormoneAdvisory}
                        showCalibrate={showCalibrate}
                        onCalibrate={onNavigateToLab}
                        t={t}
                    />
                    {(nextLine || onLogDose) && (
                        <div className="flex flex-col gap-2">
                            {nextLine && (
                                <p className={`m-0 text-base ${next?.overdue ? 'text-[var(--c-attention)]' : 'text-[var(--c-ink)]'}`}>{nextLine}</p>
                            )}
                            {onLogDose && logButton(t('today.log_dose'), () => onLogDose())}
                        </div>
                    )}
                </div>

                {/* Right on desktop: chart first, then Coming up. Phone order is Coming up, then the chart. */}
                <div className="flex min-w-0 flex-col gap-8">
                    {upcoming.length > 0 && (
                        <Section title={t('today.coming_up')} className="xl:order-2">
                            <ComingUp
                                items={upcoming}
                                nowMs={nowMs}
                                lang={lang}
                                t={t}
                                isTransmasc={isTransmasc}
                                onOpen={openUpcoming}
                            />
                        </Section>
                    )}

                    <Section
                        title={t('today.this_week')}
                        className="xl:order-1 xl:rounded-2xl xl:border xl:border-[var(--c-hairline)] xl:bg-[var(--c-surface)] xl:px-5 xl:pb-4 xl:pt-3"
                        action={
                            <Button variant="plain" onClick={onNavigateToHistory} className="-mr-3">
                                {t('today.timeline')}
                            </Button>
                        }
                    >
                        <ResultChart
                            sim={simulation}
                            projection={projection}
                            events={events}
                            onPointClick={onEditEvent}
                            labResults={labResults}
                            calibrationFn={calibrationFn}
                            isDarkMode={isDarkMode}
                            isMono={isMono}
                            showTitle={false}
                            headerClassName="hidden xl:flex"
                        />
                        <p className="m-0 mt-2 text-sm text-[var(--c-muted)]">
                            {fmt(t(projection ? 'today.chart_caption' : 'today.chart_caption_logged'), { hormone: inline(hormone, lang) })}
                        </p>
                    </Section>
                </div>
            </div>
        </div>
    );
};

export default Home;
