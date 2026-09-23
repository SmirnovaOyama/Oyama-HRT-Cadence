import React from 'react';
import { Route, Ester, ExtraKey } from '../../../logic';
import { Injection, Tablet, Sublingual, Gel, Patch } from '../icons';
import type { Lang } from '../../i18n/translations';
import { joinList } from '../../i18n/listSeparator';
import { LOCALE_MAP } from '../../utils/helpers';

/* Pieces shared by the Log a dose sheet (DoseForm) and its per-route fields. */

type T = (key: string) => string;

/** Number for display: at most 3 decimals, no trailing zeros ("4", "3.05"). */
export const formatAmount = (val: number): string => {
    if (!Number.isFinite(val)) return '';
    return String(parseFloat(val.toFixed(3)));
};

/** Same, for a value that is already a string (as the form keeps them). */
export const trimAmount = (val: string): string => {
    const n = parseFloat(val);
    return Number.isFinite(n) ? formatAmount(n) : val;
};

/** Short "about" figure for notes: 2 decimals under 10, 1 above. */
export const formatApprox = (val: number): string => {
    if (!Number.isFinite(val)) return '';
    return String(parseFloat(val < 10 ? val.toFixed(2) : val.toFixed(1)));
};

const ROUTE_ICON: Record<Route, React.ComponentType<{ size?: number }>> = {
    [Route.injection]: Injection,
    [Route.oral]: Tablet,
    [Route.sublingual]: Sublingual,
    [Route.gel]: Gel,
    [Route.patchApply]: Patch,
    [Route.patchRemove]: Patch,
};

export const RouteIcon: React.FC<{ route: Route; size?: number }> = ({ route, size = 20 }) => {
    const Icon = ROUTE_ICON[route] ?? Injection;
    return <Icon size={size} />;
};

/** 40px icon tile for list rows: hormones in the accent tint, the
 *  anti-androgen in the second (purple) tint, like the board. */
