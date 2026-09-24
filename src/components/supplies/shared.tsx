import { Ester, Route } from '../../../logic';
import type { DoseEvent } from '../../../logic';
import type { Lang } from '../../i18n/translations';
import type { Schedule, SupplyItem, SupplyKind, SupplyLink, SupplyUnit } from '../../types/routine';
import type { SupplyForecast, SupplyStatus } from '../../utils/supplies';
import { itemMatches, unitsPerDose } from '../../utils/supplies';
import { routeFamily } from '../../utils/schedule';
import { Gel, Injection, Patch, Supplies, Tablet, type IconComponent } from '../icons';
import { fmt, localeFor, medName, routeNoun, type T } from '../today/format';
import { tileKind } from '../today/ComingUp';

/* Small pieces of the Supplies UI, shared by the page, the sheet and anything
   else that shows a supply (a Today card, the You list). No shadows, no dots:
   status is words in the attention or danger colour. */

const NBSP = '\u00A0';

/** Icon for a supply kind: a vial is drawn as the syringe, needles and
 *  anything else as the package. */
export function supplyIcon(kind: SupplyKind): IconComponent {
    switch (kind) {
        case 'vial': return Injection;
        case 'tablets': return Tablet;
        case 'patches': return Patch;
        case 'gel': return Gel;
        default: return Supplies;
    }
}

type Tone = 'estradiol' | 'cyproterone' | 'neutral';

const TILE_CLASS: Record<Tone, string> = {
    estradiol: 'bg-[var(--c-accent-container)] text-[var(--c-accent)]',
    cyproterone: 'bg-[var(--c-second-tint)] text-[var(--c-second)]',
    neutral: 'bg-[var(--c-plate)] text-[var(--c-muted)]',
};

const FILL_VAR: Record<Tone, string> = {
    estradiol: 'var(--c-accent)',
    cyproterone: 'var(--c-second)',
    neutral: 'var(--c-control)',
};

/** Medicine colour of an item: its linked medicine, or neutral. */
export function supplyTone(item: Pick<SupplyItem, 'link'>, isTransmasc: boolean): Tone {
    const ester = item.link?.ester;
    return ester ? tileKind(ester, isTransmasc) : 'neutral';
}

