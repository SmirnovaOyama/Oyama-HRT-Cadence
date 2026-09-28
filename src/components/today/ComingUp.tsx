import React from 'react';
import { DoseEvent, Ester } from '../../../logic';
import type { Lang } from '../../i18n/translations';
import { ListGroup, ListRow, RowGlyph } from '../ui';
import { ChevronRight, Gel, Injection, Patch, Sublingual, Tablet, type IconComponent } from '../icons';
import type { ForecastedSupply } from '../supplies/useSupplyForecasts';
import { supplyDate, supplyIcon } from '../supplies/shared';
import { RouteFamily, UpcomingDose } from '../../utils/schedule';
import { T, doseText, fmt, formatTime, medName, medShort, relativeTime, routeNoun, whenRow } from './format';

export const ROUTE_ICON: Record<RouteFamily, IconComponent> = {
    injection: Injection,
    oral: Tablet,
    sublingual: Sublingual,
    gel: Gel,
    patch: Patch,
};

/** "Cyproterone acetate 12.5 mg, tablet": the full wording, for screen readers
 *  and anywhere a sentence has room. */
export function doseTitle(event: DoseEvent, family: RouteFamily, t: T): string {
    return fmt(t('today.row.title'), { med: medName(event.ester, t), dose: doseText(event), route: routeNoun(family, t) });
}

/** "Cyproterone 12.5 mg": the one-line row title. The glyph already shows the route. */
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
    scheduleOccurrence?: DoseEvent['scheduleOccurrence'];
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
    onOpen?: (item: UpcomingDose) => void;
    /** Supplies that are out or due for reordering, most urgent first. Each
     *  gets a "Reorder <name>" row after the doses. */
    reorders?: ForecastedSupply[];
    onOpenSupplies?: () => void;
}

/** The next dose of each routine, soonest first (format_rules 1-3): a one-line
 *  title with the medicine and amount, and one state line with when it is due
 *  and how long until then. No trailing value, so the title keeps the row. */
const ComingUp: React.FC<ComingUpProps> = ({ items, nowMs, lang, t, onOpen, reorders = [], onOpenSupplies }) => (
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
                    leading={<RowGlyph icon={ROUTE_ICON[regimen.family]} />}
                    title={
                        <span className="font-medium">
                            {doseRowTitle(regimen.last, t)}
                            {/* The glyph shows the route; screen readers hear it. */}
                            <span className="sr-only">{`${t('today.list_sep')}${routeNoun(regimen.family, t)}`}</span>
                        </span>
                    }
                    sub={sub}
                    {...rowProps}
                />
            );
        })}
        {reorders.map(({ item, forecast }) => {
            const Icon = supplyIcon(item.kind);
            const sub = forecast.status === 'out' ? t('today.reorder.out')
                : forecast.runOutMs !== null ? fmt(t('today.reorder.runs_out'), { date: supplyDate(forecast.runOutMs, lang) })
                    : t('today.reorder.soon');
            const rowProps = onOpenSupplies ? { onClick: onOpenSupplies, drillIn: true } : {};
            return (
                <ListRow
                    key={`supply-${item.id}`}
                    leading={<RowGlyph icon={Icon} tone="attention" />}
                    title={<span className="block truncate font-medium">{fmt(t('today.reorder.title'), { name: item.name })}</span>}
                    sub={<span className="text-[var(--c-attention)]">{sub}</span>}
                    {...rowProps}
                />
            );
        })}
    </ListGroup>
);

export default ComingUp;
