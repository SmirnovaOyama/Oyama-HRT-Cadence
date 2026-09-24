// Reminder maths for planned schedules. Pure functions, no React. All calendar
// maths is local time (Date with y/m/d), so a DST shift moves an occurrence by
// the clock, not by 3600 s.
//
// Snooze and skip are device-local (localStorage "cadence-reminder-state"): they
// are about this screen's nagging, not about the dose log, and a skip never
// counts as taken.

import type { DoseEvent } from '../../logic';
import type { Schedule } from '../types/routine';
import { addLocalDays, atTimeOfDay, calendarDaysBetween, routeFamily, startOfLocalDay } from './schedule';
import { sanitizeScheduleOccurrence } from './scheduleOccurrence';

const MS_MIN = 60_000;
const MS_H = 3_600_000;
const MS_DAY = 24 * MS_H;

/** Local midnight of a YYYY-MM-DD date string. */
export function parseLocalDate(ymd: string): number {
    const [y, m, d] = ymd.split('-').map(Number);
    const date = new Date(2000, 0, 1);
    // The numeric Date constructor treats years 0–99 as 1900–1999.
    date.setFullYear(y, (m || 1) - 1, d || 1);
    return date.getTime();
}

/** YYYY-MM-DD of the local day containing `ms`. */
export function formatLocalDate(ms: number): string {
    const d = new Date(ms);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${String(d.getFullYear()).padStart(4, '0')}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Times of day (minutes after midnight) of a schedule, sorted and de-duplicated. */
export function scheduleTimes(s: Schedule): number[] {
    const raw = s.cadence.kind === 'daily' ? s.cadence.times : [s.cadence.time];
    return [...new Set(raw.map(t => Math.round(t)))].filter(t => t >= 0 && t < 24 * 60).sort((a, b) => a - b);
}

/** Days between occurrence days: 1 for daily, N for every-N-days. */
export function intervalDays(s: Schedule): number {
    return s.cadence.kind === 'daily' ? 1 : Math.max(1, Math.round(s.cadence.days));
}

/** True when the local day starting at `dayStartMs` carries occurrences. */
function isOccurrenceDay(s: Schedule, dayStartMs: number): boolean {
    if (s.cadence.kind === 'daily') return true;
    const n = intervalDays(s);
    const diff = calendarDaysBetween(parseLocalDate(s.cadence.anchorDate), dayStartMs);
    return ((diff % n) + n) % n === 0;
}

/** Occurrences (epoch ms) with fromMs <= t < toMs, ascending. */
export function occurrencesBetween(s: Schedule, fromMs: number, toMs: number): number[] {
    const out: number[] = [];
    const times = scheduleTimes(s);
    if (!times.length || toMs <= fromMs) return out;
    // Start a day early so a time late in the previous day is never missed.
    for (let day = addLocalDays(fromMs, -1); day < toMs; day = addLocalDays(day, 1)) {
        if (!isOccurrenceDay(s, day)) continue;
        for (const t of times) {
            const ms = atTimeOfDay(day, t);
            if (ms >= fromMs && ms < toMs) out.push(ms);
        }
    }
    // During the spring clock change a nonexistent wall time can normalize
    // past a later time, or onto the same instant. Keep one ordered occurrence.
    return [...new Set(out)].sort((a, b) => a - b);
}

/** The next `count` occurrences at or after `fromMs`, ascending. */
export function nextOccurrences(s: Schedule, fromMs: number, count: number): number[] {
    const out: number[] = [];
    if (!Number.isFinite(new Date(fromMs).getTime()) || !Number.isFinite(count)
        || count <= 0 || !scheduleTimes(s).length) return out;
    const span = intervalDays(s) + 1;
    let from = fromMs;
    while (out.length < count) {
        const to = addLocalDays(startOfLocalDay(from), span);
        if (!(to > from)) break; // invalid cadence or the end of Date's range
        out.push(...occurrencesBetween(s, from, to));
        from = to;
    }
    return out.slice(0, count);
}

/**
 * Half-open window around an occurrence in which a matching dose counts as
 * taken. Adjacent occurrences divide overlapping windows at their midpoint,
 * so one logged dose can never satisfy two slots of the same schedule.
 */
export function satisfyWindow(s: Schedule, occurrenceMs: number): [number, number] {
    const [earliest, latest] = s.cadence.kind === 'daily'
        ? [occurrenceMs - 3 * MS_H, occurrenceMs + 12 * MS_H]
        : [occurrenceMs - MS_DAY, occurrenceMs + 2 * MS_DAY];
    const n = intervalDays(s);
    const neighbors = occurrencesBetween(s, addLocalDays(occurrenceMs, -n), addLocalDays(occurrenceMs, n + 1));
    let previous: number | undefined;
    let next: number | undefined;
    for (const ms of neighbors) {
        if (ms < occurrenceMs) previous = ms;
        if (ms > occurrenceMs) { next = ms; break; }
    }
    return [
        previous === undefined ? earliest : Math.max(earliest, (previous + occurrenceMs) / 2),
        next === undefined ? latest : Math.min(latest, (occurrenceMs + next) / 2),
    ];
}

/** A dose matches a schedule when the ester and the route family agree. */
export function doseMatchesSchedule(s: Schedule, e: DoseEvent): boolean {
    if (e.ester !== s.ester) return false;
    const a = routeFamily(e.route);
    return a !== null && a === routeFamily(s.route);
}

/** Explicit reminder completions win; older logs use the time window. */
export function isSatisfied(occurrenceMs: number, s: Schedule, events: DoseEvent[]): boolean {
    const [lo, hi] = satisfyWindow(s, occurrenceMs);
    return events.some(e => {
        if (!doseMatchesSchedule(s, e)) return false;
        const linked = sanitizeScheduleOccurrence(e.scheduleOccurrence);
        if (linked) return linked.scheduleId === s.id && linked.occurrenceMs === occurrenceMs;
        const ms = e.timeH * MS_H;
        return ms >= lo && ms < hi;
    });
}

/**
 * Give each log entry to at most one scheduled occurrence. Separate schedules
 * for the same medicine (for example different morning and evening amounts)
 * must not both count the same dose. Closest time wins, then closest amount;
 * stable identifiers break ties, and two logs can fill simultaneous slots.
 */
export function assignScheduleEvents(schedules: Schedule[], events: DoseEvent[]): Map<string, DoseEvent[]> {
    const assigned = new Map<string, DoseEvent[]>();
    const filled = new Set<string>();
    const active = schedules.filter(s => s.active);
    if (!active.length) return assigned;
    const logs = [...new Map(events.map(e => [e.id, e])).values()]
        .filter(e => Number.isFinite(e.timeH))
        .sort((a, b) => a.timeH - b.timeH || a.id.localeCompare(b.id));
    // Reserve explicitly completed slots first. A late log must not be
    // reassigned to a closer, later reminder or consume two schedules.
    for (const e of logs) {
        const linked = sanitizeScheduleOccurrence(e.scheduleOccurrence);
        if (!linked) continue;
        const s = active.find(schedule => schedule.id === linked.scheduleId);
        if (!s || !doseMatchesSchedule(s, e) || linked.occurrenceMs < s.createdAt
            || !occurrencesBetween(s, linked.occurrenceMs, linked.occurrenceMs + 1).length) continue;
        const key = occurrenceKey(s.id, linked.occurrenceMs);
        if (filled.has(key)) continue;
        filled.add(key);
        const list = assigned.get(s.id) ?? [];
        list.push(e);
        assigned.set(s.id, list);
    }
    for (const e of logs) {
        if (sanitizeScheduleOccurrence(e.scheduleOccurrence)) continue;
        const ms = e.timeH * MS_H;
        const candidates: { schedule: Schedule; occurrenceMs: number; key: string }[] = [];
        for (const s of active) {
            if (!doseMatchesSchedule(s, e)) continue;
            for (const occurrenceMs of occurrencesBetween(s, ms - 2 * MS_DAY, ms + MS_DAY + 1)) {
                if (occurrenceMs < s.createdAt) continue;
                const key = occurrenceKey(s.id, occurrenceMs);
                if (filled.has(key)) continue;
                const [lo, hi] = satisfyWindow(s, occurrenceMs);
                if (ms >= lo && ms < hi) candidates.push({ schedule: s, occurrenceMs, key });
            }
        }
        candidates.sort((a, b) =>
            Math.abs(a.occurrenceMs - ms) - Math.abs(b.occurrenceMs - ms)
            || Math.abs(a.schedule.doseMG - e.doseMG) - Math.abs(b.schedule.doseMG - e.doseMG)
            || a.occurrenceMs - b.occurrenceMs
            || a.schedule.id.localeCompare(b.schedule.id));
        const selected = candidates[0];
        if (!selected) continue;
        filled.add(selected.key);
        const list = assigned.get(selected.schedule.id) ?? [];
        list.push(e);
        assigned.set(selected.schedule.id, list);
    }
    return assigned;
}

// ---------------------------------------------------------------- local state

export const REMINDER_STATE_KEY = 'cadence-reminder-state';
const PRUNE_AFTER_MS = 14 * MS_DAY;

export interface ReminderState {
    /** occurrenceKey -> snoozed until (epoch ms). */
    snoozed: Record<string, number>;
    /** occurrenceKeys dismissed without taking. */
    skipped: string[];
}

export const emptyReminderState = (): ReminderState => ({ snoozed: {}, skipped: [] });

/** Stable key of one occurrence: `${scheduleId}@${occurrenceMs}`. */
export function occurrenceKey(scheduleId: string, occurrenceMs: number): string {
    return `${scheduleId}@${Math.round(occurrenceMs)}`;
}

/** Occurrence time encoded in a key, or NaN. */
export function occurrenceKeyTime(key: string): number {
    const at = key.lastIndexOf('@');
    return at < 0 ? NaN : Number(key.slice(at + 1));
}

/** Drops entries whose occurrence is older than 14 days (or unreadable). */
export function pruneReminderState(state: ReminderState, nowMs: number = Date.now()): ReminderState {
    const keep = (key: string) => {
        const t = occurrenceKeyTime(key);
        return Number.isFinite(t) && t >= nowMs - PRUNE_AFTER_MS;
    };
    const snoozed: Record<string, number> = {};
    for (const [k, v] of Object.entries(state.snoozed)) if (keep(k) && Number.isFinite(v)) snoozed[k] = v;
    return { snoozed, skipped: [...new Set(state.skipped.filter(keep))] };
}

function storage(): Storage | null {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
        return null;
    }
}

