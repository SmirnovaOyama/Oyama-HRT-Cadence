import React, { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    Check, ChevronRight, Gel, Injection, Patch, Plus, Select, Share, Sublingual, Tablet,
    type IconComponent,
} from '../components/icons';
import {
    CalibrationResult, DoseEvent, Ester, ExtraKey, GEL_SITE_ORDER, LabResult, Route, SimulationResult,
    getToE2Factor, isTestosteroneEster,
} from '../../logic';
import { formatTime, toDayKey } from '../utils/helpers';
import { useDialog } from '../contexts/DialogContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useHRTMode } from '../contexts/HRTModeContext';
import { joinList } from '../i18n/listSeparator';
import type { Lang } from '../i18n/translations';
import type { AppTheme } from '../constants';
import DoseForm from '../components/DoseForm';
import DoseHeatmap, { makeDayFormatter } from '../components/DoseHeatmap';
import ResultChart from '../components/ResultChart';
import PixelCat from '../components/PixelCat';
import { DoseTemplate } from '../components/DoseFormModal';
import { DoseDayGroup } from '../hooks/useAppData';
import { Button, ListGroup, ListRow, PageHeader, Section, Switch } from '../components/ui';

const MAX_BATCH_COUNT = 365;
/** Day groups drawn at first, and added per "Show earlier days". */
const DAYS_PER_PAGE = 14;

type Filter = 'all' | 'injections' | 'tablets' | 'gels';
const FILTERS: Filter[] = ['all', 'injections', 'tablets', 'gels'];

const matchesFilter = (ev: DoseEvent, f: Filter) => {
    switch (f) {
        case 'injections': return ev.route === Route.injection;
        case 'tablets': return ev.route === Route.oral || ev.route === Route.sublingual;
        case 'gels': return ev.route === Route.gel || ev.route === Route.patchApply || ev.route === Route.patchRemove;
        default: return true;
    }
};

/** "4", "12.5", "0.25": at most two decimals, no trailing zeros. */
const fmtNum = (n: number) => String(Math.round(n * 100) / 100);

const ROUTE_ICON: Record<Route, IconComponent> = {
    [Route.injection]: Injection,
    [Route.oral]: Tablet,
    [Route.sublingual]: Sublingual,
    [Route.gel]: Gel,
    [Route.patchApply]: Patch,
    [Route.patchRemove]: Patch,
};

/** The 40px tile at the start of a dose row: the route's icon on the
 *  compound's tint (cyproterone in the second hue, the rest in the accent). */
export const DoseTile: React.FC<{ ev: DoseEvent }> = ({ ev }) => {
    const Icon = ROUTE_ICON[ev.route] ?? Tablet;
    const second = ev.ester === Ester.CPA;
    return (
        <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{
                background: second ? 'var(--c-second-tint)' : 'var(--c-accent-container)',
                color: second ? 'var(--c-second)' : 'var(--c-accent)',
            }}
        >
            <Icon size={20} />
        </span>
    );
};

/** "Estradiol valerate 4 mg, injection". */
export const doseTitle = (ev: DoseEvent, t: (k: string) => string): string => {
    if (ev.route === Route.patchRemove) return t('timeline.patch_removed');
    const rate = ev.extras[ExtraKey.releaseRateUGPerDay];
    const dose = ev.route === Route.patchApply && rate ? `${fmtNum(rate)}\u00a0µg/d` : `${fmtNum(ev.doseMG)}\u00a0mg`;
    return t('timeline.dose_title')
        .replace('{name}', t(`timeline.name.${ev.ester}`))
        .replace('{dose}', dose)
        .replace('{route}', t(`timeline.route.${ev.route}`));
};

/** The one-line row title, split so the name can give way before the amount:
 *  "Estradiol valerate" + "4 mg". The tile already shows the route, so it is
 *  left to the screen-reader text. Cyproterone acetate shortens to "Cyproterone". */
