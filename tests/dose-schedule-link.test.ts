import { at, dose } from './fixtures';
import { describe, expect, test } from 'bun:test';
import { Ester, Route } from '../logic';
import { retainedScheduleOccurrence } from '../src/utils/doseScheduleLink';

describe('dose editor reminder associations', () => {
    const scheduleOccurrence = { scheduleId: 'daily-test', occurrenceMs: at(2026, 9, 24, 8) };
    const source = { ...dose(at(2026, 9, 24, 21)), scheduleOccurrence };

    test('a reminder prefill survives saving the same medicine and route late', () => {
        const prefill = { route: source.route, ester: source.ester, scheduleOccurrence };
        const saved = retainedScheduleOccurrence(prefill, source.route, source.ester);
        expect(saved).toEqual(scheduleOccurrence);
        expect(saved).not.toBe(scheduleOccurrence);
    });

    test('editing an associated record preserves its source occurrence', () => {
        expect(retainedScheduleOccurrence(source, source.route, source.ester)).toEqual(scheduleOccurrence);
    });

    test('changing the route or medicine removes the association', () => {
        expect(retainedScheduleOccurrence(source, Route.oral, source.ester)).toBe(undefined);
        expect(retainedScheduleOccurrence(source, source.route, Ester.EV)).toBe(undefined);
    });

    test('normal log entries and old records never gain an association', () => {
        expect(retainedScheduleOccurrence(null, source.route, source.ester)).toBe(undefined);
        expect(retainedScheduleOccurrence(undefined, source.route, source.ester)).toBe(undefined);
        expect(retainedScheduleOccurrence(dose(at(2026, 9, 24, 21)), source.route, source.ester)).toBe(undefined);
    });
});