export function readReminderState(nowMs: number = Date.now()): ReminderState {
    try {
        const raw = storage()?.getItem(REMINDER_STATE_KEY);
        if (!raw) return emptyReminderState();
        const parsed = JSON.parse(raw) as Partial<ReminderState>;
        const state: ReminderState = {
            snoozed: parsed && typeof parsed.snoozed === 'object' && parsed.snoozed ? { ...parsed.snoozed } : {},
            skipped: Array.isArray(parsed?.skipped) ? parsed.skipped.filter(k => typeof k === 'string') : [],
        };
        return pruneReminderState(state, nowMs);
    } catch {
        return emptyReminderState();
    }
}

export function writeReminderState(state: ReminderState, nowMs: number = Date.now()): ReminderState {
    const pruned = pruneReminderState(state, nowMs);
    try {
        storage()?.setItem(REMINDER_STATE_KEY, JSON.stringify(pruned));
    } catch {
        // Private mode or blocked storage: the reminder simply comes back.
    }
    return pruned;
}

/** New state with the occurrence snoozed until `untilMs` (pure; persist with writeReminderState). */
export function snoozeOccurrence(state: ReminderState, key: string, untilMs: number, nowMs: number = Date.now()): ReminderState {
    return pruneReminderState({ snoozed: { ...state.snoozed, [key]: untilMs }, skipped: state.skipped }, nowMs);
}

