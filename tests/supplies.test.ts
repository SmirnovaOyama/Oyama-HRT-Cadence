import { at, dose, schedule, supply } from './fixtures';
import { describe, expect, test } from 'bun:test';
import { Ester, ExtraKey, Route } from '../logic';
import {
    dailyRate,
    daysLeft,
    itemMatches,
    remaining,
    reorderBy,
    runOutDate,
    status,
    supplyForecast,
    unitsPerDose,
    usedSince,
} from '../src/utils/supplies';

const DAY = 86_400_000;
const inj = (ms: number, mg = 5) => dose(ms, { route: Route.injection, ester: Ester.EV, doseMG: mg });
const weekly = schedule({
    route: Route.injection,
    ester: Ester.EV,
    doseMG: 5,
    cadence: { kind: 'every', days: 7, time: 20 * 60, anchorDate: '2026-09-03' },
});
const now = at(2026, 9, 24, 12);

describe('units per dose', () => {
    test('mL from strength, else from the dose concentration', () => {
        expect(unitsPerDose(supply(), inj(0))).toBeCloseTo(0.125);
        const noStrength = supply({ strengthMG: undefined });
        expect(unitsPerDose(noStrength, dose(0, { doseMG: 4, extras: { [ExtraKey.concentrationMGmL]: 20 } }))).toBeCloseTo(0.2);
        expect(unitsPerDose(noStrength, inj(0))).toBe(0);
    });

    test('explicit perDose, tablets, pieces and mg', () => {
        expect(unitsPerDose(supply({ perDose: 0.3 }), inj(0))).toBe(0.3);
        expect(unitsPerDose(supply({ unit: 'tablets', strengthMG: 2 }), dose(0, { doseMG: 4 }))).toBe(2);
        expect(unitsPerDose(supply({ unit: 'tablets', strengthMG: undefined }), dose(0))).toBe(1);
        expect(unitsPerDose(supply({ unit: 'pieces', kind: 'needles' }), inj(0))).toBe(1);
        expect(unitsPerDose(supply({ unit: 'mg' }), dose(0, { doseMG: 6 }))).toBe(6);
    });

    test('matching by ester and route family', () => {
        const needles = supply({ kind: 'needles', unit: 'pieces', link: { route: Route.injection } });
        expect(itemMatches(needles, inj(0))).toBeTrue();
        expect(itemMatches(needles, dose(0))).toBeFalse();
        const patches = supply({ kind: 'patches', unit: 'pieces', link: { ester: Ester.E2, route: Route.patchApply } });
        expect(itemMatches(patches, dose(0, { route: Route.patchApply }))).toBeTrue();
        expect(itemMatches(patches, dose(0, { route: Route.patchRemove }))).toBeFalse();
        expect(itemMatches(supply({ link: null }), inj(0))).toBeFalse();
        expect(itemMatches(supply({ link: {} }), inj(0))).toBeFalse();
    });
});

describe('remaining and forecast', () => {
    const events = [inj(at(2026, 8, 27, 20)), inj(at(2026, 9, 3, 20)), inj(at(2026, 9, 10, 20)), inj(at(2026, 9, 17, 20)), inj(at(2026, 9, 30, 20))];

    test('only doses after setAt and up to now are used', () => {
        expect(usedSince(supply(), events, now)).toBeCloseTo(0.375);
        expect(remaining(supply(), events, now)).toBeCloseTo(9.625);
        expect(remaining(supply({ amount: 0.2 }), events, now)).toBe(0);
    });

    test('rate from schedules first', () => {
        expect(dailyRate(supply(), [weekly], events, now)).toBeCloseTo(0.125 / 7);
        expect(dailyRate(supply(), [{ ...weekly, active: false }], [], now)).toBe(0);
        const twiceDaily = schedule({ doseMG: 2 });
        const tabs = supply({ unit: 'tablets', kind: 'tablets', strengthMG: 2, link: { ester: Ester.E2, route: Route.sublingual } });
        expect(dailyRate(tabs, [twiceDaily], [], now)).toBe(2);
    });

    test('rate from the last 28 days of doses without a schedule', () => {
        // Sep 3, 10 and 17 fall in the 28 days before Sep 24; Aug 27 and Sep 30 do not.
        expect(dailyRate(supply(), [], events, now)).toBeCloseTo(0.375 / 28);
    });

    test('days left, run out, reorder by and status', () => {
        const d = daysLeft(supply(), [weekly], events, now)!;
        expect(d).toBeCloseTo(9.625 / (0.125 / 7));
        expect(runOutDate(supply(), [weekly], events, now)).toBeCloseTo(now + d * DAY, -1);
        expect(reorderBy(supply(), [weekly], events, now)).toBeCloseTo(now + (d - 7) * DAY, -1);
        expect(status(supply(), [weekly], events, now)).toBe('ok');

        // 0.625 mL left = 5 weekly doses = 35 days; with a 40 day lead it is time to reorder.
        const low = supply({ amount: 1, reorderLeadDays: 40 });
        expect(daysLeft(low, [weekly], events, now)).toBeCloseTo(35);
        expect(status(low, [weekly], events, now)).toBe('reorder_soon');
        expect(status(supply({ amount: 0.375 }), [weekly], events, now)).toBe('out');
        expect(daysLeft(supply({ amount: 0.375 }), [weekly], events, now)).toBe(0);
    });

    test('unknown rate gives nulls and ok', () => {
        const f = supplyForecast(supply(), [], [], now);
        expect(f).toEqual({ remaining: 10, dailyRate: 0, daysLeft: null, runOutMs: null, reorderByMs: null, status: 'ok' });
        expect(runOutDate(supply(), [], [], now)).toBeNull();
    });

    test('forecast agrees with the single functions', () => {
        const low = supply({ amount: 1, reorderLeadDays: 40 });
        const f = supplyForecast(low, [weekly], events, now);
        expect(f.status).toBe(status(low, [weekly], events, now));
        expect(f.daysLeft).toBeCloseTo(daysLeft(low, [weekly], events, now)!);
        expect(f.reorderByMs).toBeCloseTo(reorderBy(low, [weekly], events, now)!, -1);
    });
});
