import { at, schedule } from './fixtures';
import { describe, expect, test } from 'bun:test';
import { buildCalendar, escapeText, foldLine, formatLocalDateTime, formatUtc } from '../src/utils/ics';

const stamp = Date.UTC(2026, 8, 24, 6, 15, 0);
const daily = schedule({ id: 'abc', createdAt: at(2026, 9, 20, 13), remind: { enabled: true, leadMin: 10, repeatAfterMin: null } });
const weekly = schedule({
    id: 'wk',
    cadence: { kind: 'every', days: 7, time: 19 * 60 + 30, anchorDate: '2026-09-03' },
    remind: { enabled: false, leadMin: 0, repeatAfterMin: null },
});
const title = () => 'Estradiol, 2 mg';

describe('buildCalendar', () => {
    const ics = buildCalendar([daily, weekly, { ...daily, id: 'off', active: false }], { title, nowMs: stamp });
    const lines = ics.split('\r\n');

    test('pads early years consistently in local and UTC calendar fields', () => {
        expect(formatUtc(new Date('0099-09-24T06:15:00Z').getTime())).toBe('00990924T061500Z');
        expect(formatLocalDateTime('99-09-24', 510)).toBe('00990924T083000');
        const early = schedule({ cadence: { kind: 'every', days: 7, time: 510, anchorDate: '0099-09-24' } });
        const exported = buildCalendar([early], { title: () => 'Example', nowMs: stamp });
        expect(exported).toContain('DTSTART:00990924T083000');
    });

    test('CRLF everywhere, wrapped in one VCALENDAR', () => {
        expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
        expect(ics.endsWith('END:VCALENDAR\r\n')).toBeTrue();
        expect(lines[0]).toBe('BEGIN:VCALENDAR');
        expect(lines).toContain('VERSION:2.0');
    });

    test('one VEVENT per schedule time, inactive left out', () => {
        expect(lines.filter(l => l === 'BEGIN:VEVENT')).toHaveLength(3);
        expect(lines).toContain('UID:abc-0800@cadence');
        expect(lines).toContain('UID:abc-2000@cadence');
        expect(lines).toContain('UID:wk-1930@cadence');
        expect(ics).not.toMatch(/UID:off/);
        expect(lines.filter(l => l === 'DTSTAMP:20260924T061500Z')).toHaveLength(3);
    });

    test('floating DTSTART and RRULE', () => {
        expect(lines).toContain('DTSTART:20260920T080000');
        expect(lines).toContain('DTSTART:20260920T200000');
        expect(lines).toContain('DTSTART:20260903T193000');
        expect(lines.filter(l => l === 'RRULE:FREQ=DAILY')).toHaveLength(2);
        expect(lines).toContain('RRULE:FREQ=DAILY;INTERVAL=7');
    });

    test('VALARM only when reminders are on', () => {
        expect(lines.filter(l => l === 'BEGIN:VALARM')).toHaveLength(2);
        expect(lines.filter(l => l === 'TRIGGER:-PT10M')).toHaveLength(2);
        expect(lines).toContain('ACTION:DISPLAY');
    });

    test('floating local time has no missing time zone reference or calendar zone override', () => {
        expect(ics).not.toContain('TZID');
        expect(ics).not.toContain('X-WR-TIMEZONE');
        for (const line of lines.filter(l => l.startsWith('DTSTART'))) {
            expect(line).toMatch(/^DTSTART:\d{8}T\d{6}$/);
        }
    });

    for (const [month, day] of [
        [3, 29], // Berlin switches to summer time.
        [10, 25], // Berlin switches back to winter time.
    ]) {
        test(`retains the local date and clock times on DST transition ${month}-${day}`, () => {
            const s = schedule({
                createdAt: at(2026, month, day, 0, 15),
                cadence: { kind: 'daily', times: [0, 8 * 60, 23 * 60 + 45] },
            });
            const result = buildCalendar([s], { title, nowMs: stamp }).split('\r\n');
            const date = `2026${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
            expect(result.filter(l => l.startsWith('DTSTART'))).toEqual([
                `DTSTART:${date}T000000`,
                `DTSTART:${date}T080000`,
                `DTSTART:${date}T234500`,
            ]);
            expect(result.filter(l => l === 'RRULE:FREQ=DAILY')).toHaveLength(3);
        });
    }

    test('repeating display alarms include both repeat count and interval', () => {
        const nag = { ...daily, remind: { enabled: true, leadMin: 0, repeatAfterMin: 30 } };
        const z = buildCalendar([nag], { title, nowMs: stamp }).split('\r\n');
        expect(z).toContain('TRIGGER:-PT0M');
        expect(z).toContain('REPEAT:2');
        expect(z).toContain('DURATION:PT30M');
    });

    test('stable output for the same input', () => {
        expect(buildCalendar([daily], { title, nowMs: stamp })).toBe(buildCalendar([daily], { title, nowMs: stamp }));
    });
});

describe('text and folding', () => {
    test('escapes TEXT values', () => {
        expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
        const ics = buildCalendar([daily], { title: () => 'EV; 5 mg, weekly', nowMs: stamp });
        expect(ics).toContain('SUMMARY:EV\\; 5 mg\\, weekly');
    });

    test('folds at 75 octets without splitting UTF-8', () => {
        const long = 'DESCRIPTION:' + 'エストラジオール'.repeat(20) + 'x'.repeat(100);
        const folded = foldLine(long);
        const parts = folded.split('\r\n');
        expect(parts.length).toBeGreaterThan(1);
        for (const p of parts) expect(Buffer.byteLength(p, 'utf8')).toBeLessThanOrEqual(75);
        for (const p of parts.slice(1)) expect(p.startsWith(' ')).toBeTrue();
        expect(parts.map((p, i) => (i ? p.slice(1) : p)).join('')).toBe(long);
        expect(foldLine('SHORT:1')).toBe('SHORT:1');
    });

    test('every physical line of a calendar fits', () => {
        const ics = buildCalendar([daily], { title: () => '雌二醇 '.repeat(40), description: () => 'y'.repeat(300), nowMs: stamp });
        for (const l of ics.split('\r\n')) expect(Buffer.byteLength(l, 'utf8')).toBeLessThanOrEqual(75);
    });
});
