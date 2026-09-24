import React, { useId, useMemo, useState } from 'react';
import type { DoseEvent } from '../../../logic';
import { useTranslation } from '../../contexts/LanguageContext';
import { useDialog } from '../../contexts/DialogContext';
import type { Schedule, SupplyItem, SupplyKind, SupplyLink, SupplyUnit } from '../../types/routine';
import { Button, ListGroup, ListRow, SegmentedControl } from '../ui';
import { Check } from '../icons';
import { SecondaryPage } from '../ui/SecondaryPage';
import {
    DEFAULT_REORDER_LEAD_DAYS,
    SUPPLY_KINDS,
    UNITS_FOR_KIND,
    defaultUnit,
    supplyLinkKey,
    supplyLinkOptions,
    unitLabel,
} from './shared';
import { inline } from '../today/format';
import { remaining } from '../../utils/supplies';

/* Add, edit or refill one supply on a secondary page.
   A refill ("Update amount") only asks for the amount on hand now and restarts
   the count from this moment. Choices are single-selection list views. */

export type SupplySheetMode = 'add' | 'edit' | 'refill';

export interface SupplySheetProps {
    /** add: a new item. edit: every field. refill: only the amount, which also resets setAt. */
    mode: SupplySheetMode;
    /** The item to edit or refill. Ignored for add. */
    item?: SupplyItem | null;
    /** Logged doses and schedules, to offer the medicines to link. */
    events: DoseEvent[];
    schedules: Schedule[];
    /** Receives the complete item. For add it has a fresh id and createdAt; for
     *  edit and refill it keeps the id. setAt is now whenever the amount changed. */
    onSave: (item: SupplyItem) => void;
    /** Shown in edit mode as "Delete supply" after a confirm. */
    onDelete?: (id: string) => void;
    onClose: () => void;
    /** Starting kind for a new item. */
    initialKind?: SupplyKind;
}

/** Kinds with their own example name; vial and other use the vial example. */
const NAMED_PLACEHOLDER = new Set<SupplyKind>(['tablets', 'patches', 'gel', 'needles']);

const LEAD_WEEKS = [1, 2, 3] as const;
const CHECK = <Check size={22} />;

