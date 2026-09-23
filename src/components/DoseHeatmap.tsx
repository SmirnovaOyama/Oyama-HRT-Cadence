import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { DoseEvent, Ester, Route } from '../../logic';
import { LOCALE_MAP, toDayKey } from '../utils/helpers';
import { joinList } from '../i18n/listSeparator';
import type { Lang } from '../i18n/translations';

/** Local midnight of whatever day a moment falls on. */
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** `d` shifted by whole days, through the calendar rather than through
 *  milliseconds, so a DST boundary doesn't slide the grid by an hour. */
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/**
 * "Wed Sep 23" (or "Wed Sep 23, 2025" outside this year) in the reader's
 * language. English drops the comma Intl puts after the weekday, as the
 * boards write it, so a list of days can itself be joined with commas.
 */
export const makeDayFormatter = (lang: Lang) => {
    const locale = LOCALE_MAP[lang] || 'en-US';
    const plain = new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' });
    const withYear = new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    return (d: Date): string => {
        const fmt = d.getFullYear() === new Date().getFullYear() ? plain : withYear;
        if (lang !== 'en') return fmt.format(d);
        const parts = fmt.formatToParts(d);
        const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
        const year = get('year');
        return `${get('weekday')} ${get('month')} ${get('day')}${year ? `, ${year}` : ''}`;
    };
};

/** "Sun Sep 13 and Tue Sep 22", joined the way the language joins a list. */
export const joinDays = (lang: Lang, days: string[]): string => {
    const locale = LOCALE_MAP[lang] || 'en-US';
    try {
        return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(days);
    } catch {
        return joinList(lang, days);
    }
};

const WEEKS_STRIP = 13;   // injections: one square per week
const WEEKS_GRID = 4;     // daily medicines: one square per day

/** The compound's own colour: cyproterone takes the second hue, everything
 *  else the accent, the same split the chart and the history tiles use. */
const toneOf = (ester: Ester) => (ester === Ester.CPA ? 'var(--c-second)' : 'var(--c-accent)');

/** Routes that are taken every day or so, and so read as a day grid. Injections
 *  get the weekly strip; patches are worn for days at a time and fit neither. */
const DAILY_ROUTES = new Set<Route>([Route.oral, Route.sublingual, Route.gel]);

type DayLog = { count: number; mg: number };

type CellState = 'taken' | 'missed' | 'future' | 'empty';

/** One flat square of the rhythm grid (Timeline board, "Your rhythm"). Flat
 *  fill for logged, a dashed edge for not logged, a hairline outline for days
 *  that haven't come yet. Radius 4, no dots, no gradients. */
const cellStyle = (state: CellState, tone: string): CSSProperties => {
    switch (state) {
        case 'taken':
            return { background: tone };
        case 'missed':
            return { border: '1.5px dashed var(--c-control)', background: 'transparent' };
        case 'future':
            return { border: '1px solid var(--c-hairline)', background: 'var(--c-surface)' };
        default:
            return { border: '1px solid var(--c-hairline)', background: 'transparent' };
    }
};

/**
 * "Your rhythm": a calm picture of how regularly each medicine was logged.
 *
 * Injections read as a strip of weeks (was there a shot in each of the last 13
 * weeks?); tablets, under-the-tongue doses and gels read as a four-week day
 * grid per compound. Each has a plain sentence under it, so nothing depends on
 * reading the colours. Tap a square to read that day or week underneath.
 *
 * `isDarkMode` is still accepted for existing callers; the colours come from
 * the --c-* tokens, which flip on their own.
 */
