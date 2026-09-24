import { describe, expect, test } from 'bun:test';
import {
    dateTimePartBounds,
    dateTimePartValue,
    dateForTimeOfDay,
    updateDateTimePart,
    type DateTimePart,
} from '../src/utils/dateTimeParts';

function localDate(year: number, month: number, day: number): Date {
    const date = new Date(2020, 0, 1, 12, 34, 56, 789);
    date.setFullYear(year, month - 1, day);
    return date;
}

const calendar = (date: Date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()];

describe('clock-only schedule values', () => {
    test('preserves midnight, a spring-gap hour and the end of the day', () => {
        for (const minutes of [0, 30, 150, 720, 1439]) {
            const date = dateForTimeOfDay(minutes);
            expect(date.getHours() * 60 + date.getMinutes()).toBe(minutes);
            expect(date.getSeconds()).toBe(0);
        }
        const selected = updateDateTimePart(dateForTimeOfDay(3 * 60 + 30), 'hour', 2);
        expect([selected.getHours(), selected.getMinutes()]).toEqual([2, 30]);
    });

    test('rejects values that are not a minute on the clock', () => {
        for (const invalid of [-1, 1440, 1.5, NaN, Infinity]) {
            expect(Number.isNaN(dateForTimeOfDay(invalid).getTime())).toBe(true);
        }
    });
});

describe('date/time field values and bounds', () => {
    test('uses human month numbering and permits midnight', () => {
        const date = localDate(2026, 12, 31);
        expect(dateTimePartValue(date, 'year')).toBe(2026);
        expect(dateTimePartValue(date, 'month')).toBe(12);
        expect(dateTimePartValue(date, 'day')).toBe(31);
        expect(dateTimePartValue(date, 'hour')).toBe(12);
        expect(dateTimePartValue(date, 'minute')).toBe(34);
        expect(dateTimePartBounds(date, 'year')).toEqual({ min: 1, max: 9999 });
        expect(dateTimePartBounds(date, 'month')).toEqual({ min: 1, max: 12 });
        expect(dateTimePartBounds(date, 'hour')).toEqual({ min: 0, max: 23 });
        expect(dateTimePartBounds(date, 'minute')).toEqual({ min: 0, max: 59 });
    });

    for (const [year, month, max] of [
        [2024, 2, 29], [2025, 2, 28], [1900, 2, 28], [2000, 2, 29],
        [1, 2, 28], [4, 2, 29], [99, 2, 28], [2026, 4, 30], [2026, 1, 31],
    ]) {
        test(`finds the last day of ${year}-${month}`, () => {
            expect(dateTimePartBounds(localDate(year, month, 1), 'day')).toEqual({ min: 1, max });
        });
    }
});

describe('updating a date/time field', () => {
    test('January 31 becomes the last day of February without rolling into March', () => {
        expect(calendar(updateDateTimePart(localDate(2024, 1, 31), 'month', 2))).toEqual([2024, 2, 29]);
        expect(calendar(updateDateTimePart(localDate(2025, 1, 31), 'month', 2))).toEqual([2025, 2, 28]);
    });

    test('changing a leap day to a non-leap year clamps the day', () => {
        const source = localDate(2024, 2, 29);
        expect(calendar(updateDateTimePart(source, 'year', 2025))).toEqual([2025, 2, 28]);
        expect(calendar(updateDateTimePart(source, 'year', 2000))).toEqual([2000, 2, 29]);
        expect(calendar(updateDateTimePart(source, 'year', 1900))).toEqual([1900, 2, 28]);
    });

    test('years 1–99 are preserved instead of gaining a 1900 offset', () => {
        expect(calendar(updateDateTimePart(localDate(2024, 2, 29), 'year', 4))).toEqual([4, 2, 29]);
        expect(calendar(updateDateTimePart(localDate(4, 2, 29), 'year', 1))).toEqual([1, 2, 28]);
        expect(calendar(updateDateTimePart(localDate(99, 1, 31), 'month', 2))).toEqual([99, 2, 28]);
    });

    test('accepts the last valid day and both ends of the year range', () => {
        expect(calendar(updateDateTimePart(localDate(2024, 2, 1), 'day', 29))).toEqual([2024, 2, 29]);
        expect(calendar(updateDateTimePart(localDate(2026, 12, 31), 'year', 1))).toEqual([1, 12, 31]);
        expect(calendar(updateDateTimePart(localDate(2026, 12, 31), 'year', 9999))).toEqual([9999, 12, 31]);
    });

    test('zero hours and minutes are valid and reset seconds without mutating the source', () => {
        const source = localDate(2026, 9, 24);
        const originalTime = source.getTime();
        const midnight = updateDateTimePart(updateDateTimePart(source, 'hour', 0), 'minute', 0);
        expect(calendar(midnight)).toEqual([2026, 9, 24]);
        expect([midnight.getHours(), midnight.getMinutes(), midnight.getSeconds(), midnight.getMilliseconds()])
            .toEqual([0, 0, 0, 0]);
        expect(source.getTime()).toBe(originalTime);
        expect(midnight).not.toBe(source);
    });

    test('rejects out-of-range and fractional fields without changing any part of the date', () => {
        const source = localDate(2025, 2, 20);
        const originalTime = source.getTime();
        const invalid: [DateTimePart, number][] = [
            ['year', 0], ['year', 10000], ['month', 0], ['month', 13],
            ['day', 0], ['day', 29], ['hour', -1], ['hour', 24],
            ['minute', -1], ['minute', 60], ['minute', 1.5],
            ['minute', NaN], ['year', Infinity], ['hour', -Infinity],
        ];
        for (const [part, value] of invalid) {
            const result = updateDateTimePart(source, part, value);
            expect(result).not.toBe(source);
            expect(result.getTime()).toBe(originalTime);
        }
        expect(source.getTime()).toBe(originalTime);
    });

    test('returns an unchanged invalid-date clone instead of inventing a date', () => {
        const source = new Date(NaN);
        const result = updateDateTimePart(source, 'year', 2026);
        expect(result).not.toBe(source);
        expect(Number.isNaN(result.getTime())).toBe(true);
    });
});
