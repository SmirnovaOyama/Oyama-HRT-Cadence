import { Route, ExtraKey } from '../../../logic';
import type { Lang } from '../../i18n/translations';
import { joinList } from '../../i18n/listSeparator';
import { Regimen, calendarDaysBetween } from '../../utils/schedule';
import { DoseShape, capitalizeFirst, formatShortDay, formatTime } from './shared';

/* The person's own routines at the top of the Log sheet's "What" list. The
   regimens themselves come from src/utils/schedule.ts (read-only here). */

type T = (key: string) => string;

/** A dose counts as due from half an hour before its time. */
const DUE_SOON_MS = 30 * 60_000;
const EVENING_HOUR = 18;

export const isDue = (regimen: Regimen, nowMs: number): boolean => regimen.nextDueMs <= nowMs + DUE_SOON_MS;

/** Same medicine, route and amount (and patch release rate). Gels and patches
 *  always store the plain hormone, so their ester is not compared. */
export const sameDose = (a: DoseShape, b: DoseShape): boolean => {
    if (a.route !== b.route) return false;
    const plainRoute = a.route === Route.gel || a.route === Route.patchApply;
    if (!plainRoute && a.ester !== b.ester) return false;
    const rateA = a.extras?.[ExtraKey.releaseRateUGPerDay] ?? 0;
    const rateB = b.extras?.[ExtraKey.releaseRateUGPerDay] ?? 0;
    if (Math.abs(rateA - rateB) > 1e-6) return false;
    if (rateA > 0) return true;
    return Math.abs(a.doseMG - b.doseMG) < 1e-6;
};

/** "Weekly", "Daily", "Every 10 days". The route is in the row's tile and
 *  title, so the sub-line only says how often. */
export const regimenCadence = (t: T, lang: Lang, regimen: Regimen): string => {
    const key = regimen.kind === 'daily'
        ? 'log.reg.daily'
        : regimen.kind === 'cycle'
            ? (regimen.cycleDays === 7 ? 'log.reg.weekly' : 'log.reg.every_days')
            : 'log.reg.every_hours';
    const n = regimen.kind === 'cycle' ? regimen.cycleDays : Math.round(regimen.intervalH);
    return capitalizeFirst(lang, t(key).replace('{n}', String(n)));
};

/** "due now", "due since Mon", "next tonight at 21:00", "next Sat at 09:00". */
export const regimenWhen = (t: T, lang: Lang, regimen: Regimen, nowMs: number): string => {
    const due = regimen.nextDueMs;
    const time = formatTime(lang, new Date(due));
    if (due <= nowMs) {
        return calendarDaysBetween(due, nowMs) >= 1
            ? t('log.reg_when.due_since').replace('{day}', formatShortDay(lang, due, nowMs))
            : t('log.reg_when.due_now');
    }
    if (due <= nowMs + DUE_SOON_MS) return t('log.reg_when.due_now');
    const days = calendarDaysBetween(nowMs, due);
    if (days === 0) {
        return t(new Date(due).getHours() >= EVENING_HOUR ? 'log.reg_when.tonight' : 'log.reg_when.today').replace('{time}', time);
    }
    if (days === 1) return t('log.reg_when.tomorrow').replace('{time}', time);
    return t('log.reg_when.day').replace('{day}', formatShortDay(lang, due, nowMs)).replace('{time}', time);
};

/** The row's one sub-line, state only: "Weekly, due now",
 *  "Daily, next tonight at 21:00". */
export const regimenSub = (t: T, lang: Lang, regimen: Regimen, nowMs: number): string =>
    joinList(lang, [regimenCadence(t, lang, regimen), regimenWhen(t, lang, regimen, nowMs)]);