export const RouteTile: React.FC<{ route: Route; ester?: Ester; neutral?: boolean; children?: React.ReactNode }> = ({
    route,
    ester,
    neutral,
    children,
}) => {
    const tone = neutral
        ? 'bg-[var(--c-plate)] text-[var(--c-muted)]'
        : ester === Ester.CPA
            ? 'bg-[var(--c-second-tint)] text-[var(--c-second)]'
            : 'bg-[var(--c-accent-container)] text-[var(--c-accent)]';
    return (
        <span aria-hidden="true" className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${tone}`}>
            {children ?? <RouteIcon route={route} />}
        </span>
    );
};

/** Inset separator between hand-built list rows (ListGroup adds its own). */
export const ListSep: React.FC<{ icon?: boolean }> = ({ icon }) => (
    <div role="presentation" aria-hidden="true" className={icon ? 'list-sep list-sep-icon' : 'list-sep'} />
);

/** Section heading above a group, 15/20 600 muted (the list-group-header). */
export const GroupHeader: React.FC<{ id?: string; children: React.ReactNode; trailing?: React.ReactNode }> = ({
    id,
    children,
    trailing,
}) =>
    trailing ? (
        <div className="mb-2 flex min-h-11 items-center justify-between gap-3 pl-4">
            <span id={id} className="text-sm font-semibold leading-5 text-[var(--c-muted)]">{children}</span>
            {trailing}
        </div>
    ) : (
        <div id={id} className="list-group-header">{children}</div>
    );

export const esterName = (t: T, ester: Ester): string => t(`log.ester.${ester}`);
export const routeName = (t: T, route: Route): string => t(`log.route.${route}`);

const localeOf = (lang: Lang): string => LOCALE_MAP[lang] || 'en-US';

/** Lower-case a name for use mid-sentence ("estradiol valerate"). Harmless
 *  for scripts without case. */
export const midSentence = (lang: Lang, s: string): string => s.toLocaleLowerCase(localeOf(lang));

export interface DoseShape {
    route: Route;
    ester: Ester;
    doseMG: number;
    extras?: Partial<Record<ExtraKey, number>>;
}

/** "Estradiol valerate 4 mg, injection" (or the mid-sentence form). */
export const describeDose = (t: T, lang: Lang, dose: DoseShape, opts: { lower?: boolean; unitRate?: string } = {}): string => {
    const lower = (s: string) => midSentence(lang, s);
    const route = lower(routeName(t, dose.route));
    if (dose.route === Route.patchRemove) {
        return opts.lower ? route : routeName(t, dose.route);
    }
    const rate = dose.extras?.[ExtraKey.releaseRateUGPerDay];
    if (dose.route === Route.patchApply && typeof rate === 'number' && rate > 0) {
        const head = routeName(t, dose.route);
        return joinList(lang, [opts.lower ? lower(head) : head, `${formatAmount(rate)}\u00a0${opts.unitRate ?? 'µg/d'}`]);
    }
    if (dose.route === Route.patchApply && !(dose.doseMG > 0)) {
        return opts.lower ? route : routeName(t, dose.route);
    }
    const name = esterName(t, dose.ester);
    const amount = dose.doseMG > 0 ? ` ${formatAmount(dose.doseMG)}\u00a0mg` : '';
    const first = `${opts.lower ? lower(name) : name}${amount}`;
    return joinList(lang, [first, route]);
};

/** "Sat, Sep 26 at 09:04", with the year when it is not this year. */
export const describeWhen = (t: T, lang: Lang, date: Date): string => {
    const locale = localeOf(lang);
    const sameYear = date.getFullYear() === new Date().getFullYear();
    const day = date.toLocaleDateString(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        ...(sameYear ? {} : { year: 'numeric' }),
    });
    const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
    return t('log.when_at').replace('{date}', day).replace('{time}', time);
};

export const formatTime = (lang: Lang, date: Date): string =>
    date.toLocaleTimeString(localeOf(lang), { hour: '2-digit', minute: '2-digit', hour12: false });

/** "Saturday, September 26" (plus the year when it is not this year). */
export const formatLongDate = (lang: Lang, date: Date): string => {
    const sameYear = date.getFullYear() === new Date().getFullYear();
    return date.toLocaleDateString(localeOf(lang), {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        ...(sameYear ? {} : { year: 'numeric' }),
    });
};

/** Medicine and amount, without the route: "Estradiol valerate 4 mg",
 *  "Estradiol 50 µg/day". The route shows in the tile and the sub-line. */
export const describeAmount = (t: T, dose: DoseShape, opts: { unitRate?: string } = {}): string => {
    const name = esterName(t, dose.ester);
    if (dose.route === Route.patchRemove) return routeName(t, dose.route);
    const rate = dose.extras?.[ExtraKey.releaseRateUGPerDay];
    if (dose.route === Route.patchApply && typeof rate === 'number' && rate > 0) {
        return `${name} ${formatAmount(rate)} ${opts.unitRate ?? 'µg/d'}`;
    }
    return dose.doseMG > 0 ? `${name} ${formatAmount(dose.doseMG)} mg` : name;
};

/** Upper-cases the first letter where the language has case ("Pill under the tongue every 2 days"). */
export const capitalizeFirst = (lang: Lang, s: string): string =>
    s ? s.charAt(0).toLocaleUpperCase(localeOf(lang)) + s.slice(1) : s;

/** "3 days ago", "in 2 hours" (Intl, in the reader's language). */
export const formatRelative = (lang: Lang, ms: number, nowMs: number): string => {
    const rtf = new Intl.RelativeTimeFormat(localeOf(lang), { numeric: 'auto' });
    const diffMin = Math.round((ms - nowMs) / 60000);
    const abs = Math.abs(diffMin);
    if (abs < 60) return rtf.format(diffMin, 'minute');
    if (abs < 24 * 60) return rtf.format(Math.round(diffMin / 60), 'hour');
    return rtf.format(Math.round(diffMin / 1440), 'day');
};

/** Short weekday within the coming or past 6 days, else "Oct 3". */
export const formatShortDay = (lang: Lang, ms: number, nowMs: number): string => {
    const days = Math.abs(Math.round((ms - nowMs) / 86_400_000));
    return new Date(ms).toLocaleDateString(
        localeOf(lang),
        days <= 6 ? { weekday: 'short' } : { month: 'short', day: 'numeric' },
    );
};
