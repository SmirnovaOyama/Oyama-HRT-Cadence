import React, { useCallback, useState } from 'react';
import type { DoseEvent } from '../../logic';
import { useTranslation } from '../contexts/LanguageContext';
import type { Schedule, SupplyItem } from '../types/routine';
import { BackHeader, Lead, ListGroup, ListRow, ListStack } from '../components/ui';
import { Plus } from '../components/icons';
import { IconTile } from '../components/today/ComingUp';
import {
    SupplyAttentionPanel,
    SupplyRow,
    SupplySheet,
    suppliesNeedingAttention,
    supplyLeadText,
    useSupplyForecasts,
    type SupplySheetMode,
} from '../components/supplies';
import { YouPage } from './you/shared';

export interface SuppliesPageProps {
    supplies: SupplyItem[];
    schedules: Schedule[];
    events: DoseEvent[];
    /** Transmasculine mode: testosterone takes the accent colour. */
    isTransmasc?: boolean;
    addSupply: (item: SupplyItem) => void;
    updateSupply: (item: SupplyItem) => void;
    deleteSupply: (id: string) => void;
    onBack: () => void;
    /** Fixed clock for previews and tests. */
    nowMs?: number;
}

type SheetState = { mode: SupplySheetMode; item: SupplyItem | null } | null;

/** Supplies (a sub-page of You): what is on hand, counted down from the logged
 *  doses, with the most urgent state first. */
const SuppliesPage: React.FC<SuppliesPageProps> = ({
    supplies,
    schedules,
    events,
    isTransmasc = false,
    addSupply,
    updateSupply,
    deleteSupply,
    onBack,
    nowMs,
}) => {
    const { t, lang } = useTranslation();
    const [sheet, setSheet] = useState<SheetState>(null);
    const forecasts = useSupplyForecasts(supplies, schedules, events, nowMs);
    const now = nowMs ?? Date.now();
    const attention = suppliesNeedingAttention(forecasts);
    const lead = supplyLeadText(forecasts, now, lang, t);
    const detail = t('supplies.lead.detail');

    const close = useCallback(() => setSheet(null), []);
    const save = (item: SupplyItem) => {
        if (sheet?.mode === 'add') addSupply(item);
        else updateSupply(item);
        setSheet(null);
    };
    const remove = (id: string) => {
        deleteSupply(id);
        setSheet(null);
    };
    const refill = (item: SupplyItem) => setSheet({ mode: 'refill', item });

    return (
        <YouPage>
            <BackHeader parentLabel={t('you.title')} onBack={onBack} title={t('supplies.title')} />

            <ListStack className="mt-2">
                <Lead detail={supplies.length > 0 && lead !== detail ? detail : undefined}>{lead}</Lead>

                {attention.length > 0 && (
                    <div className="flex flex-col gap-3">
                        {attention.map(({ item, forecast }, i) => (
                            // The lead already says when the first one runs out.
                            <SupplyAttentionPanel key={item.id} item={item} forecast={forecast} onUpdateAmount={refill} showBody={i > 0} />
                        ))}
                    </div>
                )}

                <ListGroup aria-label={t('supplies.group')}>
                    {forecasts.map(({ item, forecast }) => (
                        <SupplyRow
                            key={item.id}
                            item={item}
                            forecast={forecast}
                            events={events}
                            schedules={schedules}
                            isTransmasc={isTransmasc}
                            onOpen={it => setSheet({ mode: 'edit', item: it })}
                        />
                    ))}
                    <ListRow
                        title={t('supplies.add')}
                        tone="accent"
                        leading={<IconTile kind="neutral" icon={Plus} />}
                        onClick={() => setSheet({ mode: 'add', item: null })}
                    />
                </ListGroup>
            </ListStack>

            {sheet && (
                <SupplySheet
                    key={`${sheet.mode}-${sheet.item?.id ?? 'new'}`}
                    mode={sheet.mode}
                    item={sheet.item}
                    events={events}
                    schedules={schedules}
                    onSave={save}
                    onDelete={remove}
                    onClose={close}
                />
            )}
        </YouPage>
    );
};

export default SuppliesPage;