export const doseRowParts = (ev: DoseEvent, t: (k: string) => string): { name: string; dose: string } => {
    if (ev.route === Route.patchRemove) return { name: t('timeline.patch_removed'), dose: '' };
    const rate = ev.extras[ExtraKey.releaseRateUGPerDay];
    const dose = ev.route === Route.patchApply && rate ? `${fmtNum(rate)}\u00a0µg/d` : `${fmtNum(ev.doseMG)}\u00a0mg`;
    const name = ev.ester === Ester.CPA ? t('timeline.short.CPA') : t(`timeline.name.${ev.ester}`);
    const tpl = t('timeline.row_title');
    const at = tpl.indexOf('{dose}');
    if (at < 0 || tpl.indexOf('{name}') > at) return { name: tpl.replace('{name}', name).replace('{dose}', dose), dose: '' };
    // Whatever sits between the name and the amount (a space) stays with the amount.
    return { name: tpl.slice(0, at).trimEnd().replace('{name}', name), dose: `\u00a0${dose}${tpl.slice(at + 6)}` };
};

/** The muted line under a dose: volume, site, equivalent dose, wear time. */
export const doseDetail = (ev: DoseEvent, t: (k: string) => string, lang: Lang, isFuture: boolean): string => {
    const parts: string[] = [];
    if (isFuture) parts.push(t('timeline.future'));
    if (ev.route === Route.patchRemove) return joinList(lang, parts);

    const conc = ev.extras[ExtraKey.concentrationMGmL];
    if (ev.route === Route.injection && typeof conc === 'number' && conc > 0) {
        parts.push(`${(ev.doseMG / conc).toFixed(2)}\u00a0mL`);
    }
    const site = ev.extras[ExtraKey.gelSite];
    if (ev.route === Route.gel && typeof site === 'number') {
        const name = GEL_SITE_ORDER[Math.max(0, Math.min(GEL_SITE_ORDER.length - 1, Math.round(site)))];
        parts.push(t(`timeline.site.${name}`));
    }
    const hasRate = !!ev.extras[ExtraKey.releaseRateUGPerDay];
    if (!hasRate && ev.ester !== Ester.E2 && ev.ester !== Ester.CPA && ev.ester !== Ester.T) {
        const eq = fmtNum(ev.doseMG * getToE2Factor(ev.ester));
        parts.push(t(isTestosteroneEster(ev.ester) ? 'timeline.as_t' : 'timeline.as_e2').replace('{mg}', eq));
    }
    const wear = ev.extras[ExtraKey.patchWearH];
    if (ev.route === Route.patchApply && typeof wear === 'number' && wear > 0) {
        parts.push(t('timeline.worn_days').replace('{d}', fmtNum(wear / 24)));
    }
    return joinList(lang, parts);
};

/** Dark and mono flags from the classes App puts on <html>, for callers that
 *  don't pass the theme down. */
