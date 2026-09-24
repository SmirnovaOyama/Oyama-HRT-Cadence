import { at, dose, supply } from './fixtures';
import { describe, expect, test } from 'bun:test';
import { Ester, Route } from '../logic';
import { doseTimeForSave, toLocalMinuteString } from '../src/utils/doseEventTime';
import { remaining } from '../src/utils/supplies';

const MS_H = 3_600_000;

describe('editing a dose preserves its original instant', () => {
    test('an unchanged minute preserves seconds, milliseconds and exact stored hours', () => {
        const originalTimeH = (at(2026, 9, 24, 11, 5) + 30_345) / MS_H;
        const displayed = toLocalMinuteString(new Date(originalTimeH * MS_H));
        expect(displayed).toBe('2026-09-24T11:05');
        expect(doseTimeForSave('earlier', displayed, originalTimeH)).toBe(originalTimeH);
    });

    test('editing after a same-minute refill cannot restore already-used stock', () => {
        const minute = at(2026, 9, 24, 11, 5);
        const item = supply({ amount: 10, setAt: minute + 20_000, strengthMG: 20 });
        const logged = dose(minute + 30_345, { route: Route.injection, ester: Ester.EV, doseMG: 2 });
        const displayed = toLocalMinuteString(new Date(logged.timeH * MS_H));
        const edited = { ...logged, timeH: doseTimeForSave('earlier', displayed, logged.timeH) };
        expect(remaining(item, [logged], minute + 50_000)).toBeCloseTo(9.9);
        expect(remaining(item, [edited], minute + 50_000)).toBeCloseTo(9.9);
        // The persisted event has the same behavior after the app reloads.
        expect(remaining(item, JSON.parse(JSON.stringify([edited])), minute + 50_000)).toBeCloseTo(9.9);
    });

    test('selecting another minute or date replaces the original instant', () => {
        const originalTimeH = (at(2026, 9, 24, 11, 5) + 30_345) / MS_H;
        expect(doseTimeForSave('earlier', '2026-09-24T11:06', originalTimeH)).toBe(at(2026, 9, 24, 11, 6) / MS_H);
        expect(doseTimeForSave('earlier', '2026-09-25T11:05', originalTimeH)).toBe(at(2026, 9, 25, 11, 5) / MS_H);
    });

    test('the repeated autumn hour keeps the original time-zone occurrence', () => {
        const originalTimeH = Date.parse('2026-10-25T02:30:45+01:00') / MS_H;
        expect(toLocalMinuteString(new Date(originalTimeH * MS_H))).toBe('2026-10-25T02:30');
        expect(doseTimeForSave('earlier', '2026-10-25T02:30', originalTimeH)).toBe(originalTimeH);
    });

    test('new records and Now continue to use the selected or current time', () => {
        const nowMs = at(2026, 9, 24, 11, 5) + 45_678;
        expect(doseTimeForSave('now', '2026-09-01T08:00', 100, nowMs)).toBe(nowMs / MS_H);
        expect(doseTimeForSave('earlier', '2026-09-24T11:06', undefined, nowMs)).toBe(at(2026, 9, 24, 11, 6) / MS_H);
        expect(doseTimeForSave('earlier', '', undefined, nowMs)).toBe(nowMs / MS_H);
    });
});