/** 40px leading tile: the kind's icon in the linked medicine's colour. */
export function SupplyTile({ item, isTransmasc = false }: { item: Pick<SupplyItem, 'kind' | 'link'>; isTransmasc?: boolean }) {
    const Icon = supplyIcon(item.kind);
    return (
        <span aria-hidden="true" className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${TILE_CLASS[supplyTone(item, isTransmasc)]}`}>
            <Icon size={22} />
        </span>
    );
}

/** Units that make sense for a kind. The first is the default; one option means
 *  no unit picker is shown. */
export const UNITS_FOR_KIND: Record<SupplyKind, SupplyUnit[]> = {
    vial: ['mL'],
    tablets: ['tablets'],
    patches: ['pieces'],
    gel: ['pumps', 'mg'],
    needles: ['pieces'],
    other: ['pieces', 'mL', 'mg', 'tablets'],
};

export const defaultUnit = (kind: SupplyKind): SupplyUnit => UNITS_FOR_KIND[kind][0];

/** Short label of a unit, for the unit picker ("mL", "Tablets"). */
export function unitLabel(unit: SupplyUnit, t: T): string {
    return unit === 'mL' || unit === 'mg' ? unit : t(`supplies.unit.${unit}`);
}

/** A number for display: at most one decimal ("3.8", "6", "0.3"). */
export function formatQuantity(n: number, lang: Lang): string {
    const v = Number.isFinite(n) ? Math.max(0, n) : 0;
    const digits = v > 0 && v < 0.1 ? 2 : 1;
    return new Intl.NumberFormat(localeFor(lang), { maximumFractionDigits: digits }).format(v);
}

/** An amount with its unit, never split across lines ("3.8 mL", "6 tablets"). */
export function formatSupplyAmount(n: number, unit: SupplyUnit, lang: Lang, t: T): string {
    const q = formatQuantity(n, lang);
    const text = unit === 'mL' || unit === 'mg' ? `${q} ${unit}` : fmt(t(`supplies.amount.${unit}`), { n: q });
    return text.replace(/ /g, NBSP);
}

/** "Sat Oct 17", with non-breaking spaces. */
export function supplyDate(ms: number, lang: Lang): string {
    return new Intl.DateTimeFormat(localeFor(lang), { weekday: 'short', month: 'short', day: 'numeric' })
        .format(ms)
        .replace(/ /g, NBSP);
}

/** Units one typical dose uses: the latest matching logged dose, else a
 *  matching active schedule. Null when no dose is linked or it cannot be told. */
export function typicalUnitsPerDose(item: SupplyItem, events: DoseEvent[], schedules: Schedule[]): number | null {
    if (!item.link) return null;
    let latest: DoseEvent | null = null;
    for (const e of events) {
        if (itemMatches(item, e) && (!latest || e.timeH > latest.timeH)) latest = e;
    }
    const like = latest ?? schedules.find(s => s.active && itemMatches(item, s)) ?? null;
    if (!like) return null;
    const u = unitsPerDose(item, like);
    return u > 0 ? u : null;
}

/** The one-line state under a supply's title: "About 3.8 mL left, 25 shots". */
export function supplySubLine(
    item: SupplyItem,
    forecast: Pick<SupplyForecast, 'remaining'>,
    ctx: { events: DoseEvent[]; schedules: Schedule[]; lang: Lang; t: T },
): string {
    const { events, schedules, lang, t } = ctx;
    if (forecast.remaining <= 0) return t('supplies.sub.none');
    const amount = formatSupplyAmount(forecast.remaining, item.unit, lang, t);
    const per = typicalUnitsPerDose(item, events, schedules);
    if (per === null) return fmt(t('supplies.sub.left'), { amount });
    const n = Math.floor(forecast.remaining / per + 1e-9);
    if (n < 1) return fmt(t('supplies.sub.left'), { amount });
    const shots = item.link?.route !== undefined && routeFamily(item.link.route) === 'injection';
    return fmt(t(shots ? 'supplies.sub.left_shots' : 'supplies.sub.left_doses'), { amount, n });
}

/** Share of the last set amount still left, 0 to 1. */
export function supplyFraction(item: Pick<SupplyItem, 'amount'>, remainingUnits: number): number {
    if (!(item.amount > 0)) return 0;
    return Math.min(1, Math.max(0, remainingUnits / item.amount));
}

/** Thin flat progress bar: 4px, radius 2, plate-strong track, medicine colour
 *  fill (attention when it is time to reorder, danger when out). */
export function SupplyBar({ fraction, tone = 'neutral', status = 'ok', label }: {
    fraction: number;
    tone?: Tone;
    status?: SupplyStatus;
    /** Accessible name, e.g. the sub-line. */
    label?: string;
}) {
    const fill = status === 'out' ? 'var(--c-danger)' : status === 'reorder_soon' ? 'var(--c-attention)' : FILL_VAR[tone];
    const pct = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
    return (
        <span
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={label}
            className="block h-1 w-full overflow-hidden rounded-[2px] bg-[var(--c-plate-strong)]"
        >
            <span className="block h-full rounded-[2px]" style={{ width: `${pct}%`, background: fill }} />
        </span>
    );
}

/** One linkable medicine: an ester taken by one route family. */
export interface SupplyLinkOption {
    key: string;
    link: SupplyLink;
    label: string;
}

const linkKey = (link: SupplyLink | null): string => {
    if (!link) return 'none';
    const fam = link.route ? routeFamily(link.route) : null;
    return `${link.ester ?? '*'}:${fam ?? '*'}`;
};

export { linkKey as supplyLinkKey };

/** Medicines to link a supply to: every ester and route family in the log and
 *  the schedules, newest first, plus the item's current link. */
export function supplyLinkOptions(
    events: DoseEvent[],
    schedules: Schedule[],
    t: T,
    current?: SupplyLink | null,
): SupplyLinkOption[] {
    const seen = new Map<string, SupplyLinkOption>();
    const add = (ester: Ester | undefined, route: Route | undefined) => {
        const link: SupplyLink = {};
        if (ester !== undefined) link.ester = ester;
        if (route !== undefined) link.route = route;
        const fam = route !== undefined ? routeFamily(route) : null;
        if (route !== undefined && fam === null) return;
        const key = linkKey(link);
        if (key === 'none' || key === '*:*' || seen.has(key)) return;
        const parts = [ester !== undefined ? medName(ester, t) : null, fam ? routeNoun(fam, t) : null].filter(Boolean);
        seen.set(key, { key, link, label: parts.join(', ') });
    };
    if (current) add(current.ester, current.route);
    schedules.filter(s => s.active).forEach(s => add(s.ester, s.route));
    [...events].sort((a, b) => b.timeH - a.timeH).forEach(e => add(e.ester, e.route));
    return [...seen.values()];
}

/** Named kinds, in the order the sheet lists them. */
export const SUPPLY_KINDS: SupplyKind[] = ['vial', 'tablets', 'patches', 'gel', 'needles', 'other'];

/** Default reorder lead time in days. */
export const DEFAULT_REORDER_LEAD_DAYS = 14;

export type { Tone as SupplyTone };