const useRootThemeFlags = () => {
    const read = () => {
        const c = typeof document !== 'undefined' ? document.documentElement.classList : null;
        return { dark: !!c?.contains('dark'), mono: !!c?.contains('mono') };
    };
    const [flags, setFlags] = useState(read);
    useEffect(() => {
        const obs = new MutationObserver(() => {
            setFlags(prev => {
                const next = read();
                return next.dark === prev.dark && next.mono === prev.mono ? prev : next;
            });
        });
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);
    return flags;
};

interface HistoryProps {
    t: (key: string) => string;
    isQuickAddOpen: boolean;
    setIsQuickAddOpen: (isOpen: boolean) => void;
    doseTemplates: DoseTemplate[];
    onSaveEvent: (e: DoseEvent) => void;
    onDeleteEvent: (id: string) => void;
    onAddEvents: (events: DoseEvent[]) => void;
    onDeleteEvents: (ids: string[]) => void;
    onSaveTemplate: (t: DoseTemplate) => void;
    onDeleteTemplate: (id: string) => void;
    groupedEvents: DoseDayGroup[];
    /* Optional: the estimate chart and its calibration note. The chart is drawn
       only when `simulation` is passed. */
    events?: DoseEvent[];
    simulation?: SimulationResult | null;
    /** The estimate with the planned doses added (useProjection). The chart
     *  draws its dashed future from it and says "If you keep your schedule". */
    projection?: SimulationResult | null;
    labResults?: LabResult[];
    calibrationFn?: (timeH: number) => number;
    calibration?: CalibrationResult;
    theme?: AppTheme;
    /** Opens Blood tests, from "What does this mean?" under the chart. */
    onNavigateToLab?: () => void;
    /** Shows the Share button in the header. */
    onNavigateToShare?: () => void;
}

const History: React.FC<HistoryProps> = ({
    t,
    isQuickAddOpen,
    setIsQuickAddOpen,
    doseTemplates,
    onSaveEvent,
    onDeleteEvent,
    onAddEvents,
    onDeleteEvents,
    onSaveTemplate,
    onDeleteTemplate,
    groupedEvents,
    events: eventsProp,
    simulation,
    projection,
    labResults,
    calibrationFn,
    calibration,
    theme,
    onNavigateToLab,
    onNavigateToShare,
}) => {
    const { showDialog } = useDialog();
    const { lang } = useTranslation();
    const { isTransmasc } = useHRTMode();
    const rootFlags = useRootThemeFlags();
    const isDarkMode = theme
        ? theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
        : rootFlags.dark;
    const isMono = theme ? theme === 'mono' : rootFlags.mono;

    const [editingId, setEditingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>('all');
    const [filterOpen, setFilterOpen] = useState(false);
    const [dayLimit, setDayLimit] = useState(DAYS_PER_PAGE);

    // Batch add: repeat the quick-add dose at a fixed interval.
    const [batchOn, setBatchOn] = useState(false);
    const [batchIntervalDays, setBatchIntervalDays] = useState('1');
    const [batchCount, setBatchCount] = useState('7');

    // Batch delete: selection mode over the list.
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const allEvents = useMemo(() => eventsProp ?? groupedEvents.flatMap(g => g.events), [eventsProp, groupedEvents]);
    const totalRecords = allEvents.length;
    const nowH = Date.now() / 3600000;

    const filteredGroups = useMemo(() => {
        if (filter === 'all') return groupedEvents;
        return groupedEvents
            .map(g => ({ ...g, events: g.events.filter(ev => matchesFilter(ev, filter)) }))
            .filter(g => g.events.length > 0);
    }, [groupedEvents, filter]);
    const filteredEvents = useMemo(() => filteredGroups.flatMap(g => g.events), [filteredGroups]);

    // --- Day headings: "Today, Wed Sep 23", "Yesterday, Tue Sep 22", "Mon Sep 21".
    const fmtDay = useMemo(() => makeDayFormatter(lang), [lang]);
    const now = new Date();
    const todayKey = toDayKey(now);
    const yesterdayKey = toDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const dayHeading = (key: string) => {
        const [y, m, d] = key.split('-').map(Number);
        const date = new Date(y, (m || 1) - 1, d || 1);
        if (Number.isNaN(date.getTime())) return key;
        const text = fmtDay(date);
        if (key === todayKey) return t('timeline.day_today').replace('{date}', text);
        if (key === yesterdayKey) return t('timeline.day_yesterday').replace('{date}', text);
        if (key > todayKey) return t('timeline.day_planned').replace('{date}', text);
        return text;
    };

    const handleQuickSave = (e: DoseEvent) => {
        const interval = parseFloat(batchIntervalDays);
        const count = Math.min(MAX_BATCH_COUNT, Math.floor(parseFloat(batchCount)));
        if (batchOn && Number.isFinite(interval) && interval > 0 && Number.isFinite(count) && count > 1) {
            const list: DoseEvent[] = [];
            for (let k = 0; k < count; k++) {
                list.push({
                    ...e,
                    id: k === 0 ? e.id : uuidv4(),
                    timeH: e.timeH + k * interval * 24,
                    extras: { ...e.extras },
                });
            }
            onAddEvents(list);
        } else {
            onSaveEvent(e);
        }
        setIsQuickAddOpen(false);
    };

    const enterSelectMode = () => {
        setSelectMode(true);
        setSelectedIds(new Set());
        setEditingId(null);
        if (isQuickAddOpen) setIsQuickAddOpen(false);
    };

    const exitSelectMode = () => {
        setSelectMode(false);
        setSelectedIds(new Set());
    };

    const toggleSelected = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // "Select all" covers what the filter shows, including days not drawn yet.
    const allSelected = filteredEvents.length > 0 && filteredEvents.every(e => selectedIds.has(e.id));
    const toggleSelectAll = () => {
        setSelectedIds(allSelected ? new Set() : new Set(filteredEvents.map(e => e.id)));
    };

    const handleDeleteSelected = () => {
        if (!selectedIds.size) return;
        const msg = t('timeline.batch_delete_confirm').replace('{n}', String(selectedIds.size));
        showDialog('confirm', msg, () => {
            onDeleteEvents([...selectedIds]);
            exitSelectMode();
        });
    };

    // Opening a dose from the chart: make sure its day is drawn, then bring
    // its row into view with the edit form open.
    const [scrollToId, setScrollToId] = useState<string | null>(null);
    const openFromChart = (ev: DoseEvent) => {
        if (selectMode) return;
        setFilter('all');
        const idx = groupedEvents.findIndex(g => g.events.some(e => e.id === ev.id));
        if (idx >= dayLimit) setDayLimit(Math.ceil((idx + 1) / DAYS_PER_PAGE) * DAYS_PER_PAGE);
        setEditingId(ev.id);
        setScrollToId(ev.id);
    };
    useEffect(() => {
        if (!scrollToId) return;
        document.getElementById(`dose-${scrollToId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setScrollToId(null);
    }, [scrollToId]);

    const batchHint = t('timeline.batch_hint')
        .replace('{d}', batchIntervalDays || '?')
        .replace('{n}', batchCount || '?');

    // --- Calibration note under the chart.
    const adjustNote = (() => {
        if (!calibration || isTransmasc || calibration.method === 'off' || calibration.points.length === 0) return null;
        const pct = Math.round((calibration.scale - 1) * 100);
        const n = calibration.n;
        if (pct === 0) return t('timeline.adjusted_none');
        const key = `timeline.adjusted_${pct > 0 ? 'up' : 'down'}${n === 1 ? '_one' : ''}`;
        return t(key).replace('{p}', String(Math.abs(pct))).replace('{n}', String(n));
    })();

    const visibleGroups = filteredGroups.slice(0, dayLimit);
    const showTodayPlaceholder = filter === 'all' && totalRecords > 0 && !groupedEvents.some(g => g.key === todayKey)
        // Only when today sits at the top of the list: planned days ahead of it
        // already give the list a head.
        && (groupedEvents.length === 0 || groupedEvents[0].key < todayKey);

    const numInput = 'input-base !w-24 !min-h-11 !py-2 text-end tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

    // One dose row: tile, one-line title, the time at the end. The details
    // (volume, site, equivalent dose) show in the form when the row opens.
    const doseRow = (ev: DoseEvent, isEditing: boolean) => {
        const { name, dose } = doseRowParts(ev, t);
        const isFuture = ev.timeH > nowH;
        const time = formatTime(new Date(ev.timeH * 3600000));
        return (
            <ListRow
                key={ev.id}
                id={`dose-${ev.id}`}
                leading={<DoseTile ev={ev} />}
                title={
                    <span className="flex min-w-0">
                        <span className="truncate">{name}</span>
                        {dose && <span className="shrink-0 whitespace-nowrap tabular-nums">{dose}</span>}
                        <span className="sr-only">
                            {`${ev.route === Route.patchRemove ? '' : `, ${t(`timeline.route.${ev.route}`)}`}${isFuture ? `, ${t('timeline.future')}` : ''}`}
                        </span>
                    </span>
                }
                trailing={
                    <span className="shrink-0 whitespace-nowrap text-base tabular-nums text-[var(--c-muted)]">{time}</span>
                }
                selected={selectMode ? selectedIds.has(ev.id) : undefined}
                aria-expanded={selectMode ? undefined : isEditing}
                onClick={() => selectMode
                    ? toggleSelected(ev.id)
                    : setEditingId(isEditing ? null : ev.id)}
                className={isEditing ? '!bg-[var(--c-plate)]' : undefined}
            />
        );
    };

    /* Mobile reads top to bottom in `order`. From xl the page splits into two
       columns (chart and rhythm left, the add form and the history right); the
       column wrappers are `display: contents` below xl so their children join
       one flex column. */
    return (
        <div className="relative pb-32">
            <div className="w-full max-w-2xl px-4 md:px-8 xl:max-w-[1120px]">
                <PageHeader
                    title={t('timeline.page_title')}
                    subtitle={selectMode ? t('timeline.selected_n').replace('{n}', String(selectedIds.size)) : undefined}
                    trailing={selectMode ? (
                        <Button variant="plain" onClick={exitSelectMode}>{t('btn.cancel')}</Button>
                    ) : (
                        <>
                            {onNavigateToShare && (
                                <Button variant="icon" aria-label={t('timeline.share')} onClick={onNavigateToShare}>
                                    <Share size={22} />
                                </Button>
                            )}
                            {totalRecords > 0 && (
                                <Button variant="icon" aria-label={t('timeline.select')} onClick={enterSelectMode}>
                                    <Select size={22} />
                                </Button>
                            )}
                            <Button
                                variant="secondary"
                                compact
                                aria-expanded={isQuickAddOpen}
                                onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
                            >
                                {isQuickAddOpen ? t('btn.cancel') : (<><Plus size={20} />{t('timeline.add_dose')}</>)}
                            </Button>
                        </>
                    )}
                />
            </div>

            {/* Select mode actions stay in reach while the list scrolls. */}
            {selectMode && (
                <div className="sticky top-0 z-20 border-b border-[var(--c-hairline)] bg-[var(--c-paper)]">
                    <div className="flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-1 md:px-8 xl:max-w-[1120px]">
                        <Button variant="plain" onClick={toggleSelectAll} disabled={filteredEvents.length === 0}>
                            {t('timeline.select_all')}
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteSelected} disabled={!selectedIds.size}>
                            {selectedIds.size ? t('timeline.delete_n').replace('{n}', String(selectedIds.size)) : t('btn.delete')}
                        </Button>
                    </div>
                </div>
            )}

            <div className="w-full max-w-2xl px-4 md:px-8 xl:max-w-[1120px]">
                <div className={`flex flex-col gap-8 ${totalRecords > 0 ? 'xl:grid xl:grid-cols-[minmax(0,1fr)_440px] xl:items-start xl:gap-x-12' : ''}`}>
                    {/* Left column: the chart with its note, then the rhythm. */}
                    {totalRecords > 0 && (
                        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-8">
                            {simulation !== undefined && (
                                <div className="order-2 flex min-w-0 flex-col gap-2">
                                    <ResultChart
                                        sim={simulation}
                                        projection={projection ?? null}
                                        events={allEvents}
                                        labResults={labResults}
                                        calibrationFn={calibrationFn}
                                        onPointClick={openFromChart}
                                        isDarkMode={isDarkMode}
                                        isMono={isMono}
                                        showTitle={false}
                                        showCalibrationNote={false}
                                    />
                                    {adjustNote && (
                                        <div className="flex flex-col items-start">
                                            <p className="m-0 text-sm text-[var(--c-ink)]">{adjustNote}</p>
                                            {onNavigateToLab && (
                                                <Button variant="plain" className="-ml-1 px-1" onClick={onNavigateToLab}>
                                                    {t('timeline.adjust_explain')}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <Section title={t('timeline.rhythm')} className="order-3">
                                <DoseHeatmap events={allEvents} isDarkMode={isDarkMode} />
                            </Section>
                        </div>
                    )}

                    {/* Right column: quick add, then the history. */}
                    <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-8">
                        {/* Quick add: the dose form, with batch add above it. */}
                        {isQuickAddOpen && (
                            <div className="order-1 mt-2 flex flex-col gap-4 xl:mt-0">
                                <ListGroup footer={batchOn ? batchHint : t('timeline.batch_desc')}>
                                    <ListRow
                                        title={<span id="timeline-batch-title" className="block truncate">{t('timeline.batch')}</span>}
                                        trailing={<Switch checked={batchOn} onChange={setBatchOn} aria-labelledby="timeline-batch-title" />}
                                    />
                                    {batchOn && (
                                        <ListRow
                                            title={<label htmlFor="timeline-batch-interval" className="block truncate">{t('timeline.batch_interval')}</label>}
                                            trailing={
                                                <input
                                                    id="timeline-batch-interval"
                                                    type="number"
                                                    inputMode="decimal"
                                                    min="0.25"
                                                    step="0.25"
                                                    value={batchIntervalDays}
                                                    onChange={e => setBatchIntervalDays(e.target.value)}
                                                    className={numInput}
                                                />
                                            }
                                        />
                                    )}
                                    {batchOn && (
                                        <ListRow
                                            title={<label htmlFor="timeline-batch-count" className="block truncate">{t('timeline.batch_count')}</label>}
                                            trailing={
                                                <input
                                                    id="timeline-batch-count"
                                                    type="number"
                                                    inputMode="numeric"
                                                    min="2"
                                                    max={MAX_BATCH_COUNT}
                                                    step="1"
                                                    value={batchCount}
                                                    onChange={e => setBatchCount(e.target.value)}
                                                    className={numInput}
                                                />
                                            }
                                        />
                                    )}
                                </ListGroup>
                                <DoseForm
                                    eventToEdit={null}
                                    onSave={handleQuickSave}
                                    onCancel={() => setIsQuickAddOpen(false)}
                                    onDelete={() => { }}
                                    templates={doseTemplates}
                                    onSaveTemplate={onSaveTemplate}
                                    onDeleteTemplate={onDeleteTemplate}
                                    isInline={true}
                                    events={allEvents}
                                />
                            </div>
                        )}

                        {totalRecords === 0 ? (
                            <div className="order-2 flex flex-col items-center py-16 text-center text-[var(--c-muted)]">
                                <PixelCat pose="donut" size={130} className="mb-4" />
                                <p className="m-0 text-base">{t('timeline.empty')}</p>
                            </div>
                        ) : (
                            <Section title={t('timeline.history')} className="order-4">
                                <div className="flex flex-col gap-6">
                                    {/* Filter: a drill-in row that opens its choices in place. */}
                                    <div className="flex flex-col gap-2">
                                        <ListGroup chevronIcon={<ChevronRight size={16} />}>
                                            <ListRow
                                                title={t('timeline.filter_label')}
                                                value={t(`timeline.filter.${filter}`)}
                                                drillIn
                                                aria-expanded={filterOpen}
                                                onClick={() => setFilterOpen(o => !o)}
                                            />
                                        </ListGroup>
                                        {filterOpen && (
                                            <ListGroup
                                                selection="single"
                                                aria-label={t('timeline.filter_label')}
                                                checkIcon={<Check size={22} />}
                                            >
                                                {FILTERS.map(f => (
                                                    <ListRow
                                                        key={f}
                                                        title={t(`timeline.filter.${f}`)}
                                                        selected={filter === f}
                                                        onClick={() => {
                                                            setFilter(f);
                                                            setFilterOpen(false);
                                                            setDayLimit(DAYS_PER_PAGE);
                                                        }}
                                                    />
                                                ))}
                                            </ListGroup>
                                        )}
                                    </div>

                                    {showTodayPlaceholder && (
                                        <ListGroup header={<h3 className="m-0 truncate">{dayHeading(todayKey)}</h3>}>
                                            <ListRow title={t('timeline.nothing_today')} />
                                        </ListGroup>
                                    )}

                                    {filteredGroups.length === 0 && (
                                        <p className="m-0 px-4 text-sm text-[var(--c-muted)]">{t('timeline.filter_empty')}</p>
                                    )}

                                    {visibleGroups.map(({ key, events: dayEvents }) => (
                                        <ListGroup
                                            key={key}
                                            header={<h3 className="m-0 truncate">{dayHeading(key)}</h3>}
                                            selection={selectMode ? 'multiple' : undefined}
                                            checkIcon={<Check size={22} />}
                                        >
                                            {dayEvents.flatMap(ev => {
                                                const isEditing = editingId === ev.id && !selectMode;
                                                const row = doseRow(ev, isEditing);
                                                if (!isEditing) return [row];
                                                // What the one-line row leaves out: volume, site, equivalent dose.
                                                const detail = doseDetail(ev, t, lang, false);
                                                // Mounted only for the row being edited: with hundreds of
                                                // records, a form per row re-rendered all of them on every change.
                                                return [
                                                    row,
                                                    <div key={`${ev.id}-edit`} className="bg-[var(--c-plate)] px-4 pb-4 pt-3">
                                                        {detail && <p className="m-0 mb-3 text-sm text-[var(--c-muted)]">{detail}</p>}
                                                        <DoseForm
                                                            eventToEdit={ev}
                                                            onSave={(e) => {
                                                                onSaveEvent(e);
                                                                setEditingId(null);
                                                            }}
                                                            onCancel={() => setEditingId(null)}
                                                            onDelete={(id) => {
                                                                onDeleteEvent(id);
                                                                setEditingId(null);
                                                            }}
                                                            templates={doseTemplates}
                                                            onSaveTemplate={onSaveTemplate}
                                                            onDeleteTemplate={onDeleteTemplate}
                                                            isInline={true}
                                                            hideHeader={true}
                                                            events={allEvents}
                                                        />
                                                    </div>,
                                                ];
                                            })}
                                        </ListGroup>
                                    ))}

                                    {filteredGroups.length > dayLimit && (
                                        <Button
                                            variant="secondary"
                                            className="self-center"
                                            onClick={() => setDayLimit(n => n + DAYS_PER_PAGE)}
                                        >
                                            {t('timeline.show_earlier')}
                                        </Button>
                                    )}
                                </div>
                            </Section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default History;
