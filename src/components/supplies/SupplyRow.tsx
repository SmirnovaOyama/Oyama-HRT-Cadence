import type { DoseEvent } from '../../../logic';
import { useTranslation } from '../../contexts/LanguageContext';
import type { Schedule, SupplyItem } from '../../types/routine';
import type { SupplyForecast } from '../../utils/supplies';
import { Button, ListRow } from '../ui';
import { Attention } from '../icons';
import { fmt } from '../today/format';
import { SupplyBar, SupplyTile, supplyDate, supplyFraction, supplySubLine, supplyTone } from './shared';

export interface SupplyRowProps {
    item: SupplyItem;
    forecast: SupplyForecast;
    events: DoseEvent[];
    schedules: Schedule[];
    isTransmasc?: boolean;
    /** Opens the edit sheet. */
    onOpen?: (item: SupplyItem) => void;
}

/** One supply in a ListGroup: 40px tile, one-line name, one-line state with a
 *  thin bar under it. The state is the amount left ("About 5 mL left, 40
 *  shots"), or, when it matters, the Attention icon with "Reorder soon" or
 *  "Out". No trailing value, so the name keeps the full width (format rule 2). */
export function SupplyRow({ item, forecast, events, schedules, isTransmasc = false, onOpen }: SupplyRowProps) {
    const { t, lang } = useTranslation();
    const line = supplySubLine(item, forecast, { events, schedules, lang, t });
    return (
        <ListRow
            title={<span className="block truncate font-semibold">{item.name}</span>}
            leading={<SupplyTile item={item} isTransmasc={isTransmasc} />}
            sub={
                <>
                    {forecast.status === 'ok' ? (
                        <span className="block truncate">{line}</span>
                    ) : (
                        <span
                            className={`flex items-center gap-1.5 font-semibold ${
                                forecast.status === 'out' ? 'text-[var(--c-danger)]' : 'text-[var(--c-attention)]'
                            }`}
                        >
                            <Attention size={16} className="flex-none" />
                            <span className="truncate">{t(`supplies.status.${forecast.status}`)}</span>
                        </span>
                    )}
                    <span className="mt-2 mb-1 block">
                        <SupplyBar
                            fraction={supplyFraction(item, forecast.remaining)}
                            tone={supplyTone(item, isTransmasc)}
                            status={forecast.status}
                            label={line}
                        />
                    </span>
                </>
            }
            onClick={onOpen ? () => onOpen(item) : undefined}
        />
    );
}

export interface SupplyAttentionPanelProps {
    item: SupplyItem;
    forecast: SupplyForecast;
    /** Opens the "Update amount" sheet for this item. */
    onUpdateAmount?: (item: SupplyItem) => void;
    /** False when the page lead already says when it runs out (the out body still shows). */
    showBody?: boolean;
}

/** Flat attention panel for an item that needs reordering or has run out:
 *  icon and words, then a secondary compact "Update amount". */
export function SupplyAttentionPanel({ item, forecast, onUpdateAmount, showBody = true }: SupplyAttentionPanelProps) {
    const { t, lang } = useTranslation();
    const out = forecast.status === 'out';
    const title = fmt(t(out ? 'supplies.attention.out' : 'supplies.attention.soon'), { name: item.name });
    const body = out
        ? t('supplies.attention.out_body')
        : showBody && forecast.runOutMs !== null
            ? fmt(t('supplies.attention.soon_body'), { date: supplyDate(forecast.runOutMs, lang) })
            : null;
    const tone = out
        ? 'bg-[var(--c-danger-fill)] text-[var(--c-danger)]'
        : 'bg-[var(--c-attention-fill)] text-[var(--c-attention)]';
    return (
        <section className={`flex flex-col gap-3 rounded-2xl p-4 ${tone}`} aria-label={title}>
            <div className="flex items-start gap-2.5">
                <Attention size={22} className="mt-px flex-none" />
                <div className="min-w-0">
                    <h2 className="m-0 text-base font-semibold">{title}</h2>
                    {body && <p className="m-0 mt-1 text-sm text-[var(--c-ink)]">{body}</p>}
                </div>
            </div>
            {onUpdateAmount && (
                <div>
                    <Button variant="secondary" compact onTint onClick={() => onUpdateAmount(item)}>
                        {t('supplies.update_amount')}
                    </Button>
                </div>
            )}
        </section>
    );
}
