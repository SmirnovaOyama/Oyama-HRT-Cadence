import { at, dose, schedule } from './fixtures';
import { describe, expect, test } from 'bun:test';
import { Ester, Route } from '../logic';
import {
    assignScheduleEvents,
    dueItems,
    emptyReminderState,
    formatLocalDate,
    isSatisfied,
    nextOccurrences,
    occurrenceKey,
    occurrencesBetween,
    parseLocalDate,
    pruneReminderState,
    readReminderState,
    skipOccurrence,
    snoozeOccurrence,
    writeReminderState,
} from '../src/utils/reminders';

describe('local anchor dates', () => {
    test('round-trips every supported year width through storage and the inline date field', () => {
        for (const year of [1, 4, 99, 100, 999, 1000, 2026, 9999]) {
            const selected = new Date(2000, 0, 1, 12, 34);
            selected.setFullYear(year, 8, 24);
            const stored = formatLocalDate(selected.getTime());
            expect(stored).toBe(`${String(year).padStart(4, '0')}-09-24`);

            const restored = new Date(parseLocalDate(stored));
            expect([restored.getFullYear(), restored.getMonth(), restored.getDate(), restored.getHours()])
                .toEqual([year, 8, 24, 0]);

            const fieldDate = new Date(`${stored}T12:00:00`);
            expect([fieldDate.getFullYear(), fieldDate.getMonth(), fieldDate.getDate(), fieldDate.getHours()])
                .toEqual([year, 8, 24, 12]);
        }
    });

    test('preserves an early leap day and accepts legacy unpadded years', () => {
        const leapDay = new Date(parseLocalDate('0004-02-29'));
        expect([leapDay.getFullYear(), leapDay.getMonth(), leapDay.getDate()]).toEqual([4, 1, 29]);
        expect(formatLocalDate(leapDay.getTime())).toBe('0004-02-29');
        expect(parseLocalDate('99-09-24')).toBe(parseLocalDate('0099-09-24'));
    });

    test('keeps recurring dates in the selected century across a year boundary', () => {
        const s = schedule({ cadence: { kind: 'every', days: 7, time: 510, anchorDate: '0099-12-31' } });
        expect(nextOccurrences(s, new Date('0099-12-31T00:00:00').getTime(), 2)).toEqual([
            new Date('0099-12-31T08:30:00').getTime(),
            new Date('0100-01-07T08:30:00').getTime(),
        ]);
    });
});

describe('occurrences', () => {
    test('daily with two times', () => {
        const s = schedule();
        expect(nextOccurrences(s, at(2026, 9, 24, 9), 4)).toEqual([
            at(2026, 9, 24, 20),
            at(2026, 9, 25, 8),
            at(2026, 9, 25, 20),
            at(2026, 9, 26, 8),
        ]);
        expect(occurrencesBetween(s, at(2026, 9, 24), at(2026, 9, 25))).toEqual([at(2026, 9, 24, 8), at(2026, 9, 24, 20)]);
    });

    test('an occurrence exactly at fromMs is included', () => {
        expect(nextOccurrences(schedule(), at(2026, 9, 24, 8), 1)).toEqual([at(2026, 9, 24, 8)]);
    });

    test('invalid dates and non-progressing calendars return without looping', () => {
        expect(nextOccurrences(schedule(), 1e20, 1)).toEqual([]);
        expect(nextOccurrences(schedule(), NaN, 1)).toEqual([]);
        expect(nextOccurrences(schedule(), at(2026, 9, 24), Infinity)).toEqual([]);
        const broken = schedule({ cadence: { kind: 'every', days: Infinity, time: 480, anchorDate: '2026-09-24' } });
        expect(nextOccurrences(broken, at(2026, 9, 24), 1)).toEqual([]);
    });

    test('every 7 days from an anchor, before and after it', () => {
        const s = schedule({ cadence: { kind: 'every', days: 7, time: 19 * 60 + 30, anchorDate: '2026-09-10' } });
        expect(nextOccurrences(s, at(2026, 9, 24, 12), 3)).toEqual([
            at(2026, 9, 24, 19, 30),
            at(2026, 10, 1, 19, 30),
            at(2026, 10, 8, 19, 30),
        ]);
        expect(nextOccurrences(s, at(2026, 9, 1), 1)).toEqual([at(2026, 9, 3, 19, 30)]);
        expect(nextOccurrences(s, at(2026, 9, 24, 20), 1)).toEqual([at(2026, 10, 1, 19, 30)]);
    });

    test('DST: the wall-clock time holds across both shifts', () => {
        const s = schedule({ cadence: { kind: 'daily', times: [8 * 60] } });
        const spring = nextOccurrences(s, at(2026, 3, 28), 3);
        expect(spring.map(ms => new Date(ms).getHours())).toEqual([8, 8, 8]);
        expect(spring[1] - spring[0]).toBe(23 * 3_600_000);
        const autumn = nextOccurrences(s, at(2026, 10, 24), 3);
        expect(autumn.map(ms => new Date(ms).getHours())).toEqual([8, 8, 8]);
        expect(autumn[1] - autumn[0]).toBe(25 * 3_600_000);

        const weekly = schedule({ cadence: { kind: 'every', days: 7, time: 9 * 60, anchorDate: '2026-10-20' } });
        const [a, b] = nextOccurrences(weekly, at(2026, 10, 20), 2);
        expect(new Date(b).getDate()).toBe(27);
        expect(new Date(b).getHours()).toBe(9);
        expect(b - a).toBe(7 * 24 * 3_600_000 + 3_600_000);
    });

    test('spring clock changes keep normalized times ordered and unique', () => {
        const s = schedule({ cadence: { kind: 'daily', times: [120, 150, 180] } });
        expect(occurrencesBetween(s, at(2026, 3, 29), at(2026, 3, 30))).toEqual([
            at(2026, 3, 29, 3), at(2026, 3, 29, 3, 30),
        ]);
    });
});