/** New state with the occurrence skipped (pure; persist with writeReminderState). Skip is not taken. */
export function skipOccurrence(state: ReminderState, key: string, nowMs: number = Date.now()): ReminderState {
    const snoozed = { ...state.snoozed };
    delete snoozed[key];
    return pruneReminderState({ snoozed, skipped: [...state.skipped, key] }, nowMs);
}

// ---------------------------------------------------------------- due items

export interface DueItem {
    schedule: Schedule;
    occurrenceMs: number;
    key: string;
    /** occurrenceMs - leadMin: when the reminder started. */
    dueSinceMs: number;
}

/**
 * Reminders to show now: for each active schedule with reminders on, its latest
 * occurrence whose reminder time has passed (looking back at most one interval),
 * unless a matching dose was logged, it was skipped, or it is snoozed. An
 * occurrence before the schedule was created is never due. Sorted oldest first.
 */
export function dueItems(
    schedules: Schedule[],
    events: DoseEvent[],
    nowMs: number,
    state: ReminderState = emptyReminderState(),
): DueItem[] {
    const out: DueItem[] = [];
    const skipped = new Set(state.skipped);
    const assigned = assignScheduleEvents(schedules, events);
    for (const s of schedules) {
        if (!s.active || !s.remind.enabled) continue;
        const leadMs = Math.max(0, s.remind.leadMin) * MS_MIN;
        const lookBack = addLocalDays(nowMs, -intervalDays(s));
        const occ = occurrencesBetween(s, lookBack, nowMs + leadMs + 1).filter(o => o - leadMs <= nowMs);
        const latest = occ[occ.length - 1];
        if (latest === undefined || latest < s.createdAt) continue;
        const key = occurrenceKey(s.id, latest);
        if (skipped.has(key)) continue;
        const until = state.snoozed[key];
        if (until !== undefined && until > nowMs) continue;
        if (isSatisfied(latest, s, assigned.get(s.id) ?? [])) continue;
        out.push({ schedule: s, occurrenceMs: latest, key, dueSinceMs: latest - leadMs });
    }
    return out.sort((a, b) => a.dueSinceMs - b.dueSinceMs);
}
