import React, { useState } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { Check, ChevronRight } from '../icons';
import { ListGroup, ListRow, SegmentedControl } from '../ui';
import DoseStepper from './DoseStepper';
import { GroupHeader, formatAmount } from './shared';

interface PatchFieldsProps {
    patchMode: "dose" | "rate";
    setPatchMode: (val: "dose" | "rate") => void;
    patchRate: string;
    setPatchRate: (val: string) => void;
    rawDose: string;
    onRawChange: (val: string) => void;
    patchWearDays: string;
    setPatchWearDays: (val: string) => void;
}

// Common wear schedules. 3.5 d is twice a week, 7 d once a week.
const WEAR_PRESETS: { days: number; labelKey: string }[] = [
    { days: 3.5, labelKey: 'log.patch_twice_week' },
    { days: 7, labelKey: 'log.patch_weekly' },
];

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/** Patch on: the amount (release rate or total dose), then how long it is
 *  worn, as a list view. Leaving the wear time empty keeps the patch on
 *  until a separate "patch off" is logged. */
const PatchFields: React.FC<PatchFieldsProps> = ({
    patchMode,
    setPatchMode,
    patchRate,
    setPatchRate,
    rawDose,
    onRawChange,
    patchWearDays,
    setPatchWearDays,
}) => {
    const { t } = useTranslation();
    const wear = parseFloat(patchWearDays);
    const isEmpty = !patchWearDays.trim();
    const isPreset = Number.isFinite(wear) && WEAR_PRESETS.some(w => near(w.days, wear));
    const [otherOpen, setOtherOpen] = useState(() => !isEmpty && !isPreset);
    const otherSelected = otherOpen || (!isEmpty && !isPreset);
    const daysText = (n: number) => t('log.patch_days').replace('{n}', formatAmount(n));
    const untilRemoved = isEmpty && !otherOpen;

    return (
        <>
            <section>
                <GroupHeader>{t('log.how_much')}</GroupHeader>
                <SegmentedControl<"dose" | "rate">
                    aria-label={t('log.patch_mode')}
                    className="mb-2"
                    value={patchMode}
                    onChange={setPatchMode}
                    options={[
                        { value: 'rate', label: t('log.patch_by_rate') },
                        { value: 'dose', label: t('log.patch_by_total') },
                    ]}
                />
                <div className="list-group">
                    {patchMode === 'rate' ? (
                        <DoseStepper
                            value={patchRate}
                            onChange={setPatchRate}
                            step={12.5}
                            unit={t('dose.guide.unit.ug_day')}
                            label={t('log.patch_by_rate')}
                        />
                    ) : (
                        <DoseStepper
                            value={rawDose}
                            onChange={onRawChange}
                            step={0.5}
                            unit="mg"
                            label={t('log.patch_by_total')}
                        />
                    )}
                </div>
                {patchMode === 'rate' && <p className="list-group-footer m-0">{t('log.patch_rate_note')}</p>}
            </section>

            <ListGroup
                header={t('log.patch_wear')}
                selection="single"
                checkIcon={<Check size={22} />}
                chevronIcon={<ChevronRight size={16} />}
                footer={untilRemoved ? t('log.patch_off_note').replace('{off}', t('log.route.patchRemove')) : undefined}
            >
                {WEAR_PRESETS.map(w => (
                    <ListRow
                        key={w.days}
                        title={t(w.labelKey)}
                        value={daysText(w.days)}
                        selected={!otherOpen && Number.isFinite(wear) && near(wear, w.days)}
                        onClick={() => {
                            setOtherOpen(false);
                            setPatchWearDays(String(w.days));
                        }}
                    />
                ))}
                <ListRow
                    title={t('log.patch_until_removed')}
                    selected={untilRemoved}
                    onClick={() => {
                        setOtherOpen(false);
                        setPatchWearDays('');
                    }}
                />
                <ListRow
                    title={t('log.patch_other')}
                    value={otherSelected && !isEmpty && Number.isFinite(wear) ? daysText(wear) : undefined}
                    selected={otherSelected}
                    onClick={() => setOtherOpen(true)}
                />
                {otherSelected && (
                    <div>
                        <DoseStepper
                            value={patchWearDays}
                            onChange={setPatchWearDays}
                            step={0.5}
                            unit={t('log.patch_days_unit')}
                            label={t('log.patch_wear')}
                        />
                    </div>
                )}
            </ListGroup>
        </>
    );
};

export default PatchFields;
