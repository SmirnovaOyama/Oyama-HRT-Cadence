// Dosing routines inferred from the dose log. Pure functions, no React: Today's
// dial, its "Next:" line and the "Coming up" list are all drawn from these.
//
// A regimen is one medicine taken one way (ester + route family) at least 3
// times. Its interval is the median of the last (up to 8) gaps between doses:
//   - within ~15% of 24 h            -> daily, due at the usual time of day
//   - otherwise, at least 2 days     -> a cycle of N = round(median / 24) days
//   - shorter than a day (e.g. 12 h) -> a plain interval, due last + median
// Gaps that scatter widely (no real rhythm) mark the regimen irregular; callers
// leave those out of the dial and the list instead of guessing a due time.
//
// All calendar maths is local time (Date with y/m/d), so a DST shift moves a
// due time by the clock, not by 3600 s.

import { DoseEvent, Ester, ExtraKey, Route, isTestosteroneEster } from '../../logic';
import type { Schedule } from '../types/routine';
import { assignScheduleEvents, doseMatchesSchedule, intervalDays, isSatisfied, nextOccurrences, occurrencesBetween, scheduleTimes } from './reminders';

export type RouteFamily = 'injection' | 'oral' | 'sublingual' | 'gel' | 'patch';
export type RegimenKind = 'daily' | 'cycle' | 'interval';

export interface Regimen {
    /** `${ester}:${family}` for inference; explicit schedules also carry their id. */
    key: string;
    ester: Ester;
    family: RouteFamily;
    kind: RegimenKind;
    /** Median gap between the last (up to 8) doses, in hours. */
    intervalH: number;
    /** 1 for daily, N for a cycle, 0 for a sub-daily interval. */
    cycleDays: number;
    /** Usual time of day, minutes after local midnight (circular mean). */
    timeOfDayMin: number;
    /** Every dose in the regimen, oldest first. */
    events: DoseEvent[];
    /** The most recent dose. */
    last: DoseEvent;
    /** When the next dose is due (epoch ms). May be in the past (overdue). */
    nextDueMs: number;
    /** Doses keep to a rhythm (gaps within about 25% of the median). */
    regular: boolean;
    /** Still in use: the last dose is recent relative to the interval. */
    active: boolean;
    /**
     * Set when the regimen comes from a schedule the person set up rather than
     * from the log. Then `last` carries the schedule's dose (id "schedule-<id>",
     * timeH of the latest matching logged dose, or the schedule's creation) and
     * `events` may be empty.
     */
    schedule?: Schedule;
}

const MS_H = 3_600_000;
const MIN_EVENTS = 3;
const MAX_GAPS = 8;
const DAILY_TOLERANCE = 0.15;
const IRREGULAR_SPREAD = 0.25;

export const toMs = (timeH: number): number => timeH * MS_H;

export function routeFamily(route: Route): RouteFamily | null {
    switch (route) {
        case Route.injection: return 'injection';
        case Route.oral: return 'oral';
        case Route.sublingual: return 'sublingual';
        case Route.gel: return 'gel';
        case Route.patchApply: return 'patch';
        default: return null; // patchRemove is the end of a dose, not a dose
    }
}

