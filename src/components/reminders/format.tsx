// Wording and tiles for schedules: "Cyproterone acetate 12.5 mg", "Every day at
// 21:00", "Every Monday at 09:00". Strings come from
// src/i18n/cadence/reminders.ts and today.ts.

import React from 'react';
import type { DoseEvent } from '../../../logic';
import type { Lang } from '../../i18n/translations';
import type { Schedule } from '../../types/routine';
import { intervalDays, nextOccurrences, scheduleTimes } from '../../utils/reminders';
import { routeFamily, startOfLocalDay, atTimeOfDay } from '../../utils/schedule';
import { IconTile, ROUTE_ICON, tileKind } from '../today/ComingUp';
import { T, doseText, fmt, formatTime, localeFor, medShort, weekdayLong } from '../today/format';
import { Tablet } from '../icons';

/** The schedule's dose shaped like a logged dose, for the shared wording helpers. */
export function scheduleAsDose(s: Schedule): DoseEvent {
    return { id: `schedule-${s.id}`, route: s.route, ester: s.ester, doseMG: s.doseMG, timeH: s.createdAt / 3_600_000, extras: { ...s.extras } };
}

/** "Cyproterone 12.5 mg": one-line row title, with the short name where one exists. */
export function scheduleTitle(s: Schedule, t: T): string {
    return `${medShort(s.ester, t)} ${doseText(scheduleAsDose(s))}`;
}

/** Minutes after midnight as a 24-hour clock ("21:00"). */
export function minutesText(min: number, lang: Lang): string {
    return formatTime(atTimeOfDay(startOfLocalDay(Date.now()), min), lang);
}

/** "Sep 26" */
function shortDay(ms: number, lang: Lang): string {
    return new Intl.DateTimeFormat(localeFor(lang), { month: 'short', day: 'numeric' }).format(ms);
}

/** "Every day at 21:00", "Every Monday at 09:00" or "Every 10 days, next Sep 26":
 *  short enough for a one-line sub-line beside a switch at 375px. */
export function scheduleSub(s: Schedule, nowMs: number, lang: Lang, t: T): string {
    const times = scheduleTimes(s).map(m => minutesText(m, lang));
    const n = intervalDays(s);
    if (s.cadence.kind === 'daily' || n <= 1) {
        return fmt(t('reminders.cadence.daily'), { times: times.join(t('reminders.time_sep')) });
    }
    const next = nextOccurrences(s, nowMs, 1)[0];
    if (n === 7 && next !== undefined) {
        return fmt(t('reminders.cadence.weekly'), { weekday: weekdayLong(next, lang), time: times[0] ?? '' });
    }
    if (next === undefined) return fmt(t('reminders.cadence.every'), { n, time: times[0] ?? '' });
    return fmt(t('reminders.cadence.every_next'), { n, date: shortDay(next, lang) });
}

/** 40px medicine tile for a schedule, coloured like Today's rows. */
export function ScheduleTile({ schedule, isTransmasc }: { schedule: Pick<Schedule, 'route' | 'ester'>; isTransmasc: boolean }): React.ReactElement {
    const family = routeFamily(schedule.route);
    return <IconTile kind={tileKind(schedule.ester, isTransmasc)} icon={family ? ROUTE_ICON[family] : Tablet} />;
}
