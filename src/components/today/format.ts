// Wording helpers for Today: dates, times, relative times and medicine names in
// the reader's language. Strings come from src/i18n/cadence/today.ts; dates and
// "in 7 hours" come from Intl so every language gets its own grammar.

import { DoseEvent, Ester, ExtraKey } from '../../../logic';
import type { Lang } from '../../i18n/translations';
import { RouteFamily, calendarDaysBetween } from '../../utils/schedule';

export type T = (key: string) => string;

const LOCALE: Record<Lang, string> = {
    zh: 'zh-CN',
    'zh-TW': 'zh-TW',
    yue: 'zh-HK',
    en: 'en-US',
    ja: 'ja-JP',
    ko: 'ko-KR',
    tr: 'tr-TR',
};

export const localeFor = (lang: Lang): string => LOCALE[lang] ?? 'en-US';

/** Fills {name} placeholders. */
export function fmt(template: string, vars: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** 24-hour clock, as on the boards ("21:00"). */
export function formatTime(ms: number, lang: Lang): string {
    return new Intl.DateTimeFormat(localeFor(lang), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms);
}

export function weekdayShort(ms: number, lang: Lang): string {
    return new Intl.DateTimeFormat(localeFor(lang), { weekday: 'short' }).format(ms);
}

export function weekdayLong(ms: number, lang: Lang): string {
    return new Intl.DateTimeFormat(localeFor(lang), { weekday: 'long' }).format(ms);
}

/** "Wed, Sep 23" */
export function shortDateTitle(ms: number, lang: Lang): string {
    return new Intl.DateTimeFormat(localeFor(lang), { weekday: 'short', month: 'short', day: 'numeric' }).format(ms);
}

/** "Wednesday, September 23" */
export function longDateTitle(ms: number, lang: Lang): string {
    return new Intl.DateTimeFormat(localeFor(lang), { weekday: 'long', month: 'long', day: 'numeric' }).format(ms);
}

/** "Sat Sep 26" */
function dayWithDate(ms: number, lang: Lang): string {
    return new Intl.DateTimeFormat(localeFor(lang), { weekday: 'short', month: 'short', day: 'numeric' }).format(ms);
}

/** "Sat 09:12" within the last or next 6 days, else "Sat Sep 12, 09:12". */
export function dayAndTime(ms: number, nowMs: number, lang: Lang): string {
    const days = Math.abs(calendarDaysBetween(nowMs, ms));
    const day = days <= 6 ? weekdayShort(ms, lang) : dayWithDate(ms, lang);
    return `${day} ${formatTime(ms, lang)}`;
}

const EVENING_HOUR = 18;

/** Inline phrase for "Next: ..., {when}": "tonight at 21:00", "tomorrow at 09:00", "Sat at 09:00". */
export function whenInline(ms: number, nowMs: number, lang: Lang, t: T): string {
    const time = formatTime(ms, lang);
    if (ms <= nowMs) return t('today.when.due_now');
    const days = calendarDaysBetween(nowMs, ms);
    if (days === 0) {
        return fmt(t(new Date(ms).getHours() >= EVENING_HOUR ? 'today.when.tonight_at' : 'today.when.today_at'), { time });
    }
    if (days === 1) return fmt(t('today.when.tomorrow_at'), { time });
    const day = days <= 6 ? weekdayShort(ms, lang) : dayWithDate(ms, lang);
    return fmt(t('today.when.day_at'), { day, time });
}

/** Row sub-line start: "Tonight, 21:00", "Tomorrow, 09:00", "Sat Sep 26, 09:00". */
export function whenRow(ms: number, nowMs: number, lang: Lang, t: T): string {
    const time = formatTime(ms, lang);
    const days = calendarDaysBetween(nowMs, ms);
    if (days === 0) {
        return fmt(t(new Date(ms).getHours() >= EVENING_HOUR ? 'today.row.tonight' : 'today.row.today'), { time });
    }
    if (days === 1) return fmt(t('today.row.tomorrow'), { time });
    if (days === -1) return fmt(t('today.row.yesterday'), { time });
    return fmt(t('today.row.day'), { day: dayWithDate(ms, lang), time });
}

/** "in 7 hours", "in 2 days", "4 minutes ago" (Intl.RelativeTimeFormat). */
export function relativeTime(ms: number, nowMs: number, lang: Lang): string {
    const rtf = new Intl.RelativeTimeFormat(localeFor(lang), { numeric: 'always' });
    const diffMin = Math.round((ms - nowMs) / 60000);
    const abs = Math.abs(diffMin);
    if (abs < 60) return rtf.format(diffMin === 0 ? 0 : diffMin, 'minute');
    if (abs < 36 * 60) return rtf.format(Math.round(diffMin / 60), 'hour');
    const days = calendarDaysBetween(nowMs, ms);
    return rtf.format(days, 'day');
}

/** Full medicine name, sentence case ("Cyproterone acetate"). */
export function medName(ester: Ester, t: T): string {
    return t(`today.med.${ester}`);
}

/** Names short enough for a one-line list row. Only cyproterone acetate has a
 *  common short form ("Cyproterone"); the esters of estradiol and testosterone
 *  are what tells two medicines apart, so they keep their full names. */
const SHORT_NAMED = new Set<Ester>([Ester.CPA]);

/** The name as a list row title uses it ("Cyproterone"). */
export function medShort(ester: Ester, t: T): string {
    return SHORT_NAMED.has(ester) ? t(`today.med_short.${ester}`) : medName(ester, t);
}

/** The same name mid-sentence: lower-cased where the language has case. */
export function medInline(ester: Ester, t: T, lang: Lang): string {
    const name = medName(ester, t);
    return lang === 'en' || lang === 'tr' ? name.toLocaleLowerCase(localeFor(lang)) : name;
}

/** Lower-case a label mid-sentence where the language has case. */
export function inline(text: string, lang: Lang): string {
    return lang === 'en' || lang === 'tr' ? text.toLocaleLowerCase(localeFor(lang)) : text;
}

const trimNumber = (n: number): string => {
    if (!Number.isFinite(n)) return '0';
    const r = Math.round(n * 100) / 100;
    return String(r);
};

/** "12.5 mg", or "100 µg/day" for a patch logged by release rate. */
export function doseText(event: DoseEvent): string {
    const rate = event.extras?.[ExtraKey.releaseRateUGPerDay];
    if (typeof rate === 'number' && rate > 0 && !(event.doseMG > 0)) return `${trimNumber(rate)} µg/day`;
    return `${trimNumber(event.doseMG)} mg`;
}

export function routeNoun(family: RouteFamily, t: T): string {
    return t(`today.route.${family}`);
}
