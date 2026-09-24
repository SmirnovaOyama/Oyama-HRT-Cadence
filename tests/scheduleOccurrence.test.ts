import { at, dose, schedule } from './fixtures';
import { describe, expect, test } from 'bun:test';
import { Route } from '../logic';
import { assignScheduleEvents, dueItems, isSatisfied } from '../src/utils/reminders';
import { sanitizeScheduleOccurrence } from '../src/utils/scheduleOccurrence';
import { normalizeSyncState, mergeSyncStates } from '../src/utils/syncMerge';

describe('logs explicitly made from a reminder', () => {
    test('a late actual log completes that slot and survives a backup round trip', () => {
        const s = schedule({ cadence: { kind: 'daily', times: [480] } });
        const now = at(2026, 9, 24, 21);
        const slot = at(2026, 9, 24, 8);
        const log = dose(now, { scheduleOccurrence: { scheduleId: s.id, occurrenceMs: slot } });
        expect(dueItems([s], [], now).length).toBe(1);
        expect(dueItems([s], [log], now).length).toBe(0);
        const restored = JSON.parse(JSON.stringify(log));
        restored.scheduleOccurrence = sanitizeScheduleOccurrence(restored.scheduleOccurrence);
        expect(dueItems([s], [restored], now).length).toBe(0);
        expect(restored.timeH * 3_600_000).toBe(now);
        expect(dueItems([s], [], now).length).toBe(1);
        expect(isSatisfied(at(2026, 9, 25, 8), s, [restored])).toBe(false);
    });

    test('a morning completion cannot be reassigned to the nearer evening slot', () => {
        const morning = schedule({ id: 'morning', cadence: { kind: 'daily', times: [480] } });
        const evening = schedule({ id: 'evening', cadence: { kind: 'daily', times: [1200] } });
        const now = at(2026, 9, 24, 21);
        const log = dose(now, { scheduleOccurrence: { scheduleId: morning.id, occurrenceMs: at(2026, 9, 24, 8) } });
        expect(dueItems([morning, evening], [log], now).map(item => item.schedule.id)).toEqual(['evening']);
        const ordinary = dose(at(2026, 9, 24, 20));
        expect(dueItems([morning, evening], [ordinary, log], now).length).toBe(0);
    });

    test('edited routes or invalidated schedule slots cannot count as completed', () => {
        const s = schedule({ cadence: { kind: 'daily', times: [480] } });
        const now = at(2026, 9, 24, 21);
        const log = dose(now, { route: Route.injection, scheduleOccurrence: { scheduleId: s.id, occurrenceMs: at(2026, 9, 24, 8) } });
        expect(dueItems([s], [log], now).length).toBe(1);
        expect(assignScheduleEvents([s], [dose(now, { scheduleOccurrence: { scheduleId: s.id, occurrenceMs: at(2026, 9, 24, 7) } })]).size).toBe(0);
    });

    test('sync detects and retains a newly linked occurrence on an existing log', () => {
        const original = dose(at(2026, 9, 24, 21), { updatedAt: 1 });
        const linked = { ...original, updatedAt: 2, scheduleOccurrence: { scheduleId: 's1', occurrenceMs: at(2026, 9, 24, 8) } };
        const local = normalizeSyncState({ events: [original] });
        const remote = normalizeSyncState({ events: [linked] });
        const result = mergeSyncStates(local, remote);
        expect(result.localChanged).toBe(true);
        expect(result.merged.modes.transfem.events[0].scheduleOccurrence).toEqual(linked.scheduleOccurrence);
    });

    test('import drops malformed references and strips unrelated fields', () => {
        const valid = { scheduleId: 's1', occurrenceMs: at(2026, 9, 24, 8) };
        expect(sanitizeScheduleOccurrence({ ...valid, note: 'not metadata' })).toEqual(valid);
        for (const raw of [null, [], {}, { ...valid, scheduleId: '' }, { ...valid, occurrenceMs: NaN }, { ...valid, occurrenceMs: -1 }]) {
            expect(sanitizeScheduleOccurrence(raw)).toBe(undefined);
        }
    });
});
