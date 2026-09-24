// Calendar export (RFC 5545) of planned schedules, so the phone calendar can
// remind when the app is closed. One repeating VEVENT per schedule time, with a
// display alarm `leadMin` minutes before. Pure string building, no I/O.

import type { Schedule } from '../types/routine';
import { formatLocalDate, intervalDays, parseLocalDate, scheduleTimes } from './reminders';
import { startOfLocalDay } from './schedule';

const CRLF = '\r\n';

export interface CalendarOptions {
    /** Event summary for a schedule (already localised). */
    title: (s: Schedule) => string;
    description?: (s: Schedule) => string;
    /** X-WR-CALNAME, shown by some calendar apps. */
    calendarName?: string;
    /** DTSTAMP time, epoch ms (defaults to now). */
    nowMs?: number;
    /** Minutes each event lasts (default 15). */
    durationMin?: number;
}

/** Escapes a TEXT value (RFC 5545 3.3.11). */
export function escapeText(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r\n|\r|\n/g, '\\n');
}

const utf8Len = (ch: string): number => {
    const cp = ch.codePointAt(0) ?? 0;
    return cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
};

/**
 * Folds one content line to at most 75 octets per physical line (RFC 5545 3.1),
 * never splitting a UTF-8 character; continuation lines start with one space.
 */
export function foldLine(line: string): string {
    const out: string[] = [];
    let cur = '';
    let len = 0;
    for (const ch of line) {
        const n = utf8Len(ch);
        const limit = out.length === 0 ? 75 : 74; // the leading space is one octet
        if (len + n > limit) {
            out.push(cur);
            cur = '';
            len = 0;
        }
        cur += ch;
        len += n;
    }
    out.push(cur);
    return out.join(CRLF + ' ');
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** UTC timestamp, e.g. 20260924T081500Z. */
export function formatUtc(ms: number): string {
    const d = new Date(ms);
    return `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** Local wall time, e.g. 20260924T080000, from a YYYY-MM-DD and minutes. */
export function formatLocalDateTime(ymd: string, minutes: number): string {
    const [year, month, day] = ymd.split('-');
    return `${year.padStart(4, '0')}${month}${day}T${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}00`;
}

const duration = (min: number): string => `PT${Math.max(0, Math.round(min))}M`;

/** Date (YYYY-MM-DD) of the first occurrence day the event series starts on. */
function seriesStart(s: Schedule): string {
    if (s.cadence.kind === 'every') return formatLocalDate(parseLocalDate(s.cadence.anchorDate));
    return formatLocalDate(startOfLocalDay(s.createdAt));
}

/** Stable UID for one schedule time. */
export function eventUid(s: Schedule, minutes: number): string {
    return `${s.id}-${pad(Math.floor(minutes / 60))}${pad(minutes % 60)}@cadence`;
}

/**
 * VCALENDAR for active schedules, with CRLF line endings and folded lines.
 * Times are floating local time (RFC 5545 3.3.5), matching reminders in the app:
 * 08:00 stays 08:00 across daylight-saving changes and when travelling.
 * Do not add TZID without a VTIMEZONE that covers every recurring occurrence.
 */
export function buildCalendar(schedules: Schedule[], opts: CalendarOptions): string {
    const stamp = formatUtc(opts.nowMs ?? Date.now());
    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Oyama HRT Cadence//Reminders//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
    ];
    if (opts.calendarName) lines.push(`X-WR-CALNAME:${escapeText(opts.calendarName)}`);

    for (const s of schedules) {
        if (!s.active) continue;
        const n = intervalDays(s);
        const rrule = n === 1 ? 'RRULE:FREQ=DAILY' : `RRULE:FREQ=DAILY;INTERVAL=${n}`;
        const start = seriesStart(s);
        const summary = escapeText(opts.title(s));
        const description = opts.description ? escapeText(opts.description(s)) : null;
        for (const t of scheduleTimes(s)) {
            const local = formatLocalDateTime(start, t);
            lines.push(
                'BEGIN:VEVENT',
                `UID:${eventUid(s, t)}`,
                `DTSTAMP:${stamp}`,
                `DTSTART:${local}`,
                `DURATION:${duration(opts.durationMin ?? 15)}`,
                rrule,
                `SUMMARY:${summary}`,
            );
            if (description) lines.push(`DESCRIPTION:${description}`);
            lines.push('TRANSP:TRANSPARENT');
            if (s.remind.enabled) {
                const lead = Math.max(0, Math.round(s.remind.leadMin));
                lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${summary}`, `TRIGGER:-${duration(lead)}`);
                if (s.remind.repeatAfterMin && s.remind.repeatAfterMin > 0) {
                    lines.push('REPEAT:2', `DURATION:${duration(s.remind.repeatAfterMin)}`);
                }
                lines.push('END:VALARM');
            }
            lines.push('END:VEVENT');
        }
    }
    lines.push('END:VCALENDAR');
    return lines.map(foldLine).join(CRLF) + CRLF;
}
