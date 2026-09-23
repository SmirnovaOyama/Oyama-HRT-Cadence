import React from 'react';
import { DoseEvent, Ester, isTestosteroneEster } from '../../../logic';
import type { Lang } from '../../i18n/translations';
import { ListGroup, ListRow } from '../ui';
import { ChevronRight, Gel, Injection, Patch, Sublingual, Tablet, type IconComponent } from '../icons';
import { RouteFamily, UpcomingDose } from '../../utils/schedule';
import { T, doseText, fmt, formatTime, medName, medShort, relativeTime, routeNoun, whenRow } from './format';

export const ROUTE_ICON: Record<RouteFamily, IconComponent> = {
    injection: Injection,
    oral: Tablet,
    sublingual: Sublingual,
    gel: Gel,
    patch: Patch,
};

type TileKind = 'estradiol' | 'cyproterone' | 'neutral';

const TILE: Record<TileKind, string> = {
    estradiol: 'bg-[var(--c-accent-container)] text-[var(--c-accent)]',
    cyproterone: 'bg-[var(--c-second-tint)] text-[var(--c-second)]',
    neutral: 'bg-[var(--c-plate)] text-[var(--c-muted)]',
};

/** Tile colour per medicine: the level's hormone in the accent, cyproterone in the second colour. */
export function tileKind(ester: Ester, isTransmasc: boolean): TileKind {
    if (ester === Ester.CPA) return 'cyproterone';
    if (isTransmasc ? isTestosteroneEster(ester) : !isTestosteroneEster(ester)) return 'estradiol';
    return 'neutral';
}

export const IconTile: React.FC<{ kind: TileKind; icon: IconComponent }> = ({ kind, icon: Icon }) => (
    <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${TILE[kind]}`}>
        <Icon size={20} />
    </span>
);

/** "Cyproterone acetate 12.5 mg, tablet": the full wording, for screen readers
 *  and anywhere a sentence has room. */
export function doseTitle(event: DoseEvent, family: RouteFamily, t: T): string {
    return fmt(t('today.row.title'), { med: medName(event.ester, t), dose: doseText(event), route: routeNoun(family, t) });
}

/** "Cyproterone 12.5 mg": the one-line row title. The tile already shows the route. */
export function doseRowTitle(event: DoseEvent, t: T): string {
    return fmt(t('today.row.dose_title'), { med: medShort(event.ester, t), dose: doseText(event) });
}

export interface LogDosePrefill {
    route: DoseEvent['route'];
    ester: Ester;
    doseMG: number;
    /** Hours since 1970, the due time (or now when already due). */
    timeH: number;
    extras: DoseEvent['extras'];
}

export function prefillFor(item: UpcomingDose, nowMs: number): LogDosePrefill {
    const last = item.regimen.last;
    const whenMs = item.overdue ? nowMs : item.dueMs;
    return { route: last.route, ester: last.ester, doseMG: last.doseMG, timeH: whenMs / 3_600_000, extras: { ...last.extras } };
}

interface ComingUpProps {
    items: UpcomingDose[];
    nowMs: number;
    lang: Lang;
    t: T;
    isTransmasc: boolean;
    onOpen?: (item: UpcomingDose) => void;
}

/** The next dose of each routine, soonest first (format_rules 1-3): a one-line
 *  title with the medicine and amount, and one state line with when it is due
 *  and how long until then. No trailing value, so the title keeps the row. */
const ComingUp: React.FC<ComingUpProps> = ({ items, nowMs, lang, t, isTransmasc, onOpen }) => (
    <ListGroup chevronIcon={<ChevronRight size={16} />} aria-label={t('today.coming_up')}>
        {items.map(item => {
            const { regimen } = item;
            const rel = relativeTime(item.dueMs, nowMs, lang);
            const when = item.overdue
                ? fmt(t('today.row.due_since'), { time: formatTime(item.dueMs, lang) })
                : whenRow(item.dueMs, nowMs, lang, t);
            const sub = (
                <span className={item.overdue ? 'text-[var(--c-attention)]' : undefined}>
                    {`${when}${t('today.list_sep')}${rel}`}
                </span>
            );
            const rowProps = onOpen ? { onClick: () => onOpen(item), drillIn: true } : {};
            return (
                <ListRow
                    key={regimen.key}
                    leading={<IconTile kind={tileKind(regimen.ester, isTransmasc)} icon={ROUTE_ICON[regimen.family]} />}
                    title={
                        <span className="font-semibold">
                            {doseRowTitle(regimen.last, t)}
                            {/* The tile shows the route; screen readers hear it. */}
                            <span className="sr-only">{`${t('today.list_sep')}${routeNoun(regimen.family, t)}`}</span>
                        </span>
                    }
                    sub={sub}
                    {...rowProps}
                />
            );
        })}
    </ListGroup>
);

export default ComingUp;
