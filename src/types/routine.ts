// Planned routines (schedules with reminders) and supplies on hand. Both travel
// inside the end-to-end encrypted cloud backup like doses do, and never in share
// links.

import type { DoseEvent, Ester, ExtraKey, Route } from '../../logic';

export type { DoseEvent };

export type ScheduleCadence =
    | { kind: 'daily'; /** Minutes after local midnight. */ times: number[] }
    | {
          kind: 'every';
          days: number;
          /** Minutes after local midnight. */
          time: number;
          /** YYYY-MM-DD (local) of one occurrence. */
          anchorDate: string;
      };

export interface ScheduleRemind {
    enabled: boolean;
    /** Remind this many minutes before the occurrence. */
    leadMin: number;
    /** Nag again after this many minutes, or null for once. */
    repeatAfterMin: number | null;
}

export interface Schedule {
    id: string;
    route: Route;
    ester: Ester;
    doseMG: number;
    extras: Partial<Record<ExtraKey, number>>;
    cadence: ScheduleCadence;
    remind: ScheduleRemind;
    active: boolean;
    createdAt: number;
    updatedAt?: number;
}

export type SupplyKind = 'vial' | 'tablets' | 'patches' | 'gel' | 'needles' | 'other';
export type SupplyUnit = 'mL' | 'tablets' | 'pieces' | 'mg' | 'pumps';

export interface SupplyLink {
    ester?: Ester;
    route?: Route;
}

export interface SupplyItem {
    id: string;
    name: string;
    kind: SupplyKind;
    unit: SupplyUnit;
    /** Amount on hand when it was last set. */
    amount: number;
    /** Epoch ms when `amount` was set; only doses after this use it up. */
    setAt: number;
    /** Which doses draw from this item, or null for a manual-only item. */
    link: SupplyLink | null;
    /** Units used per matching dose; null derives it from the dose (see unitsPerDose). */
    perDose: number | null;
    /** mg per unit (per mL, per tablet, per pump...) used to derive units from doseMG. */
    strengthMG?: number;
    reorderLeadDays: number;
    createdAt: number;
    updatedAt?: number;
}