const newId = (): string =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `sup-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const numStr = (n: number | undefined | null): string => (n === undefined || n === null || !Number.isFinite(n) ? '' : String(n));

const parseNum = (s: string): number => parseFloat(s.replace(',', '.'));

/** Strength label key for a unit, or null when strength does not apply. */
function strengthKey(unit: SupplyUnit): { key: string; suffix: string } | null {
    switch (unit) {
        case 'tablets': return { key: 'supplies.strength.tablets', suffix: 'mg' };
        case 'mL': return { key: 'supplies.strength.vial', suffix: 'mg/mL' };
        case 'pumps': return { key: 'supplies.strength.gel', suffix: 'mg' };
        default: return null;
    }
}

export function SupplySheet({ mode, item, events, schedules, onSave, onDelete, onClose, initialKind = 'vial' }: SupplySheetProps) {
    const { t, lang } = useTranslation();
    const { showDialog } = useDialog();
    const nameId = useId();
    const amountId = useId();
    const strengthId = useId();

    const base = mode === 'add' ? null : item ?? null;
    const [kind, setKind] = useState<SupplyKind>(base?.kind ?? initialKind);
    const [name, setName] = useState(base?.name ?? '');
    const [unit, setUnit] = useState<SupplyUnit>(base?.unit ?? defaultUnit(initialKind));
    const [initialRemaining] = useState(() => base ? remaining(base, events) : undefined);
    const [amountStr, setAmountStr] = useState(mode === 'refill' ? '' : numStr(initialRemaining));
    const [strengthStr, setStrengthStr] = useState(numStr(base?.strengthMG));
    const [link, setLink] = useState<SupplyLink | null>(base?.link ?? null);
    const [leadDays, setLeadDays] = useState<number>(base?.reorderLeadDays ?? DEFAULT_REORDER_LEAD_DAYS);

    const units = UNITS_FOR_KIND[kind];
    const linkOptions = useMemo(() => supplyLinkOptions(events, schedules, t, base?.link), [events, schedules, t, base?.link]);
    const strength = strengthKey(unit);

    const pickKind = (k: SupplyKind) => {
        setKind(k);
        if (!UNITS_FOR_KIND[k].includes(unit)) setUnit(defaultUnit(k));
    };

    const fail = (key: string) => showDialog('alert', t(key));

    const handleSave = (e?: React.FormEvent) => {
        e?.preventDefault();
        const amount = parseNum(amountStr);
        if (!Number.isFinite(amount) || amount < 0) return fail('supplies.error.amount');
        const now = Date.now();

        if (mode === 'refill' && base) {
            onSave({ ...base, amount, setAt: now });
            return;
        }

        const trimmed = name.trim();
        if (!trimmed) return fail('supplies.error.name');
        const s = parseNum(strengthStr);
        const strengthMG = strength && Number.isFinite(s) && s > 0 ? s : undefined;
        const amountChanged = !base || initialRemaining !== amount || base.unit !== unit;
        const next: SupplyItem = {
            id: base?.id ?? newId(),
            name: trimmed,
            kind,
            unit,
            amount: amountChanged ? amount : base!.amount,
            setAt: amountChanged ? now : base!.setAt,
            link: link && (link.ester !== undefined || link.route !== undefined) ? link : null,
            perDose: base?.perDose ?? null,
            reorderLeadDays: leadDays,
            createdAt: base?.createdAt ?? now,
        };
        if (strengthMG !== undefined) next.strengthMG = strengthMG;
        if (base?.updatedAt !== undefined) next.updatedAt = base.updatedAt;
        onSave(next);
    };

    const handleDelete = () => {
        if (!base || !onDelete) return;
        showDialog('confirm', t('supplies.delete_confirm'), () => onDelete(base.id));
    };

    const title = mode === 'add' ? t('supplies.sheet.add') : mode === 'edit' ? t('supplies.sheet.edit') : t('supplies.sheet.update');
    const currentLinkKey = supplyLinkKey(link);

    const amountField = (
        <div className="flex flex-col gap-2">
            <label htmlFor={amountId} className="list-group-header">{t('supplies.amount')}</label>
            <div className="flex items-center gap-3">
                <input
                    id={amountId}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={amountStr}
                    onChange={e => setAmountStr(e.target.value)}
                    className="input-base w-36 tabular-nums"
                    placeholder="0"
                    autoFocus={mode === 'refill'}
                />
                {(mode === 'refill' || units.length === 1) && (
                    <span className="text-base text-[var(--c-muted)]">{inline(unitLabel(mode === 'refill' && base ? base.unit : unit, t), lang)}</span>
                )}
            </div>
            {mode !== 'refill' && units.length > 1 && (
                <SegmentedControl<SupplyUnit>
                    aria-label={t('supplies.unit_label')}
                    options={units.map(u => ({ value: u, label: unitLabel(u, t) }))}
                    value={unit}
                    onChange={setUnit}
                />
            )}
            {mode === 'refill' && <p className="list-group-footer m-0">{t('supplies.amount_footer')}</p>}
        </div>
    );

    return (
        <SecondaryPage title={title} onBack={onClose} backLabel={t('supplies.title')}>
                    <form onSubmit={handleSave} className="flex flex-col gap-6">
                        {mode === 'refill' ? (
                            amountField
                        ) : (
                            <>
                                <ListGroup header={t('supplies.kind')} selection="single" checkIcon={CHECK}>
                                    {SUPPLY_KINDS.map(k => (
                                        <ListRow key={k} title={t(`supplies.kind.${k}`)} selected={kind === k} onClick={() => pickKind(k)} />
                                    ))}
                                </ListGroup>

                                <div className="flex flex-col gap-2">
                                    <label htmlFor={nameId} className="list-group-header">{t('supplies.name')}</label>
                                    <input
                                        id={nameId}
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="input-base"
                                        placeholder={t(NAMED_PLACEHOLDER.has(kind) ? `supplies.name_placeholder.${kind}` : 'supplies.name_placeholder')}
                                        maxLength={80}
                                        autoComplete="off"
                                    />
                                </div>

                                {amountField}

                                {strength && (
                                    <div className="flex flex-col gap-2">
                                        <label htmlFor={strengthId} className="list-group-header">{t(strength.key)}</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                id={strengthId}
                                                type="number"
                                                inputMode="decimal"
                                                step="any"
                                                min="0"
                                                value={strengthStr}
                                                onChange={e => setStrengthStr(e.target.value)}
                                                className="input-base w-36 tabular-nums"
                                                placeholder="0"
                                            />
                                            <span className="text-base text-[var(--c-muted)]">{strength.suffix}</span>
                                        </div>
                                    </div>
                                )}

                                <ListGroup header={t('supplies.link')} footer={t('supplies.link_footer')} selection="single" checkIcon={CHECK}>
                                    <ListRow title={t('supplies.link.none')} selected={currentLinkKey === 'none'} onClick={() => setLink(null)} />
                                    {linkOptions.map(opt => (
                                        <ListRow
                                            key={opt.key}
                                            title={opt.label}
                                            selected={currentLinkKey === opt.key}
                                            onClick={() => setLink(opt.link)}
                                        />
                                    ))}
                                </ListGroup>

                                <ListGroup header={t('supplies.reorder_lead')} footer={t('supplies.reorder_lead_footer')} selection="single" checkIcon={CHECK}>
                                    {LEAD_WEEKS.map(w => (
                                        <ListRow
                                            key={w}
                                            title={t(`supplies.reorder_lead.${w}`)}
                                            selected={leadDays === w * 7}
                                            onClick={() => setLeadDays(w * 7)}
                                        />
                                    ))}
                                </ListGroup>
                            </>
                        )}

                        <Button type="submit" variant="primary" block>
                            {t('btn.save')}
                        </Button>

                        {mode === 'edit' && base && onDelete && (
                            <Button variant="destructive" block onClick={handleDelete}>
                                {t('supplies.delete')}
                            </Button>
                        )}
                    </form>
        </SecondaryPage>
    );
}

export default SupplySheet;
