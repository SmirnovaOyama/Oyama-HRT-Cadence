import { describe, expect, test } from 'bun:test';
import { midnightsBetween } from '../src/components/ResultChart';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Wall-clock fields of an instant in a zone, for checking what "midnight" means there. */
function wallClock(ms: number, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(ms);
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
    return { day: get('day'), hour: get('hour'), minute: get('minute') };
}

describe('midnightsBetween', () => {
    test('device zone: one tick per local midnight, each at 00:00', () => {
        const from = new Date(2026, 8, 24, 15, 0).getTime();
        const to = new Date(2026, 8, 30, 9, 0).getTime();
        const days = midnightsBetween(from, to);
        expect(days.map(d => new Date(d.ms).getDate())).toEqual([24, 25, 26, 27, 28, 29, 30]);
        for (const d of days) {
            const date = new Date(d.ms);
            expect(date.getHours()).toBe(0);
            expect(date.getMinutes()).toBe(0);
        }
    });

    test('weekday and day numbers follow the calendar', () => {
        // 2026-09-28 is a Monday.
        const monday = midnightsBetween(new Date(2026, 8, 28, 1).getTime() - HOUR * 2, new Date(2026, 8, 28, 1).getTime())
            .find(d => new Date(d.ms).getDate() === 28)!;
        expect(monday.dow).toBe(1);
        const days = midnightsBetween(new Date(2026, 8, 1).getTime(), new Date(2026, 8, 5).getTime());
        for (let i = 1; i < days.length; i++) expect(days[i].dayNum - days[i - 1].dayNum).toBe(1);
    });

    test('named zone: midnight there, across a daylight saving change', () => {
        // New York leaves daylight saving time on 2026-11-01.
        const zone = 'America/New_York';
        const days = midnightsBetween(Date.UTC(2026, 9, 30, 12), Date.UTC(2026, 10, 3, 12), zone);
        // Starts at the midnight that begins the first day, like the device-zone path.
        expect(days.map(d => wallClock(d.ms, zone).day)).toEqual([30, 31, 1, 2, 3]);
        for (const d of days) {
            const w = wallClock(d.ms, zone);
            expect(w.hour).toBe(0);
            expect(w.minute).toBe(0);
        }
        // The day the clocks go back is 25 hours long.
        expect(days[3].ms - days[2].ms).toBe(DAY + HOUR);
    });

    test('an empty or reversed span gives no ticks', () => {
        expect(midnightsBetween(10, 5)).toEqual([]);
        expect(midnightsBetween(Number.NaN, 5)).toEqual([]);
    });
});