const DoseHeatmap = ({
    events,
    className = '',
}: {
    events: DoseEvent[];
    isDarkMode?: boolean;
    className?: string;
}) => {
    const { t, lang } = useTranslation();
    const locale = LOCALE_MAP[lang] || 'en-US';

    // The grid ends on "today", so it has to notice midnight passing.
    const [today, setToday] = useState(() => startOfDay(new Date()));
    useEffect(() => {
        const id = setInterval(() => {
            const next = startOfDay(new Date());
            setToday(prev => (prev.getTime() === next.getTime() ? prev : next));
        }, 60000);
        return () => clearInterval(id);
    }, []);

    const [picked, setPicked] = useState<{ group: string; key: string } | null>(null);

    const fmtShort = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }), [locale]);
    const fmtDay = useMemo(() => ({ format: makeDayFormatter(lang) }), [lang]);
    const fmtWeekday = useMemo(() => new Intl.DateTimeFormat(locale, { weekday: 'short' }), [locale]);

    const doseLabel = (n: number) =>
        n === 0 ? t('heatmap.none') : n === 1 ? t('heatmap.dose_one') : t('heatmap.doses').replace('{n}', String(n));
    const mgLabel = (mg: number) => `${Math.round(mg * 100) / 100}\u00a0mg`;

    // --- Injections: 13 rolling weeks ending today ---------------------------
    const strip = useMemo(() => {
        const injections = events.filter(e => e.route === Route.injection);
        const firstStart = addDays(today, -(WEEKS_STRIP * 7) + 1);
        const weeks = Array.from({ length: WEEKS_STRIP }, (_, i) => {
            const start = addDays(firstStart, i * 7);
            const end = addDays(start, 6);
            return { key: toDayKey(start), start, end, count: 0, mg: 0, ester: null as Ester | null };
        });
        const t0 = firstStart.getTime();
        const tEnd = addDays(today, 1).getTime();
        let any = false;
        for (const e of injections) {
            const at = e.timeH * 3600000;
            if (!(at >= t0 && at < tEnd)) continue;
            const day = startOfDay(new Date(at));
            const idx = Math.floor(Math.round((day.getTime() - t0) / 86400000) / 7);
            const w = weeks[Math.max(0, Math.min(WEEKS_STRIP - 1, idx))];
            w.count += 1;
            w.mg += e.doseMG;
            w.ester = w.ester ?? e.ester;
            any = true;
        }
        const ester = weeks.find(w => w.ester)?.ester ?? Ester.EV;
        const logged = weeks.filter(w => w.count > 0).length;
        return { any, weeks, ester, logged };
    }, [events, today]);

    // --- Daily medicines: a four-week grid per compound ----------------------
    const grids = useMemo(() => {
        const mondayOffset = (today.getDay() + 6) % 7;
        const first = addDays(today, -mondayOffset - (WEEKS_GRID - 1) * 7);
        const byEster = new Map<Ester, { days: Map<string, DayLog>; firstEver: number }>();
        for (const e of events) {
            if (!DAILY_ROUTES.has(e.route)) continue;
            const at = new Date(e.timeH * 3600000);
            if (Number.isNaN(at.getTime())) continue;
            let rec = byEster.get(e.ester);
            if (!rec) { rec = { days: new Map(), firstEver: Infinity }; byEster.set(e.ester, rec); }
            rec.firstEver = Math.min(rec.firstEver, startOfDay(at).getTime());
            if (at < first || at >= addDays(today, 1)) continue;
            const key = toDayKey(at);
            const d = rec.days.get(key) ?? { count: 0, mg: 0 };
            d.count += 1;
            d.mg += e.doseMG;
            rec.days.set(key, d);
        }

        const out: {
            ester: Ester;
            rows: { label: string; cells: { key: string; date: Date; state: CellState; log: DayLog | null }[] }[];
            logged: number;
            elapsed: number;
            missed: Date[];
        }[] = [];

        for (const [ester, rec] of byEster) {
            if (rec.days.size === 0) continue;   // nothing in the last four weeks
            let logged = 0;
            let elapsed = 0;
            const missed: Date[] = [];
            const rows = Array.from({ length: WEEKS_GRID }, (_, r) => {
                const rowStart = addDays(first, r * 7);
                const cells = Array.from({ length: 7 }, (_, c) => {
                    const date = addDays(rowStart, c);
                    const key = toDayKey(date);
                    const log = rec.days.get(key) ?? null;
                    const isToday = date.getTime() === today.getTime();
                    let state: CellState;
                    if (log) state = 'taken';
                    else if (date > today || isToday) state = 'future';
                    else if (date.getTime() < rec.firstEver) state = 'empty';
                    else state = 'missed';
                    if (state === 'taken') { logged++; elapsed++; }
                    if (state === 'missed') { elapsed++; missed.push(date); }
                    return { key, date, state, log };
                });
                return { label: fmtShort.format(rowStart), cells };
            });
            out.push({ ester, rows, logged, elapsed, missed });
        }
        // Estradiol first, then the rest in a stable order.
        return out.sort((a, b) => (a.ester === Ester.CPA ? 1 : 0) - (b.ester === Ester.CPA ? 1 : 0) || a.ester.localeCompare(b.ester));
    }, [events, today, fmtShort]);

    const weekdayHeaders = useMemo(
        () => Array.from({ length: 7 }, (_, i) => fmtWeekday.format(new Date(2024, 0, 1 + i))), // 2024-01-01 was a Monday
        [fmtWeekday],
    );

    // A tap outside the grids clears the readout.
    useEffect(() => {
        if (!picked) return;
        const clear = (e: PointerEvent) => {
            if (!(e.target as Element | null)?.closest?.('[data-rhythm-cell]')) setPicked(null);
        };
        window.addEventListener('pointerdown', clear, true);
        return () => window.removeEventListener('pointerdown', clear, true);
    }, [picked]);

    if (!strip.any && grids.length === 0) {
        return (
            <div className={className}>
                <p className="m-0 text-sm text-[var(--c-muted)]">{t('timeline.rhythm.empty')}</p>
            </div>
        );
    }

    const heading = 'm-0 text-base font-semibold text-[var(--c-ink)]';
    const sentence = 'm-0 text-sm text-[var(--c-ink)]';
    const readout = 'm-0 text-sm tabular-nums text-[var(--c-muted)]';
    // Each medicine is one block of the card, split by a hairline.
    const block = 'flex flex-col gap-3 border-t border-[var(--c-hairline)] px-4 py-4 first:border-t-0';

    // Readout for the injection strip.
    const pickedWeek = picked?.group === 'inj' ? strip.weeks.find(w => w.key === picked.key) : null;
    const weekText = (w: typeof strip.weeks[number]) =>
        `${fmtShort.format(w.start)} – ${fmtShort.format(w.end)}: ${doseLabel(w.count)}${w.mg > 0 ? `, ${mgLabel(w.mg)}` : ''}`;

    const injSummary = t('timeline.rhythm.weeks_logged')
        .replace('{k}', String(strip.logged))
        .replace('{n}', String(WEEKS_STRIP));

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <div className="overflow-hidden rounded-[14px] border border-[var(--c-hairline)] bg-[var(--c-surface)]">
                {strip.any && (
                    <div className={block}>
                        <p className={heading}>{t('timeline.rhythm.injections').replace('{n}', String(WEEKS_STRIP))}</p>
                        <div className="flex w-full max-w-[342px] flex-col gap-1">
                            <div role="group" aria-label={injSummary} className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-[6px]">
                                {strip.weeks.map(w => {
                                    const isFuture = w.start > today;
                                    // A week with no shot reads "not logged", as the key says; it is not
                                    // called missed, since a shot every two weeks leaves such weeks.
                                    const state: CellState = w.count > 0 ? 'taken' : isFuture ? 'future' : 'missed';
                                    const on = picked?.group === 'inj' && picked.key === w.key;
                                    return (
                                        <button
                                            key={w.key}
                                            type="button"
                                            data-rhythm-cell
                                            aria-label={weekText(w)}
                                            aria-pressed={on}
                                            onClick={() => setPicked(on ? null : { group: 'inj', key: w.key })}
                                            className="block aspect-square w-full max-w-5 rounded-[4px] p-0"
                                            style={{
                                                ...cellStyle(state, toneOf(strip.ester)),
                                                outline: on ? '2px solid var(--c-ink)' : undefined,
                                                outlineOffset: on ? 1 : undefined,
                                            }}
                                        />
                                    );
                                })}
                            </div>
                            <div aria-hidden="true" className="flex justify-between gap-3 text-xs font-medium text-[var(--c-muted)]">
                                <span>{fmtShort.format(strip.weeks[0].start)}</span>
                                <span>{fmtShort.format(today)}</span>
                            </div>
                        </div>
                        <p className={sentence}>{injSummary}</p>
                        {pickedWeek && <p className={readout} role="status">{weekText(pickedWeek)}</p>}
                    </div>
                )}

                {grids.map(g => {
                    const name = t(`timeline.name.${g.ester}`);
                    const tone = toneOf(g.ester);
                    const summary = t('timeline.rhythm.days_logged')
                        .replace('{k}', String(g.logged))
                        .replace('{n}', String(g.elapsed));
                    const recentMissed = g.missed.slice(-3).map(d => fmtDay.format(d));
                    const pickedCell = picked?.group === g.ester
                        ? g.rows.flatMap(r => r.cells).find(c => c.key === picked.key) ?? null
                        : null;
                    const cellText = (c: { date: Date; log: DayLog | null }) =>
                        `${fmtDay.format(c.date)}: ${c.log ? `${doseLabel(c.log.count)}, ${mgLabel(c.log.mg)}` : t('heatmap.none')}`;
                    return (
                        <div key={g.ester} className={block}>
                            <p className={heading}>
                                {t('timeline.rhythm.daily').replace('{name}', name).replace('{n}', String(WEEKS_GRID))}
                            </p>
                            <div
                                role="group"
                                aria-label={`${name}. ${summary}`}
                                className="grid w-full max-w-[342px] grid-cols-[48px_repeat(7,minmax(0,1fr))] items-center gap-[6px]"
                            >
                                <span aria-hidden="true" />
                                {weekdayHeaders.map(w => (
                                    <span key={w} aria-hidden="true" className="truncate text-center text-xs font-medium text-[var(--c-muted)]">{w}</span>
                                ))}
                                {g.rows.map(row => (
                                    <div key={row.label} className="contents">
                                        <span aria-hidden="true" className="whitespace-nowrap text-xs font-medium text-[var(--c-muted)]">{row.label}</span>
                                        {row.cells.map(c => {
                                            const on = picked?.group === g.ester && picked.key === c.key;
                                            const isTonight = c.state === 'future' && c.date.getTime() === today.getTime();
                                            const style = isTonight
                                                ? { border: `1.5px dashed ${tone}`, background: 'transparent' }
                                                : cellStyle(c.state, tone);
                                            return (
                                                <button
                                                    key={c.key}
                                                    type="button"
                                                    data-rhythm-cell
                                                    aria-label={cellText(c)}
                                                    aria-pressed={on}
                                                    onClick={() => setPicked(on ? null : { group: g.ester, key: c.key })}
                                                    className="block h-6 w-full rounded-[4px] p-0"
                                                    style={{
                                                        ...style,
                                                        outline: on ? '2px solid var(--c-ink)' : undefined,
                                                        outlineOffset: on ? 1 : undefined,
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                            <p className={sentence}>
                                {summary}
                                {recentMissed.length > 0 && (
                                    <> {t('timeline.rhythm.missed').replace('{days}', joinDays(lang, recentMissed))}</>
                                )}
                            </p>
                            {pickedCell && <p className={readout} role="status">{cellText(pickedCell)}</p>}
                        </div>
                    );
                })}

                {/* Key: the three kinds of square, drawn, then their words. */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-[var(--c-hairline)] px-4 py-3 text-sm text-[var(--c-muted)]">
                    {(['taken', 'missed', 'future'] as const).map(state => (
                        <span key={state} className="inline-flex items-center gap-2">
                            <span
                                aria-hidden="true"
                                className="inline-block h-3.5 w-3.5 rounded-[4px]"
                                style={cellStyle(state, 'var(--c-accent)')}
                            />
                            {t(`timeline.rhythm.key.${state}`)}
                        </span>
                    ))}
                </div>
            </div>
            <p className="list-group-footer !pt-0">{t('timeline.rhythm.tap_hint')}</p>
        </div>
    );
};

export default DoseHeatmap;
