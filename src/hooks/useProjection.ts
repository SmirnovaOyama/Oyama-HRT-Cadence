import { useEffect, useMemo, useState } from 'react';
import { DoseEvent, SimulationResult, runSimulation } from '../../logic';
import { PROJECTION_DAYS, plannedEvents, regimensFor } from '../utils/schedule';
import type { Schedule } from '../types/routine';

/**
 * The estimate "if you keep your schedule": the logged doses plus the doses
 * each regular routine would bring over the next two weeks. It is an ordinary
 * SimulationResult, so it can stand in wherever one is expected; the planned
 * doses and the horizon ride along for the chart's outlined triangles.
 */
export interface Projection extends SimulationResult {
    /** The planned doses the projection adds (ids start with "planned-"). */
    planned: DoseEvent[];
    /** The projection is only meaningful up to here (epoch ms). */
    horizonMs: number;
}

export function isProjection(sim: SimulationResult | null | undefined): sim is Projection {
    return !!sim && Array.isArray((sim as Projection).planned) && typeof (sim as Projection).horizonMs === 'number';
}

/** The planned schedule moves with the clock (an overdue dose is planned for
 *  "now"), so the projection is refreshed this often even when nothing changes. */
const REFRESH_MS = 15 * 60_000;

function useSlowClock(enabled: boolean): number {
    const [tick, setTick] = useState(() => Math.floor(Date.now() / REFRESH_MS));
    useEffect(() => {
        if (!enabled) return;
        const id = setInterval(() => setTick(Math.floor(Date.now() / REFRESH_MS)), 60_000);
        return () => clearInterval(id);
    }, [enabled]);
    return tick;
}

/** Build from the complete log: inferred routines omit short histories and
 *  coalesce nearby entries, which are still real doses for explicit schedules. */
export function buildProjection(events: DoseEvent[], weight: number, schedules: Schedule[] = [], nowMs = Date.now()): Projection | null {
    if (events.length === 0 || !(weight > 0)) return null;
    const planned = plannedEvents(regimensFor(events, schedules, nowMs), nowMs, PROJECTION_DAYS);
    if (planned.length === 0) return null;
    let sim: SimulationResult | null = null;
    try {
        sim = runSimulation([...events, ...planned], weight);
    } catch {
        return null;
    }
    if (!sim || sim.timeH.length === 0) return null;
    return { ...sim, planned, horizonMs: nowMs + PROJECTION_DAYS * 24 * 3_600_000 };
}

/**
 * Runs the pharmacokinetic model on `events` plus the planned doses that
 * continue every usable routine for PROJECTION_DAYS days. Null when disabled,
 * when there is no usable routine to continue, or when the model has nothing
 * to say.
 */
export function useProjection({ events, weight, schedules, enabled = true }: {
    events: DoseEvent[];
    weight: number;
    /** Explicit schedules; an active one replaces the routine inferred for
     *  its medicine and route. */
    schedules?: Schedule[];
    enabled?: boolean;
}): Projection | null {
    const tick = useSlowClock(enabled);
    return useMemo(() => {
        return enabled ? buildProjection(events, weight, schedules) : null;
        // `tick` re-plans as the clock moves past due times.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, weight, schedules, enabled, tick]);
}
