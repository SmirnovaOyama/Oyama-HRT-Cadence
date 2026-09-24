import { at, dose, schedule } from './fixtures';
import { describe, expect, test } from 'bun:test';
import { buildProjection } from '../src/hooks/useProjection';

const MS_H = 3_600_000;

describe('projection uses the full logged history', () => {
    for (const count of [1, 2]) {
        test(`${count} logged doses do not get planned a second time`, () => {
            const now = at(2026, 9, 24, 9);
            const events = Array.from({ length: count }, (_, i) => dose(at(2026, 9, 24 - i, 8)));
            const result = buildProjection(events, 70, [schedule()], now);
            expect(result).not.toBeNull();
            expect(result!.planned[0].timeH * MS_H).toBe(at(2026, 9, 24, 20));
            expect(result!.planned.some(e => e.timeH * MS_H === now)).toBeFalse();
        });
    }

    test('nearby actual doses remain distinct for an explicit schedule', () => {
        const now = at(2026, 9, 24, 9, 30);
        const events = [
            dose(at(2026, 9, 22, 8)),
            dose(at(2026, 9, 23, 8)),
            dose(at(2026, 9, 24, 8)),
            dose(at(2026, 9, 24, 9)),
        ];
        const s = schedule({ cadence: { kind: 'daily', times: [480, 540] } });
        const result = buildProjection(events, 70, [s], now);
        expect(result).not.toBeNull();
        expect(result!.planned[0].timeH * MS_H).toBe(at(2026, 9, 25, 8));
        expect(result!.planned.some(e => e.timeH * MS_H === now)).toBeFalse();
    });
});
