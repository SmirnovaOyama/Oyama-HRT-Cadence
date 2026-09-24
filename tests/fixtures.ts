// Shared builders for the routine tests. Every test file sets TZ first so the
// local-time maths (and the DST cases) are the same on every machine.
process.env.TZ = 'Europe/Berlin';

import { Ester, Route } from '../logic';
import type { DoseEvent } from '../logic';
import type { Schedule, SupplyItem } from '../src/types/routine';

export const at = (y: number, mo: number, d: number, h = 0, mi = 0): number => new Date(y, mo - 1, d, h, mi).getTime();

export function schedule(p: Partial<Schedule> = {}): Schedule {
    return {
        id: 's1',
        route: Route.sublingual,
        ester: Ester.E2,
        doseMG: 2,
        extras: {},
        cadence: { kind: 'daily', times: [8 * 60, 20 * 60] },
        remind: { enabled: true, leadMin: 0, repeatAfterMin: null },
        active: true,
        createdAt: at(2026, 1, 1),
        ...p,
    };
}

export function dose(ms: number, p: Partial<DoseEvent> = {}): DoseEvent {
    return { id: `d${ms}`, route: Route.sublingual, ester: Ester.E2, doseMG: 2, extras: {}, timeH: ms / 3_600_000, ...p };
}

export function supply(p: Partial<SupplyItem> = {}): SupplyItem {
    return {
        id: 'i1',
        name: 'Estradiol valerate',
        kind: 'vial',
        unit: 'mL',
        amount: 10,
        setAt: at(2026, 9, 1),
        link: { ester: Ester.EV, route: Route.injection },
        perDose: null,
        strengthMG: 40,
        reorderLeadDays: 7,
        createdAt: at(2026, 9, 1),
        ...p,
    };
}
