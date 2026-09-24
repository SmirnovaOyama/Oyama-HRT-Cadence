import { at, schedule } from './fixtures';
import { describe, expect, test } from 'bun:test';
import { dueItems, emptyReminderState, occurrenceKey } from '../src/utils/reminders';
import { MAX_REMINDER_SLEEP_MS, nextReminderWake, reminderTimerDelay } from '../src/utils/reminderClock';

describe('reminder timers use the clock when armed', () => {
    test('changing a schedule between ticks does not add the elapsed time again', () => {
        const observedAt = at(2026, 9, 24, 8);
        const changedAt = at(2026, 9, 24, 8, 10);
        const s = schedule({ createdAt: changedAt, cadence: { kind: 'daily', times: [491] } });
        const state = emptyReminderState();
        const deadline = nextReminderWake([s], dueItems([s], [], observedAt, state), state, {}, observedAt);
        const originalNow = Date.now;
        try {
            Date.now = () => changedAt;
            expect(deadline).toBe(at(2026, 9, 24, 8, 11));
            expect(reminderTimerDelay(deadline)).toBe(60_000);
            // A later render may arm the same deadline again; it stays fixed.
            Date.now = () => changedAt + 30_000;
            expect(reminderTimerDelay(deadline)).toBe(30_000);
        } finally {
            Date.now = originalNow;
        }
    });

    test('past deadlines refresh immediately and long waits stay bounded', () => {
        const now = at(2026, 9, 24, 8, 12);
        expect(reminderTimerDelay(at(2026, 9, 24, 8, 11), now)).toBe(0);
        expect(reminderTimerDelay(at(2026, 9, 25), now)).toBe(MAX_REMINDER_SLEEP_MS);
    });

    test('snooze expiry and repeat nudges use their absolute deadlines', () => {
        const now = at(2026, 9, 24, 8, 10);
        const s = schedule({ cadence: { kind: 'daily', times: [480] }, remind: { enabled: true, leadMin: 0, repeatAfterMin: 15 } });
        const key = occurrenceKey(s.id, at(2026, 9, 24, 8));
        const state = emptyReminderState();
        const wake = nextReminderWake([s], dueItems([s], [], now), state, { [key]: 1 }, now);
        expect(reminderTimerDelay(wake, now)).toBe(5 * 60_000);
        const snoozed = { ...state, snoozed: { [key]: now + 2 * 60_000 } };
        const snoozeWake = nextReminderWake([s], dueItems([s], [], now, snoozed), snoozed, {}, now);
        expect(reminderTimerDelay(snoozeWake, now)).toBe(2 * 60_000);
    });
});