describe('isSatisfied', () => {
    const daily = schedule({ cadence: { kind: 'daily', times: [8 * 60] } });
    const occ = at(2026, 9, 24, 8);

    test('daily window is -3h to +12h, same ester and route family', () => {
        expect(isSatisfied(occ, daily, [dose(at(2026, 9, 24, 5, 30))])).toBeTrue();
        expect(isSatisfied(occ, daily, [dose(at(2026, 9, 24, 19, 59))])).toBeTrue();
        expect(isSatisfied(occ, daily, [dose(at(2026, 9, 24, 4, 59))])).toBeFalse();
        expect(isSatisfied(occ, daily, [dose(at(2026, 9, 24, 20, 1))])).toBeFalse();
        expect(isSatisfied(occ, daily, [dose(at(2026, 9, 24, 8), { ester: Ester.EV })])).toBeFalse();
        expect(isSatisfied(occ, daily, [dose(at(2026, 9, 24, 8), { route: Route.oral })])).toBeFalse();
    });

    test('every-N window is -1d to +2d; patch apply matches, patch remove does not', () => {
        const patch = schedule({ route: Route.patchApply, cadence: { kind: 'every', days: 7, time: 9 * 60, anchorDate: '2026-09-24' } });
        const o = at(2026, 9, 24, 9);
        expect(isSatisfied(o, patch, [dose(at(2026, 9, 23, 10), { route: Route.patchApply })])).toBeTrue();
        expect(isSatisfied(o, patch, [dose(at(2026, 9, 26, 8), { route: Route.patchApply })])).toBeTrue();
        expect(isSatisfied(o, patch, [dose(at(2026, 9, 26, 10), { route: Route.patchApply })])).toBeFalse();
        expect(isSatisfied(o, patch, [dose(at(2026, 9, 24, 9), { route: Route.patchRemove })])).toBeFalse();
    });

    test('one dose cannot satisfy adjacent daily slots', () => {
        const twice = schedule();
        const eveningDose = [dose(at(2026, 9, 24, 18))];
        expect(isSatisfied(at(2026, 9, 24, 8), twice, eveningDose)).toBeFalse();
        expect(isSatisfied(at(2026, 9, 24, 20), twice, eveningDose)).toBeTrue();
        const frequent = schedule({ cadence: { kind: 'daily', times: [480, 720, 1200] } });
        const eleven = [dose(at(2026, 9, 24, 11))];
        expect(isSatisfied(at(2026, 9, 24, 8), frequent, eleven)).toBeFalse();
        expect(isSatisfied(at(2026, 9, 24, 12), frequent, eleven)).toBeTrue();
    });

    test('the midpoint belongs to only the later every-two-day slot', () => {
        const s = schedule({ cadence: { kind: 'every', days: 2, time: 540, anchorDate: '2026-09-22' } });
        const midpoint = [dose(at(2026, 9, 23, 9))];
        expect(isSatisfied(at(2026, 9, 22, 9), s, midpoint)).toBeFalse();
        expect(isSatisfied(at(2026, 9, 24, 9), s, midpoint)).toBeTrue();
    });
});

describe('logs shared across schedules', () => {
    const morning = schedule({ id: 'morning', cadence: { kind: 'daily', times: [480] } });
    const evening = schedule({ id: 'evening', cadence: { kind: 'daily', times: [1200] } });

    test('a late dose fills the closer schedule only', () => {
        const logged = dose(at(2026, 9, 24, 18));
        const assigned = assignScheduleEvents([morning, evening], [logged]);
        expect(assigned.get('morning')).toBe(undefined);
        expect(assigned.get('evening')).toEqual([logged]);
        expect(dueItems([morning, evening], [logged], at(2026, 9, 24, 21)).map(d => d.schedule.id)).toEqual(['morning']);
    });

    test('simultaneous schedules need separate logs and use amount to break ties', () => {
        const larger = { ...morning, id: 'larger', doseMG: 4 };
        const logged = dose(at(2026, 9, 24, 8), { doseMG: 4 });
        const other = { ...logged, id: 'second-log', doseMG: 2 };
        expect(dueItems([morning, larger], [logged], at(2026, 9, 24, 9)).map(d => d.schedule.id)).toEqual(['morning']);
        expect(dueItems([morning, larger], [logged, other], at(2026, 9, 24, 9))).toHaveLength(0);
        expect(dueItems([larger, morning], [other, logged], at(2026, 9, 24, 9))).toHaveLength(0);
    });

    test('inactive schedules cannot consume a matching log', () => {
        const inactive = { ...morning, id: 'inactive', active: false };
        const logged = dose(at(2026, 9, 24, 8));
        expect(assignScheduleEvents([inactive, morning], [logged]).get('morning')).toEqual([logged]);
        expect(dueItems([inactive, morning], [logged], at(2026, 9, 24, 9))).toHaveLength(0);
    });
});

