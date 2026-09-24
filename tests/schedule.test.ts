import { at, dose, schedule } from './fixtures';
import { describe, expect, test } from 'bun:test';
import { Ester, ExtraKey, Route } from '../logic';
import {
    addLocalDays,
    atTimeOfDay,
    calendarDaysBetween,
    cycleState,
    dailySlots,
    inferRegimens,
    mergeRegimens,
    plannedEvents,
    regimensFor,
    scheduleRegimens,
    scheduleToRegimen,
    startOfLocalDay,
} from '../src/utils/schedule';

const MS_H = 3_600_000;

describe('local calendar helpers', () => {
    test('keeps early-year midnight, leap days, and wall-clock times', () => {
        const evening = new Date('0004-02-28T21:45:00').getTime();
        const midnight = new Date('0004-02-28T00:00:00').getTime();
        const leapDay = new Date('0004-02-29T00:00:00').getTime();
        expect(startOfLocalDay(evening)).toBe(midnight);
        expect(addLocalDays(evening, 1)).toBe(leapDay);
        expect(atTimeOfDay(leapDay, 150)).toBe(new Date('0004-02-29T02:30:00').getTime());
        expect(calendarDaysBetween(midnight, leapDay)).toBe(1);
        expect(addLocalDays(new Date('0099-12-31T12:00:00').getTime(), 1))
            .toBe(new Date('0100-01-01T00:00:00').getTime());
    });
});

// Weekly EV injections on Mondays at 09:00, plus daily oral CPA at 21:00.
function log() {
    const out = [];
    for (let i = 0; i < 5; i++) out.push(dose(at(2026, 8, 24 + 7 * i, 9), { route: Route.injection, ester: Ester.EV, doseMG: 5 }));
    for (let d = 14; d <= 23; d++) out.push(dose(at(2026, 9, d, 21), { route: Route.oral, ester: Ester.CPA, doseMG: 12.5 }));
    return out;
}

const everyFive = () =>
    schedule({
        id: 'ev',
        route: Route.injection,
        ester: Ester.EV,
        doseMG: 4,
        cadence: { kind: 'every', days: 5, time: 10 * 60, anchorDate: '2026-09-20' },
        createdAt: at(2026, 9, 1),
    });

describe('regimensFor', () => {
    test('no schedules is exactly inference', () => {
        const now = at(2026, 9, 24, 12);
        expect(regimensFor(log(), [], now)).toEqual(inferRegimens(log(), now));
    });

    test('a schedule wins for the same ester and route family', () => {
        const now = at(2026, 9, 24, 12);
        const rs = regimensFor(log(), [everyFive()], now);
        const ev = rs.filter(r => r.ester === Ester.EV);
        expect(ev.length).toBe(1);
        expect(ev[0].schedule?.id).toBe('ev');
        expect(ev[0].kind).toBe('cycle');
        expect(ev[0].cycleDays).toBe(5);
        expect(ev[0].last.doseMG).toBe(4);
        expect(ev[0].last.id).toBe('schedule-ev');
        // Latest logged EV injection was Sept 21; the log still backs the regimen.
        expect(ev[0].last.timeH).toBe(at(2026, 9, 21, 9) / MS_H);
        // Sept 20 was satisfied by the Sept 21 injection; next is Sept 25 at 10:00.
        expect(ev[0].nextDueMs).toBe(at(2026, 9, 25, 10));
        // CPA has no schedule, so inference fills in.
        const cpa = rs.find(r => r.ester === Ester.CPA);
        expect(cpa?.schedule === undefined).toBe(true);
        expect(cpa?.kind).toBe('daily');
    });

    test('another route family keeps its inferred regimen', () => {
        const now = at(2026, 9, 24, 12);
        const s = schedule({ id: 'sl', route: Route.sublingual, ester: Ester.EV });
        const rs = regimensFor(log(), [s], now);
        expect(rs.filter(r => r.ester === Ester.EV).map(r => r.family).sort()).toEqual(['injection', 'sublingual']);
    });

    test('an inactive schedule leaves inference alone', () => {
        const now = at(2026, 9, 24, 12);
        const rs = regimensFor(log(), [{ ...everyFive(), active: false }], now);
        expect(rs).toEqual(inferRegimens(log(), now));
    });

    test('independent schedules for the same medicine are preserved', () => {
        const a = { ...everyFive(), id: 'old', createdAt: at(2026, 8, 1) };
        const b = { ...everyFive(), id: 'new', updatedAt: at(2026, 9, 10) };
        const rs = scheduleRegimens([a, b], [], at(2026, 9, 24, 12));
        expect(rs.map(r => r.schedule?.id)).toEqual(['old', 'new']);
        expect(new Set(rs.map(r => r.key)).size).toBe(2);
    });

    test('mergeRegimens puts explicit ones first', () => {
        const now = at(2026, 9, 24, 12);
        const explicit = scheduleRegimens([everyFive()], log(), now);
        const merged = mergeRegimens(inferRegimens(log(), now), explicit);
        expect(merged[0].schedule?.id).toBe('ev');
        expect(merged.length).toBe(2);
    });
});

