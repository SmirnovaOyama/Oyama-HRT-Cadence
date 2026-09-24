import type { DoseEvent } from '../../logic';

/** Keep only the small, explicit reminder reference carried by a saved log. */
export function sanitizeScheduleOccurrence(raw: unknown): DoseEvent['scheduleOccurrence'] {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const { scheduleId, occurrenceMs } = raw as Record<string, unknown>;
    if (typeof scheduleId !== 'string' || !scheduleId.trim() || scheduleId.length > 200
        || typeof occurrenceMs !== 'number' || !Number.isInteger(occurrenceMs)
        || occurrenceMs < 0 || !Number.isFinite(new Date(occurrenceMs).getTime())) return undefined;
    return { scheduleId, occurrenceMs };
}
