// Supplies on hand: how much is left, how fast it goes and when to reorder.
// Pure functions, no React. An item is used up by the logged doses that match
// its link (ester and/or route family) after the moment its amount was set.

import { ExtraKey } from '../../logic';
import type { DoseEvent } from '../../logic';
import type { Schedule, SupplyItem } from '../types/routine';
import { routeFamily } from './schedule';
import { intervalDays, scheduleTimes } from './reminders';

const MS_H = 3_600_000;
const MS_DAY = 24 * MS_H;
export const RATE_LOOKBACK_DAYS = 28;

export type SupplyStatus = 'ok' | 'reorder_soon' | 'out';

/** The dose-like fields both a DoseEvent and a Schedule carry. */
type DoseLike = Pick<DoseEvent, 'route' | 'ester' | 'doseMG' | 'extras'>;

/** True when a dose (or a scheduled dose) draws from this item. */
export function itemMatches(item: SupplyItem, dose: Pick<DoseLike, 'route' | 'ester'>): boolean {
    const link = item.link;
    if (!link || (link.ester === undefined && link.route === undefined)) return false;
    const fam = routeFamily(dose.route);
    if (fam === null) return false; // patchRemove ends a dose, it uses nothing
    if (link.ester !== undefined && link.ester !== dose.ester) return false;
    if (link.route !== undefined && routeFamily(link.route) !== fam) return false;
    return true;
}

/**
 * Units one dose uses. An explicit perDose wins; otherwise mg items use the
 * dose in mg, mL uses doseMG / concentration (strengthMG, else the dose's own
 * concentration), tablets and pumps use doseMG / strengthMG when known, and
 * everything else counts one per dose. Returns 0 when it cannot be worked out.
 */
export function unitsPerDose(item: SupplyItem, event: DoseLike): number {
    if (item.perDose !== null && Number.isFinite(item.perDose)) return Math.max(0, item.perDose);
    const strength = item.strengthMG && item.strengthMG > 0 ? item.strengthMG : undefined;
    switch (item.unit) {
        case 'mg':
            return Math.max(0, event.doseMG);
        case 'mL': {
            const conc = strength ?? event.extras?.[ExtraKey.concentrationMGmL];
            return conc && conc > 0 ? Math.max(0, event.doseMG) / conc : 0;
        }
        case 'tablets':
        case 'pumps':
            return strength ? Math.max(0, event.doseMG) / strength : 1;
        default:
            return 1;
    }
}

/** Units used by matching doses logged after the amount was set (up to now). */
export function usedSince(item: SupplyItem, events: DoseEvent[], nowMs: number = Date.now()): number {
    let used = 0;
    for (const e of events) {
        const ms = e.timeH * MS_H;
        if (ms > item.setAt && ms <= nowMs && itemMatches(item, e)) used += unitsPerDose(item, e);
    }
    return used;
}

/** Amount left, never below zero. */
export function remaining(item: SupplyItem, events: DoseEvent[], nowMs: number = Date.now()): number {
    return Math.max(0, item.amount - usedSince(item, events, nowMs));
}

/**
 * Units per day. From the active schedules that draw from this item when there
 * are any, else from matching doses in the last 28 days. 0 when unknown.
 */
export function dailyRate(item: SupplyItem, schedules: Schedule[], events: DoseEvent[], nowMs: number = Date.now()): number {
    const planned = schedules.filter(s => s.active && itemMatches(item, s));
    if (planned.length) {
        return planned.reduce((sum, s) => {
            const perDay = scheduleTimes(s).length / intervalDays(s);
            return sum + perDay * unitsPerDose(item, s);
        }, 0);
    }
    const from = nowMs - RATE_LOOKBACK_DAYS * MS_DAY;
    let used = 0;
    for (const e of events) {
        const ms = e.timeH * MS_H;
        if (ms > from && ms <= nowMs && itemMatches(item, e)) used += unitsPerDose(item, e);
    }
    return used / RATE_LOOKBACK_DAYS;
}

/** Days until it runs out, 0 when out, null when the rate is unknown. */
export function daysLeft(item: SupplyItem, schedules: Schedule[], events: DoseEvent[], nowMs: number = Date.now()): number | null {
    const left = remaining(item, events, nowMs);
    if (left <= 0) return 0;
    const rate = dailyRate(item, schedules, events, nowMs);
    return rate > 0 ? left / rate : null;
}

/** Epoch ms when it runs out, or null when unknown. */
export function runOutDate(item: SupplyItem, schedules: Schedule[], events: DoseEvent[], nowMs: number = Date.now()): number | null {
    const d = daysLeft(item, schedules, events, nowMs);
    return d === null ? null : nowMs + d * MS_DAY;
}

/** Epoch ms by which to reorder (run-out minus reorderLeadDays), or null. */
export function reorderBy(item: SupplyItem, schedules: Schedule[], events: DoseEvent[], nowMs: number = Date.now()): number | null {
    const out = runOutDate(item, schedules, events, nowMs);
    return out === null ? null : out - Math.max(0, item.reorderLeadDays) * MS_DAY;
}

export function status(item: SupplyItem, schedules: Schedule[], events: DoseEvent[], nowMs: number = Date.now()): SupplyStatus {
    if (remaining(item, events, nowMs) <= 0) return 'out';
    const by = reorderBy(item, schedules, events, nowMs);
    return by !== null && nowMs >= by ? 'reorder_soon' : 'ok';
}

export interface SupplyForecast {
    remaining: number;
    dailyRate: number;
    daysLeft: number | null;
    runOutMs: number | null;
    reorderByMs: number | null;
    status: SupplyStatus;
}

/** Everything above in one pass, for a list row. */
export function supplyForecast(item: SupplyItem, schedules: Schedule[], events: DoseEvent[], nowMs: number = Date.now()): SupplyForecast {
    const left = remaining(item, events, nowMs);
    const rate = dailyRate(item, schedules, events, nowMs);
    const days = left <= 0 ? 0 : rate > 0 ? left / rate : null;
    const runOutMs = days === null ? null : nowMs + days * MS_DAY;
    const reorderByMs = runOutMs === null ? null : runOutMs - Math.max(0, item.reorderLeadDays) * MS_DAY;
    const st: SupplyStatus = left <= 0 ? 'out' : reorderByMs !== null && nowMs >= reorderByMs ? 'reorder_soon' : 'ok';
    return { remaining: left, dailyRate: rate, daysLeft: days, runOutMs, reorderByMs, status: st };
}