/** Local midnight of the day containing `ms`. */
export function startOfLocalDay(ms: number): number {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/** Local midnight `n` calendar days after the day containing `ms`. */
export function addLocalDays(ms: number, n: number): number {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    // setFullYear preserves years 0–99 instead of adding the constructor's
    // 1900 offset. Reset again if the source midnight normalized to 01:00.
    d.setFullYear(d.getFullYear(), d.getMonth(), d.getDate() + n);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

/** `dayStartMs` plus a time of day, by the local clock. */
export function atTimeOfDay(dayStartMs: number, minutes: number): number {
    const d = new Date(dayStartMs);
    d.setHours(0, Math.round(minutes), 0, 0);
    return d.getTime();
}

/** Whole calendar days from the day of `a` to the day of `b` (DST-safe). */
export function calendarDaysBetween(aMs: number, bMs: number): number {
    return Math.round((startOfLocalDay(bMs) - startOfLocalDay(aMs)) / (24 * MS_H));
}

export function sameLocalDay(aMs: number, bMs: number): boolean {
    return startOfLocalDay(aMs) === startOfLocalDay(bMs);
}

const minutesOfDay = (ms: number): number => {
    const d = new Date(ms);
    return d.getHours() * 60 + d.getMinutes();
};

function median(values: number[]): number {
    const s = [...values].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Mean time of day on a circle, so 23:50 and 00:10 average to midnight. */
export function circularTimeOfDay(msList: number[]): number {
    if (!msList.length) return 9 * 60;
    let x = 0;
    let y = 0;
    for (const ms of msList) {
        const a = (minutesOfDay(ms) / 1440) * 2 * Math.PI;
        x += Math.cos(a);
        y += Math.sin(a);
    }
    if (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) return minutesOfDay(msList[msList.length - 1]);
    let a = Math.atan2(y, x);
    if (a < 0) a += 2 * Math.PI;
    return Math.round((a / (2 * Math.PI)) * 1440) % 1440;
}

function computeNextDue(kind: RegimenKind, cycleDays: number, intervalH: number, tod: number, lastMs: number, nowMs: number): number {
    if (kind === 'daily') {
        const today = startOfLocalDay(nowMs);
        const takenToday = lastMs >= today;
        return atTimeOfDay(takenToday ? addLocalDays(today, 1) : today, tod);
    }
    if (kind === 'cycle') {
        return atTimeOfDay(addLocalDays(lastMs, cycleDays), tod);
    }
    return lastMs + intervalH * MS_H;
}

/**
 * Every regimen found in `events`, most-used first. Regimens that are irregular
 * or no longer active are still returned (flagged) so callers can decide.
 */
export function inferRegimens(events: DoseEvent[], nowMs: number = Date.now()): Regimen[] {
    const groups = new Map<string, { ester: Ester; family: RouteFamily; events: DoseEvent[] }>();
    for (const e of events) {
        const family = routeFamily(e.route);
        if (!family || !Number.isFinite(e.timeH)) continue;
        const key = `${e.ester}:${family}`;
        let g = groups.get(key);
        if (!g) { g = { ester: e.ester, family, events: [] }; groups.set(key, g); }
        g.events.push(e);
    }

    const out: Regimen[] = [];
    for (const [key, g] of groups) {
        const sorted = [...g.events].sort((a, b) => a.timeH - b.timeH);
        // Two entries logged minutes apart (a double tap, a split dose) are one dose.
        const doses: DoseEvent[] = [];
        for (const e of sorted) {
            const prev = doses[doses.length - 1];
            if (prev && e.timeH - prev.timeH < 2) continue;
            doses.push(e);
        }
        if (doses.length < MIN_EVENTS) continue;

        const recent = doses.slice(-(MAX_GAPS + 1));
        const gaps: number[] = [];
        for (let i = 1; i < recent.length; i++) gaps.push(recent[i].timeH - recent[i - 1].timeH);
        const intervalH = median(gaps);
        if (!(intervalH > 0)) continue;

        let kind: RegimenKind;
        let cycleDays: number;
        if (Math.abs(intervalH - 24) / 24 <= DAILY_TOLERANCE) {
            kind = 'daily';
            cycleDays = 1;
        } else if (Math.round(intervalH / 24) >= 2) {
            kind = 'cycle';
            cycleDays = Math.round(intervalH / 24);
        } else {
            kind = 'interval';
            cycleDays = 0;
        }

        // Spread: median absolute deviation of the gaps, relative to the median.
        // A daily regimen with the odd missed day (a 48 h gap) stays regular.
        const mad = median(gaps.map(g2 => Math.abs(g2 - intervalH)));
        const regular = mad / intervalH <= IRREGULAR_SPREAD;

        const last = doses[doses.length - 1];
        const lastMs = toMs(last.timeH);
        // Rounded to a quarter hour: a schedule reads "21:00", not "21:03".
        const tod = (Math.round(circularTimeOfDay(recent.map(e => toMs(e.timeH))) / 15) * 15) % 1440;
        const staleAfterH = Math.max(intervalH * 3, 7 * 24);
        const active = nowMs - lastMs <= staleAfterH * MS_H && lastMs <= nowMs + 24 * MS_H;

        out.push({
            key,
            ester: g.ester,
            family: g.family,
            kind,
            intervalH,
            cycleDays,
            timeOfDayMin: tod,
            events: doses,
            last,
            nextDueMs: computeNextDue(kind, cycleDays, intervalH, tod, lastMs, nowMs),
            regular,
            active,
        });
    }
    return out.sort((a, b) => b.events.length - a.events.length);
}

/** Regimens worth showing: active and keeping to a rhythm. */
export function usableRegimens(regimens: Regimen[]): Regimen[] {
    return regimens.filter(r => r.active && r.regular);
}

/** The hormone the level is about: estradiol in feminizing mode, testosterone in masculinizing. */
export function isPrimaryHormone(ester: Ester, isTransmasc: boolean): boolean {
    if (isTransmasc) return isTestosteroneEster(ester);
    return ester !== Ester.CPA && !isTestosteroneEster(ester);
}

// ── Cycle (outer ring) ───────────────────────────────────────────────────────

export interface CycleState {
    regimen: Regimen;
    /** N days in the cycle. */
    cycleDays: number;
    /** Local midnight of the day of the last dose: day 1 of the cycle. */
    cycleStartMs: number;
    /** 1-based day of the cycle today, clamped to N. */
    day: number;
    /** Today is past the cycle's last day, or the due time has passed. */
    overdue: boolean;
    /** How far through the cycle "now" is, 0..1 (for the dial's hand). */
    fraction: number;
    lastDoseMs: number;
    nextDueMs: number;
}

export function cycleState(regimen: Regimen, nowMs: number = Date.now()): CycleState | null {
    if (regimen.kind !== 'cycle' || regimen.cycleDays < 2) return null;
    const n = regimen.cycleDays;
    const lastDoseMs = toMs(regimen.last.timeH);
    // An explicit schedule's cycle runs up to its next occurrence, whatever the log says.
    const cycleStartMs = regimen.schedule
        ? addLocalDays(regimen.nextDueMs, -n)
        : startOfLocalDay(lastDoseMs);
    const cycleEndMs = addLocalDays(cycleStartMs, n);
    const daysIn = calendarDaysBetween(cycleStartMs, nowMs);
    const fraction = Math.min(1, Math.max(0, (nowMs - cycleStartMs) / (cycleEndMs - cycleStartMs)));
    return {
        regimen,
        cycleDays: n,
        cycleStartMs,
        day: Math.min(n, Math.max(1, daysIn + 1)),
        overdue: nowMs >= regimen.nextDueMs,
        fraction,
        lastDoseMs,
        nextDueMs: regimen.nextDueMs,
    };
}

// ── Daily slots (inner ring) ─────────────────────────────────────────────────

/**
 * taken: a dose was logged that day. missed: the day is over with none logged
 * ("not logged", never "missed" in the UI). due: later today. dueNow: the time
 * has passed today and nothing is logged yet. upcoming: a future day. none: the
 * regimen hadn't started yet.
 */
export type SlotState = 'taken' | 'missed' | 'due' | 'dueNow' | 'upcoming' | 'none';

export interface DailySlot {
    dayStartMs: number;
    /** The usual dose time on that day. */
    dueMs: number;
    state: SlotState;
    /** The logged dose, when taken. */
    event?: DoseEvent;
}

/** One slot per calendar day, starting at the day containing `startMs`. */
export function dailySlots(regimen: Regimen, startMs: number, days: number, nowMs: number = Date.now()): DailySlot[] {
    const today = startOfLocalDay(nowMs);
    const firstMs = regimen.events.length ? toMs(regimen.events[0].timeH) : Infinity;
    const firstDay = startOfLocalDay(Math.min(firstMs, regimen.schedule?.createdAt ?? firstMs));
    const byDay = new Map<number, DoseEvent>();
    for (const e of regimen.events) {
        const d = startOfLocalDay(toMs(e.timeH));
        if (!byDay.has(d)) byDay.set(d, e);
    }
    const slots: DailySlot[] = [];
    for (let i = 0; i < days; i++) {
        const dayStartMs = addLocalDays(startMs, i);
        if (regimen.schedule?.cadence.kind === 'daily') {
            const s = regimen.schedule;
            const occurrences = occurrencesBetween(s, dayStartMs, addLocalDays(dayStartMs, 1))
                .filter(ms => ms >= s.createdAt);
            const pending = occurrences.filter(ms => !isSatisfied(ms, s, regimen.events));
            const dueMs = pending[0] ?? occurrences[0] ?? atTimeOfDay(dayStartMs, regimen.timeOfDayMin);
            const state: SlotState = !occurrences.length ? 'none'
                : !pending.length ? 'taken'
                : dayStartMs < today ? 'missed'
                : dayStartMs === today ? nowMs >= dueMs ? 'dueNow' : 'due'
                : 'upcoming';
            slots.push({ dayStartMs, dueMs, state, event: state === 'taken' ? byDay.get(dayStartMs) : undefined });
            continue;
        }
        const dueMs = atTimeOfDay(dayStartMs, regimen.timeOfDayMin);
        const event = byDay.get(dayStartMs);
        let state: SlotState;
        if (event) state = 'taken';
        else if (dayStartMs < firstDay) state = 'none';
        else if (dayStartMs < today) state = 'missed';
        else if (dayStartMs === today) state = nowMs >= dueMs ? 'dueNow' : 'due';
        else state = 'upcoming';
        slots.push({ dayStartMs, dueMs, state, event });
    }
    return slots;
}

/** The last `days` days of a daily regimen, ending today. */
export function recentDailySlots(regimen: Regimen, nowMs: number = Date.now(), days = 7): DailySlot[] {
    return dailySlots(regimen, addLocalDays(nowMs, -(days - 1)), days, nowMs);
}

// ── Picking what the dial shows ──────────────────────────────────────────────

export interface DialRegimens {
    /** Outer ring: the multi-day cycle (usually the injection). */
    outer: Regimen | null;
    /** Inner ring: a daily regimen (cyproterone first in feminizing mode). */
    inner: Regimen | null;
}

export function pickDialRegimens(regimens: Regimen[], isTransmasc: boolean): DialRegimens {
    const usable = usableRegimens(regimens);
    // The dial draws one segment per day, so very long depots (undecanoate every
    // 10+ weeks) don't fit; they still show in "Coming up".
    const cycles = usable.filter(r => r.kind === 'cycle' && r.cycleDays <= 28);
    const outer = cycles.find(r => isPrimaryHormone(r.ester, isTransmasc)) ?? cycles[0] ?? null;
    const dailies = usable.filter(r => r.kind === 'daily');
    const inner =
        (!isTransmasc ? dailies.find(r => r.ester === Ester.CPA) : undefined) ??
        dailies.find(r => !isPrimaryHormone(r.ester, isTransmasc)) ??
        dailies[0] ??
        null;
    return { outer, inner };
}

// ── Coming up ────────────────────────────────────────────────────────────────

export interface UpcomingDose {
    regimen: Regimen;
    dueMs: number;
    /** The due time has passed and nothing is logged. */
    overdue: boolean;
}

/** The next dose of every usable regimen, soonest first. */
export function upcomingDoses(regimens: Regimen[], nowMs: number = Date.now()): UpcomingDose[] {
    return usableRegimens(regimens)
        .map(r => ({ regimen: r, dueMs: r.nextDueMs, overdue: r.nextDueMs <= nowMs }))
        .sort((a, b) => a.dueMs - b.dueMs);
}

/** The single next dose (overdue ones first), or null. */
export function nextDose(regimens: Regimen[], nowMs: number = Date.now()): UpcomingDose | null {
    return upcomingDoses(regimens, nowMs)[0] ?? null;
}

// ── Projection ───────────────────────────────────────────────────────────────

/** How far ahead the "if you keep your schedule" line looks. */
export const PROJECTION_DAYS = 14;

/**
 * The doses that continue each usable regimen from `fromMs` for `days` days:
 * the same route, ester, amount and extras as its latest dose, at its usual
 * interval and time of day. A dose already overdue is placed at `fromMs` (taken
 * now) and the schedule carries on from there. A slot that already holds a
 * logged dose (one entered ahead of time) is skipped rather than doubled.
 * Ids are prefixed "planned-" so they can never collide with a logged dose.
 *
 * With `schedules`, each active schedule replaces the inferred regimen for the
 * same ester and route family (see mergeRegimens); the log used to tell which
 * occurrences are already taken is the doses held by `regimens`. Callers that
 * have the full log should pass `regimensFor(events, schedules, nowMs)` instead.
 * Regimens that come from a schedule follow its exact times.
 */
export function plannedEvents(regimens: Regimen[], fromMs: number, days: number, schedules?: Schedule[]): DoseEvent[] {
    if (schedules?.length) {
        const log = regimens.flatMap(r => r.events);
        regimens = mergeRegimens(regimens, scheduleRegimens(schedules, log, fromMs));
    }
    const endMs = fromMs + days * 24 * MS_H;
    const out: DoseEvent[] = [];
    for (const r of usableRegimens(regimens)) {
        const tolH = Math.min(12, r.intervalH / 2);
        const logged = r.events.map(e => e.timeH);
        const last = r.last;
        const doseAt = (dueMs: number, i: number): DoseEvent => {
            const extras = { ...last.extras };
            // A planned patch comes off when the next one goes on. Without
            // this, a routine logged with separate removals would leave every
            // planned patch on the skin for good.
            if (r.family === 'patch' && !(Number(extras[ExtraKey.patchWearH]) > 0)) {
                extras[ExtraKey.patchWearH] = r.intervalH;
            }
            return {
                id: `planned-${r.key}-${i}`,
                route: last.route,
                timeH: dueMs / MS_H,
                doseMG: last.doseMG,
                ester: last.ester,
                extras,
            };
        };
        if (r.schedule) {
            const s = r.schedule;
            let i = 0;
            // An overdue occurrence is taken now, like an inferred one.
            if (r.nextDueMs < fromMs) out.push(doseAt(fromMs, i++));
            const occ = occurrencesBetween(s, Math.max(fromMs, r.nextDueMs), endMs + 1);
            for (const ms of occ) {
                if (ms === fromMs && i > 0) continue;
                if (isSatisfied(ms, s, r.events)) continue;
                out.push(doseAt(ms, i++));
            }
            continue;
        }
        const nextAfter = (ms: number): number => {
            if (r.kind === 'daily') return atTimeOfDay(addLocalDays(ms, 1), r.timeOfDayMin);
            if (r.kind === 'cycle') return atTimeOfDay(addLocalDays(ms, r.cycleDays), r.timeOfDayMin);
            return ms + r.intervalH * MS_H;
        };
        let dueMs = Math.max(r.nextDueMs, fromMs);
        for (let i = 0; dueMs <= endMs && i < 1000; i++) {
            const h = dueMs / MS_H;
            if (!logged.some(l => Math.abs(l - h) < tolH)) out.push(doseAt(dueMs, i));
            const next = nextAfter(dueMs);
            if (!(next > dueMs)) break;
            dueMs = next;
        }
    }
    return out.sort((a, b) => a.timeH - b.timeH);
}

// ── Explicit schedules ───────────────────────────────────────────────────────

/**
 * When the schedule's next dose is due: the latest occurrence that has come
 * (within one interval, not before the schedule was created) if nothing was
 * logged for it, otherwise the first later occurrence not already logged.
 */
function scheduleNextDue(s: Schedule, events: DoseEvent[], nowMs: number): number {
    const lookback = Math.max(s.createdAt, addLocalDays(nowMs, -intervalDays(s)));
    const past = occurrencesBetween(s, lookback, nowMs + 1);
    const latest = past[past.length - 1];
    if (latest !== undefined && !isSatisfied(latest, s, events)) return latest;
    const ahead = nextOccurrences(s, Math.max(nowMs + 1, s.createdAt), 16);
    return ahead.find(ms => !isSatisfied(ms, s, events)) ?? ahead[ahead.length - 1] ?? nowMs;
}

/**
 * The regimen an explicit schedule stands for, in the same shape the dial,
 * Coming up and the projection use. Null for an inactive schedule or one whose
 * route is not a dose (patch removal).
 */
export function scheduleToRegimen(s: Schedule, events: DoseEvent[], nowMs: number = Date.now()): Regimen | null {
    if (!s.active) return null;
    const family = routeFamily(s.route);
    const times = scheduleTimes(s);
    if (!family || !times.length) return null;
    const n = intervalDays(s);
    const perDay = s.cadence.kind === 'daily' ? times.length : 1;
    const kind: RegimenKind = n >= 2 ? 'cycle' : 'daily';
    const matching = events
        .filter(e => Number.isFinite(e.timeH) && doseMatchesSchedule(s, e))
        .sort((a, b) => a.timeH - b.timeH);
    const lastLogged = matching[matching.length - 1];
    const last: DoseEvent = {
        id: `schedule-${s.id}`,
        route: s.route,
        ester: s.ester,
        doseMG: s.doseMG,
        extras: { ...s.extras },
        timeH: lastLogged ? lastLogged.timeH : s.createdAt / MS_H,
    };
    return {
        key: `${s.ester}:${family}:${s.id}`,
        ester: s.ester,
        family,
        kind,
        intervalH: (n * 24) / perDay,
        cycleDays: n,
        timeOfDayMin: times[0],
        events: matching,
        last,
        nextDueMs: scheduleNextDue(s, events, nowMs),
        regular: true,
        active: true,
        schedule: s,
    };
}

/** Regimens for every active schedule, with each logged dose assigned once. */
export function scheduleRegimens(schedules: Schedule[], events: DoseEvent[], nowMs: number = Date.now()): Regimen[] {
    const assigned = assignScheduleEvents(schedules, events);
    return schedules.map(s => scheduleToRegimen(s, assigned.get(s.id) ?? [], nowMs))
        .filter((r): r is Regimen => r !== null);
}

/**
 * Explicit regimens first, then every inferred regimen for a medicine and route
 * family that has no explicit schedule.
 */
export function mergeRegimens(inferred: Regimen[], explicit: Regimen[]): Regimen[] {
    const keys = new Set(explicit.map(r => `${r.ester}:${r.family}`));
    return [...explicit, ...inferred.filter(r => !keys.has(`${r.ester}:${r.family}`))];
}

/**
 * The regimens to show: an active schedule wins for its ester and route family,
 * and inference from the log fills in for medicines without one. With no
 * schedules this is exactly inferRegimens.
 */
export function regimensFor(events: DoseEvent[], schedules: Schedule[] = [], nowMs: number = Date.now()): Regimen[] {
    const inferred = inferRegimens(events, nowMs);
    if (!schedules.length) return inferred;
    return mergeRegimens(inferred, scheduleRegimens(schedules, events, nowMs));
}
