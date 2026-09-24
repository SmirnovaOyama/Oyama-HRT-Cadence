import type { Schedule } from '../types/routine';
import { nextOccurrences, type DueItem, type ReminderState } from './reminders';

const MS_MIN = 60_000;
/** Re-check after sleep or a changed device clock at least this often. */
export const MAX_REMINDER_SLEEP_MS = 15 * MS_MIN;

/** Earliest absolute time at which the due list or a notification can change. */
export function nextReminderWake(
    schedules: Schedule[], due: DueItem[], state: ReminderState,
    notified: Record<string, number>, nowMs: number,
): number {
    let wake = nowMs + MAX_REMINDER_SLEEP_MS;
    for (const s of schedules) {
        if (!s.active || !s.remind.enabled) continue;
        const lead = Math.max(0, s.remind.leadMin) * MS_MIN;
        const occ = nextOccurrences(s, nowMs + lead + 1, 1)[0];
        if (occ !== undefined) wake = Math.min(wake, occ - lead);
    }
    for (const until of Object.values(state.snoozed)) if (until > nowMs) wake = Math.min(wake, until);
    for (const d of due) {
        const r = d.schedule.remind.repeatAfterMin;
        if (r && r > 0 && (notified[d.key] ?? 0) < 2) {
            const nudge = d.occurrenceMs + r * MS_MIN;
            if (nudge > nowMs) wake = Math.min(wake, nudge);
        }
    }
    return Math.max(wake, nowMs + 1000);
}

/** Convert a deadline to a timer delay using the clock when the timer is
 *  armed, never the cached clock from an earlier render. */
export function reminderTimerDelay(wakeMs: number, currentMs = Date.now()): number {
    return Math.max(0, Math.min(wakeMs - currentMs, MAX_REMINDER_SLEEP_MS));
}
