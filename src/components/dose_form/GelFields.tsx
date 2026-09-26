import React from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { GEL_SITE_ORDER } from '../../../logic';
import { useHRTMode } from '../../contexts/HRTModeContext';
import CustomSelect from '../CustomSelect';
import DoseStepper from './DoseStepper';
import { GroupHeader, formatApprox } from './shared';
import { Gauge } from '../icons';
import { DoseFieldLabel } from './DoseFieldIcon';

interface GelFieldsProps {
    gelSite: number;
    setGelSite: (val: number) => void;
    e2Dose: string;
    onE2Change: (val: string) => void;
    bioMultiplier?: number;
}

/** Applied amount (estradiol or testosterone in the gel), then where it
 *  went. The site sets how much is absorbed, shown as the footer. */
const GelFields: React.FC<GelFieldsProps> = ({
    gelSite,
    setGelSite,
    e2Dose,
    onE2Change,
    bioMultiplier,
}) => {
    const { t } = useTranslation();
    const { isTransmasc } = useHRTMode();

    const appliedVal = parseFloat(e2Dose);
    const hasDose = Number.isFinite(appliedVal) && appliedVal > 0;
    const pct = bioMultiplier ? String(Math.round(bioMultiplier * 1000) / 10) : null;
    const absorbed = hasDose && bioMultiplier ? appliedVal * bioMultiplier : null;

    const note = pct === null
        ? null
        : absorbed !== null
            ? t('log.gel_note').replace('{pct}', pct).replace('{mg}', formatApprox(absorbed))
            : t('log.gel_note_empty').replace('{pct}', pct);

    return (
        <>
            <section>
                <GroupHeader><DoseFieldLabel icon={Gauge}>{t('log.how_much')}</DoseFieldLabel></GroupHeader>
                <div className="list-group">
                    <DoseStepper
                        value={e2Dose}
                        onChange={onE2Change}
                        step={isTransmasc ? 5 : 0.25}
                        unit="mg"
                        label={t('log.amount')}
                    />
                </div>
            </section>

            <CustomSelect
                label={t('log.gel_site')}
                value={String(gelSite)}
                onChange={(val) => setGelSite(parseInt(val, 10))}
                options={GEL_SITE_ORDER.map((siteKey, idx) => ({
                    value: String(idx),
                    label: t(`gel.site.${siteKey}`),
                }))}
                footer={note}
            />
        </>
    );
};

export default GelFields;
