import React, { useId } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { Ester, SL_TIER_ORDER, SublingualTierParams } from '../../../logic';
import CustomSelect from '../CustomSelect';
import { Switch } from '../ui';
import AmountSection, { AmountBasis } from './AmountSection';
import DoseStepper from './DoseStepper';
import { GroupHeader, ListSep } from './shared';
import { Clock } from '../icons';
import { DoseFieldLabel } from './DoseFieldIcon';

interface SublingualFieldsProps {
    ester: Ester;
    rawDose: string;
    e2Dose: string;
    onRawChange: (val: string) => void;
    onE2Change: (val: string) => void;
    basis: AmountBasis;
    onBasisChange: (basis: AmountBasis) => void;
    slTier: number;
    setSlTier: (val: number) => void;
    useCustomTheta: boolean;
    setUseCustomTheta: (val: boolean) => void;
    customHoldInput: string;
    setCustomHoldInput: (val: string) => void;
    customHoldValue: number;
    setCustomHoldValue: (val: number) => void;
    thetaFromHold: (hold: number) => number;
}

/** Amount, then how long the tablet is held: a preset tier from a list
 *  view, or (switch on) a hold time of your own in minutes. */
const SublingualFields: React.FC<SublingualFieldsProps> = ({
    ester,
    rawDose,
    e2Dose,
    onRawChange,
    onE2Change,
    basis,
    onBasisChange,
    slTier,
    setSlTier,
    useCustomTheta,
    setUseCustomTheta,
    customHoldInput,
    setCustomHoldInput,
    customHoldValue,
    setCustomHoldValue,
    thetaFromHold,
}) => {
    const { t } = useTranslation();
    const customTitleId = useId();
    const minutes = t('unit.min_short');

    const handleCustomHoldChange = (str: string) => {
        setCustomHoldInput(str);
        const val = parseFloat(str);
        if (Number.isFinite(val) && val >= 1) {
            setCustomHoldValue(val);
        }
    };

    const tierOptions = SL_TIER_ORDER.map((tierKey, index) => ({
        value: String(index),
        label: t(`sl.tier.${tierKey}`),
        description: `${SublingualTierParams[tierKey].hold} ${minutes}`,
    }));

    const thetaPct = Math.round(thetaFromHold(customHoldValue) * 100);

    return (
        <>
            <AmountSection
                ester={ester}
                rawDose={rawDose}
                e2Dose={e2Dose}
                onRawChange={onRawChange}
                onE2Change={onE2Change}
                basis={basis}
                onBasisChange={onBasisChange}
                step={0.5}
            />

            <section>
                <GroupHeader><DoseFieldLabel icon={Clock}>{t('log.sl_header')}</DoseFieldLabel></GroupHeader>
                <div className="list-group">
                    {useCustomTheta ? (
                        <DoseStepper
                            value={customHoldInput}
                            onChange={handleCustomHoldChange}
                            step={1}
                            min={1}
                            max={60}
                            unit={minutes}
                            label={t('log.sl_minutes')}
                        />
                    ) : (
                        <CustomSelect
                            bare
                            label={t('log.sl_minutes')}
                            value={String(slTier)}
                            onChange={(val) => setSlTier(parseInt(val, 10))}
                            options={tierOptions}
                        />
                    )}
                    <ListSep />
                    <div className="list-row">
                        <span className="list-row-text">
                            <span id={customTitleId} className="list-row-title">{t('log.sl_custom')}</span>
                        </span>
                        <Switch
                            checked={useCustomTheta}
                            onChange={setUseCustomTheta}
                            aria-labelledby={customTitleId}
                        />
                    </div>
                </div>
                <p className="list-group-footer m-0">
                    {useCustomTheta ? t('log.sl_theta').replace('{pct}', String(thetaPct)) : t('log.sl_hold_note')}
                </p>
            </section>
        </>
    );
};

export default SublingualFields;
