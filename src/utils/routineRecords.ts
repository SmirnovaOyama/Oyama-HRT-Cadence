// Sanitisers for schedules and supplies arriving from outside this device's
// own writes: a file import, an explicit merge, or a cloud sync. Each keeps
// only the fields the app knows, in range, so a malformed or hand-edited
// payload can't carry junk into storage or wedge the reminder maths.

import { v4 as uuidv4 } from 'uuid';
import { DOSE_MG_MAX, Ester, ExtraKey, Route } from '../../logic';
import type {
    Schedule, ScheduleCadence, ScheduleRemind, SupplyItem, SupplyKind, SupplyLink, SupplyUnit,
} from '../types/routine';

/** Same ceiling the dose import uses; past it the payload is rejected outright. */
export const MAX_ROUTINE_ENTRIES = 20000;

const MINUTES_PER_DAY = 24 * 60;
const SUPPLY_KINDS: readonly SupplyKind[] = ['vial', 'tablets', 'patches', 'gel', 'needles', 'other'];
const SUPPLY_UNITS: readonly SupplyUnit[] = ['mL', 'tablets', 'pieces', 'mg', 'pumps'];
const ROUTES = Object.values(Route) as string[];
const ESTERS = Object.values(Ester) as string[];
const EXTRA_KEYS = Object.values(ExtraKey) as string[];

const isObject = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};
const stampOf = (v: unknown): number | undefined => {
    const n = finite(v);
    return n !== null && n > 0 && Number.isFinite(new Date(n).getTime()) ? n : undefined;
};
const minuteOfDay = (v: unknown): number | null => {
    const n = finite(v);
    return n !== null && Number.isInteger(n) && n >= 0 && n < MINUTES_PER_DAY ? n : null;
};

function sanitizeExtras(raw: unknown): Partial<Record<ExtraKey, number>> {
    const out: Partial<Record<ExtraKey, number>> = {};
    if (!isObject(raw)) return out;
    for (const key of EXTRA_KEYS) {
        const n = finite(raw[key]);
        if (n !== null) out[key as ExtraKey] = n;
    }
    return out;
}

function sanitizeCadence(raw: unknown): ScheduleCadence | null {
    if (!isObject(raw)) return null;
    if (raw.kind === 'daily') {
        const times = Array.isArray(raw.times)
            ? [...new Set(raw.times.map(minuteOfDay).filter((n): n is number => n !== null))].sort((a, b) => a - b)
            : [];
        return times.length ? { kind: 'daily', times } : null;
    }
    if (raw.kind === 'every') {
        const days = finite(raw.days);
        const time = minuteOfDay(raw.time);
        const anchor = typeof raw.anchorDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.anchorDate)
            ? raw.anchorDate : null;
        if (days === null || !Number.isInteger(days) || days < 1 || days > 366 || time === null || !anchor) return null;
        return { kind: 'every', days, time, anchorDate: anchor };
    }
    return null;
}

function sanitizeRemind(raw: unknown): ScheduleRemind {
    const src = isObject(raw) ? raw : {};
    const lead = finite(src.leadMin);
    const repeat = finite(src.repeatAfterMin);
    return {
        enabled: src.enabled === true,
        leadMin: lead !== null && lead >= 0 && lead <= MINUTES_PER_DAY ? Math.round(lead) : 0,
        repeatAfterMin: repeat !== null && repeat >= 1 && repeat <= MINUTES_PER_DAY ? Math.round(repeat) : null,
    };
}

export function sanitizeSchedule(item: unknown, now = Date.now()): Schedule | null {
    if (!isObject(item)) return null;
    if (!ROUTES.includes(item.route) || !ESTERS.includes(item.ester)) return null;
    const dose = finite(item.doseMG);
    if (dose === null || dose < 0) return null;
    const cadence = sanitizeCadence(item.cadence);
    if (!cadence) return null;
    const createdAt = stampOf(item.createdAt) ?? now;
    const out: Schedule = {
        id: typeof item.id === 'string' && item.id ? item.id : uuidv4(),
        route: item.route as Route,
        ester: item.ester as Ester,
        doseMG: Math.min(DOSE_MG_MAX, dose),
        extras: sanitizeExtras(item.extras),
        cadence,
        remind: sanitizeRemind(item.remind),
        active: item.active !== false,
        createdAt,
    };
    const updatedAt = stampOf(item.updatedAt);
    if (updatedAt !== undefined) out.updatedAt = updatedAt;
    return out;
}

function sanitizeLink(raw: unknown): SupplyLink | null {
    if (!isObject(raw)) return null;
    const link: SupplyLink = {};
    if (ESTERS.includes(raw.ester)) link.ester = raw.ester as Ester;
    if (ROUTES.includes(raw.route)) link.route = raw.route as Route;
    return link.ester || link.route ? link : null;
}

export function sanitizeSupply(item: unknown, now = Date.now()): SupplyItem | null {
    if (!isObject(item)) return null;
    const amount = finite(item.amount);
    if (amount === null || amount < 0) return null;
    const createdAt = stampOf(item.createdAt) ?? now;
    const perDose = finite(item.perDose);
    const strength = finite(item.strengthMG);
    const lead = finite(item.reorderLeadDays);
    const out: SupplyItem = {
        id: typeof item.id === 'string' && item.id ? item.id : uuidv4(),
        name: typeof item.name === 'string' ? item.name.slice(0, 200) : '',
        kind: SUPPLY_KINDS.includes(item.kind) ? item.kind : 'other',
        unit: SUPPLY_UNITS.includes(item.unit) ? item.unit : 'pieces',
        amount,
        setAt: stampOf(item.setAt) ?? createdAt,
        link: sanitizeLink(item.link),
        perDose: perDose !== null && perDose > 0 ? perDose : null,
        reorderLeadDays: lead !== null && lead >= 0 && lead <= 365 ? Math.round(lead) : 7,
        createdAt,
    };
    if (strength !== null && strength > 0) out.strengthMG = strength;
    const updatedAt = stampOf(item.updatedAt);
    if (updatedAt !== undefined) out.updatedAt = updatedAt;
    return out;
}

function sanitizeList<T>(raw: unknown, one: (item: unknown, now: number) => T | null): T[] {
    if (!Array.isArray(raw)) return [];
    if (raw.length > MAX_ROUTINE_ENTRIES) throw new Error('Too many entries');
    const now = Date.now();
    return raw.map(item => one(item, now)).filter((x): x is T => x !== null);
}

/** Keep the valid schedules of a list; anything but an array is none. Throws past the ceiling. */
export const sanitizeSchedules = (raw: unknown): Schedule[] => sanitizeList(raw, sanitizeSchedule);

/** Keep the valid supplies of a list; anything but an array is none. Throws past the ceiling. */
export const sanitizeSupplies = (raw: unknown): SupplyItem[] => sanitizeList(raw, sanitizeSupply);
