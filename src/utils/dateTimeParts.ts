export type DateTimePart = 'year' | 'month' | 'day' | 'hour' | 'minute';

/** A clock-only value is not an occurrence on today's date. Using a stable
 *  reference day keeps a spring clock change from turning 02:30 into 03:30. */
export function dateForTimeOfDay(minutes: number): Date {
    if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 1440) return new Date(NaN);
    return new Date(2000, 0, 15, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

const daysInMonth = (year: number, month: number): number => {
    if (month === 1) {
        return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
    }
    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month] ?? NaN;
};

/** Values as entered in the UI: months run from 1 through 12. */
export function dateTimePartValue(date: Date, part: DateTimePart): number {
    switch (part) {
        case 'year': return date.getFullYear();
        case 'month': return date.getMonth() + 1;
        case 'day': return date.getDate();
        case 'hour': return date.getHours();
        case 'minute': return date.getMinutes();
    }
}

export function dateTimePartBounds(date: Date, part: DateTimePart): { min: number; max: number } {
    switch (part) {
        case 'year': return { min: 1, max: 9999 };
        case 'month': return { min: 1, max: 12 };
        case 'day': return { min: 1, max: daysInMonth(date.getFullYear(), date.getMonth()) };
        case 'hour': return { min: 0, max: 23 };
        case 'minute': return { min: 0, max: 59 };
    }
}

/** Change a local calendar field without mutating the supplied date. */
export function updateDateTimePart(date: Date, part: DateTimePart, value: number): Date {
    const next = new Date(date.getTime());
    if (!Number.isFinite(date.getTime()) || !Number.isInteger(value)) return next;

    const { min, max } = dateTimePartBounds(date, part);
    if (value < min || value > max) return next;

    if (part === 'year' || part === 'month') {
        const year = part === 'year' ? value : next.getFullYear();
        const month = part === 'month' ? value - 1 : next.getMonth();
        const day = Math.min(next.getDate(), daysInMonth(year, month));
        // setFullYear preserves years 1–99 and changes all calendar fields at
        // once, avoiding both the constructor's 1900 offset and month rollover.
        next.setFullYear(year, month, day);
    } else if (part === 'day') {
        next.setDate(value);
    } else if (part === 'hour') {
        next.setHours(value);
    } else {
        next.setMinutes(value);
    }

    next.setSeconds(0, 0);
    return next;
}
