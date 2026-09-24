import { useEffect, useMemo, useState } from 'react';
import type { DoseEvent } from '../../../logic';
import type { Lang } from '../../i18n/translations';
import type { Schedule, SupplyItem } from '../../types/routine';
import { supplyForecast, type SupplyForecast } from '../../utils/supplies';
import { fmt, type T } from '../today/format';
import { supplyDate } from './shared';

export interface ForecastedSupply {
    item: SupplyItem;
    forecast: SupplyForecast;
}

const MS_DAY = 86_400_000;
/** A soonest run-out further away than this reads as "stocked". */
export const STOCKED_DAYS = 30;

const RANK = { out: 0, reorder_soon: 1, ok: 2 } as const;

/** Most urgent first: out, then time to reorder, then by run-out date
 *  (unknown last), then by name. */
export function sortByUrgency(list: ForecastedSupply[]): ForecastedSupply[] {
    return [...list].sort((a, b) => {
        const r = RANK[a.forecast.status] - RANK[b.forecast.status];
        if (r) return r;
        const ra = a.forecast.runOutMs ?? Infinity;
        const rb = b.forecast.runOutMs ?? Infinity;
        if (ra !== rb) return ra - rb;
        return a.item.name.localeCompare(b.item.name);
    });
}

/** Forecasts for every supply, recomputed each minute so "Reorder soon"
 *  appears without a reload. Keeps the input order. */
export function useSupplyForecasts(
    supplies: SupplyItem[],
    schedules: Schedule[],
    events: DoseEvent[],
    nowMs?: number,
): ForecastedSupply[] {
    const [tick, setTick] = useState(() => Date.now());
    useEffect(() => {
        if (nowMs !== undefined) return;
        const refresh = () => setTick(Date.now());
        const id = window.setInterval(refresh, 60_000);
        window.addEventListener('focus', refresh);
        return () => {
            window.clearInterval(id);
            window.removeEventListener('focus', refresh);
        };
    }, [nowMs]);
    return useMemo(
        () => {
            // Re-read the clock when records change, so a just-logged dose is
            // counted immediately instead of waiting for the next minute tick.
            const now = nowMs ?? Date.now();
            return supplies.map(item => ({ item, forecast: supplyForecast(item, schedules, events, now) }));
        },
        [supplies, schedules, events, nowMs, tick],
    );
}

/** The page's lead sentence: the most urgent state in one line. */
export function supplyLeadText(list: ForecastedSupply[], nowMs: number, lang: Lang, t: T): string {
    if (list.length === 0) return t('supplies.lead.empty');
    const top = sortByUrgency(list)[0];
    const { item, forecast } = top;
    if (forecast.status === 'out') return fmt(t('supplies.lead.out'), { name: item.name });
    // Nothing has a known run-out (no linked doses yet): say how it is counted.
    if (forecast.runOutMs === null) return t('supplies.lead.detail');
    if (forecast.runOutMs - nowMs > STOCKED_DAYS * MS_DAY) {
        return t(list.every(s => s.forecast.runOutMs !== null) ? 'supplies.lead.stocked' : 'supplies.lead.detail');
    }
    const date = supplyDate(forecast.runOutMs, lang);
    if (forecast.reorderByMs === null || forecast.reorderByMs <= nowMs) {
        return fmt(t('supplies.lead.reorder_now'), { name: item.name, date });
    }
    return fmt(t('supplies.lead.runs_out'), { name: item.name, date, by: supplyDate(forecast.reorderByMs, lang) });
}

/** Items that need attention (out or time to reorder), most urgent first. */
export function suppliesNeedingAttention(list: ForecastedSupply[]): ForecastedSupply[] {
    return sortByUrgency(list).filter(s => s.forecast.status !== 'ok');
}