describe('dueItems', () => {
    const s = schedule({ remind: { enabled: true, leadMin: 15, repeatAfterMin: null } });
    const now = at(2026, 9, 24, 8, 30);
    const key = occurrenceKey('s1', at(2026, 9, 24, 8));

    test('the latest passed occurrence is due until taken', () => {
        const due = dueItems([s], [], now);
        expect(due).toHaveLength(1);
        expect(due[0].occurrenceMs).toBe(at(2026, 9, 24, 8));
        expect(due[0].dueSinceMs).toBe(at(2026, 9, 24, 7, 45));
        expect(due[0].key).toBe(key);
        expect(dueItems([s], [dose(at(2026, 9, 24, 8, 10))], now)).toHaveLength(0);
    });

    test('the lead time brings a reminder forward', () => {
        expect(dueItems([s], [], at(2026, 9, 24, 7, 44))[0].occurrenceMs).toBe(at(2026, 9, 23, 20));
        expect(dueItems([s], [], at(2026, 9, 24, 7, 45))[0].occurrenceMs).toBe(at(2026, 9, 24, 8));
    });

    test('snoozed until later, then back', () => {
        const st = snoozeOccurrence(emptyReminderState(), key, at(2026, 9, 24, 9), now);
        expect(dueItems([s], [], now, st)).toHaveLength(0);
        expect(dueItems([s], [], at(2026, 9, 24, 9, 1), st)).toHaveLength(1);
    });

    test('skipped stays hidden but is not taken', () => {
        const st = skipOccurrence(emptyReminderState(), key, now);
        expect(dueItems([s], [], now, st)).toHaveLength(0);
        expect(isSatisfied(at(2026, 9, 24, 8), s, [])).toBeFalse();
        // The next occurrence is still reminded.
        expect(dueItems([s], [], at(2026, 9, 24, 20), st)[0].occurrenceMs).toBe(at(2026, 9, 24, 20));
    });

    test('inactive, reminders off, or created after the occurrence: nothing', () => {
        expect(dueItems([{ ...s, active: false }], [], now)).toHaveLength(0);
        expect(dueItems([{ ...s, remind: { ...s.remind, enabled: false } }], [], now)).toHaveLength(0);
        expect(dueItems([{ ...s, createdAt: at(2026, 9, 24, 8, 20) }], [], now)).toHaveLength(0);
    });

    test('every-N looks back one interval only', () => {
        const w = schedule({ cadence: { kind: 'every', days: 7, time: 9 * 60, anchorDate: '2026-09-17' } });
        expect(dueItems([w], [], at(2026, 9, 23, 12))[0].occurrenceMs).toBe(at(2026, 9, 17, 9));
        expect(dueItems([w], [], at(2026, 9, 24, 8, 59))[0].occurrenceMs).toBe(at(2026, 9, 17, 9));
        expect(dueItems([w], [dose(at(2026, 9, 18, 9))], at(2026, 9, 20))).toHaveLength(0);
    });
});

describe('reminder state', () => {
    test('prunes entries older than 14 days', () => {
        const now = at(2026, 9, 24);
        const old = occurrenceKey('s1', at(2026, 9, 1));
        const fresh = occurrenceKey('s1', at(2026, 9, 20));
        const st = pruneReminderState({ snoozed: { [old]: 1, [fresh]: 2 }, skipped: [old, fresh, 'junk'] }, now);
        expect(st).toEqual({ snoozed: { [fresh]: 2 }, skipped: [fresh] });
    });

    test('round-trips through localStorage and survives garbage', () => {
        const mem = new Map<string, string>();
        (globalThis as { localStorage?: unknown }).localStorage = {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => void mem.set(k, v),
        };
        const now = at(2026, 9, 24);
        const key = occurrenceKey('s1', at(2026, 9, 23, 8));
        writeReminderState(skipOccurrence(emptyReminderState(), key, now), now);
        expect(readReminderState(now)).toEqual({ snoozed: {}, skipped: [key] });
        mem.set('cadence-reminder-state', '{not json');
        expect(readReminderState(now)).toEqual(emptyReminderState());
        delete (globalThis as { localStorage?: unknown }).localStorage;
        expect(readReminderState(now)).toEqual(emptyReminderState());
    });
});
