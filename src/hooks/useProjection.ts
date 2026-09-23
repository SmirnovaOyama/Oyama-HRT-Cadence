import { useEffect, useMemo, useState } from 'react';
import { DoseEvent, SimulationResult, runSimulation } from '../../logic';
import { PROJECTION_DAYS, inferRegimens, plannedEvents } from '../utils/schedule';

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

/**
 * Runs the pharmacokinetic model on `events` plus the planned doses that
 * continue every usable routine for PROJECTION_DAYS days. Null when disabled,
 * when there is no usable routine to continue, or when the model has nothing
 * to say.
 */
export function useProjection({ events, weight, enabled = true }: {
    events: DoseEvent[];
    weight: number;
    enabled?: boolean;
}): Projection | null {
    const tick = useSlowClock(enabled);
    return useMemo(() => {
        if (!enabled || events.length === 0 || !(weight > 0)) return null;
        const nowMs = Date.now();
        const planned = plannedEvents(inferRegimens(events, nowMs), nowMs, PROJECTION_DAYS);
        if (planned.length === 0) return null;
        let sim: SimulationResult | null = null;
        try {
            sim = runSimulation([...events, ...planned], weight);
        } catch {
            return null;
        }
        if (!sim || sim.timeH.length === 0) return null;
        return { ...sim, planned, horizonMs: nowMs + PROJECTION_DAYS * 24 * 3_600_000 };
        // `tick` re-plans as the clock moves past due times.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, weight, enabled, tick]);
}