describe('scheduleToRegimen', () => {
    test('patch removal and inactive schedules give no regimen', () => {
        expect(scheduleToRegimen(schedule({ route: Route.patchRemove }), [])).toBeNull();
        expect(scheduleToRegimen(schedule({ active: false }), [])).toBeNull();
    });

    test('a schedule with nothing logged still works', () => {
        const s = schedule({ createdAt: at(2026, 9, 24, 7) });
        const r = scheduleToRegimen(s, [], at(2026, 9, 24, 9))!;
        expect(r.events).toEqual([]);
        expect(r.intervalH).toBe(12);
        expect(r.nextDueMs).toBe(at(2026, 9, 24, 8)); // overdue this morning
        const slots = dailySlots(r, at(2026, 9, 23), 3, at(2026, 9, 24, 9));
        expect(slots.map(x => x.state)).toEqual(['none', 'dueNow', 'upcoming']);
    });

    test('an occurrence from before the schedule existed is never due', () => {
        const s = schedule({ createdAt: at(2026, 9, 24, 9) });
        const r = scheduleToRegimen(s, [], at(2026, 9, 24, 10))!;
        expect(r.nextDueMs).toBe(at(2026, 9, 24, 20));
    });

    test('a logged dose moves the due time on', () => {
        const s = schedule();
        const r = scheduleToRegimen(s, [dose(at(2026, 9, 24, 8, 10))], at(2026, 9, 24, 9))!;
        expect(r.nextDueMs).toBe(at(2026, 9, 24, 20));
    });

    test('a multi-dose day is complete only after every slot is logged', () => {
        const s = schedule();
        const morning = dose(at(2026, 9, 24, 8));
        const atNoon = scheduleToRegimen(s, [morning], at(2026, 9, 24, 12))!;
        const pending = dailySlots(atNoon, at(2026, 9, 24), 1, at(2026, 9, 24, 12))[0];
        expect(pending.state).toBe('due');
        expect(pending.dueMs).toBe(at(2026, 9, 24, 20));
        expect(dailySlots(atNoon, at(2026, 9, 24), 1, at(2026, 9, 24, 21))[0].state).toBe('dueNow');
        const complete = scheduleToRegimen(s, [morning, dose(at(2026, 9, 24, 20))], at(2026, 9, 24, 21))!;
        expect(dailySlots(complete, at(2026, 9, 24), 1, at(2026, 9, 24, 21))[0].state).toBe('taken');
    });

    test('cycle state follows the schedule, not the last dose', () => {
        const r = scheduleToRegimen(everyFive(), log(), at(2026, 9, 24, 12))!;
        const c = cycleState(r, at(2026, 9, 24, 12))!;
        expect(c.cycleStartMs).toBe(at(2026, 9, 20));
        expect(c.day).toBe(5);
        expect(c.overdue).toBe(false);
    });
});

describe('plannedEvents with schedules', () => {
    test('unchanged without schedules', () => {
        const now = at(2026, 9, 24, 12);
        const rs = inferRegimens(log(), now);
        expect(plannedEvents(rs, now, 14, [])).toEqual(plannedEvents(rs, now, 14));
    });

    test('an explicit schedule follows its exact times and dose', () => {
        const now = at(2026, 9, 24, 12);
        const planned = plannedEvents(regimensFor(log(), [everyFive()], now), now, 14).filter(e => e.ester === Ester.EV);
        expect(planned.map(e => e.timeH * MS_H)).toEqual([at(2026, 9, 25, 10), at(2026, 9, 30, 10), at(2026, 10, 5, 10)]);
        expect(planned.every(e => e.doseMG === 4 && e.id.startsWith('planned-'))).toBe(true);
    });

    test('the optional schedules parameter merges in', () => {
        const now = at(2026, 9, 24, 12);
        const a = plannedEvents(inferRegimens(log(), now), now, 14, [everyFive()]);
        const b = plannedEvents(regimensFor(log(), [everyFive()], now), now, 14);
        expect(a).toEqual(b);
    });

    test('separate morning and evening schedules both project with unique ids', () => {
        const morning = schedule({ id: 'morning', doseMG: 2, cadence: { kind: 'daily', times: [480] } });
        const evening = schedule({ id: 'evening', doseMG: 4, cadence: { kind: 'daily', times: [1200] } });
        const now = at(2026, 9, 24, 7);
        const events = [dose(at(2026, 9, 23, 8)), dose(at(2026, 9, 23, 20), { doseMG: 4 })];
        const projected = plannedEvents(regimensFor(events, [morning, evening], now), now, 1);
        expect(projected.map(e => [e.timeH * MS_H, e.doseMG])).toEqual([
            [at(2026, 9, 24, 8), 2], [at(2026, 9, 24, 20), 4],
        ]);
        expect(new Set(projected.map(e => e.id)).size).toBe(2);
    });

    test('two daily times, an overdue one taken now, logged ones skipped', () => {
        const s = schedule({ createdAt: at(2026, 9, 20) });
        const now = at(2026, 9, 24, 9);
        const events = [dose(at(2026, 9, 24, 20, 5))]; // tonight's entered ahead
        const planned = plannedEvents(regimensFor(events, [s], now), now, 1);
        expect(planned.map(e => e.timeH * MS_H)).toEqual([now, at(2026, 9, 25, 8)]);
    });

    test('a planned patch comes off at the next change', () => {
        const s = schedule({
            route: Route.patchApply,
            createdAt: at(2026, 9, 23),
            cadence: { kind: 'every', days: 3, time: 9 * 60, anchorDate: '2026-09-24' },
        });
        const now = at(2026, 9, 24, 8);
        const planned = plannedEvents(regimensFor([], [s], now), now, 7);
        expect(planned.length).toBe(3);
        expect(planned[0].extras[ExtraKey.patchWearH]).toBe(72);
    });
});
