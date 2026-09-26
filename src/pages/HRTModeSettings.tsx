import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useHRTMode } from '../contexts/HRTModeContext';
import { BackHeader, ListGroup, ListRow } from '../components/ui';
import { Helix } from '../components/icons';
import { LabelIcon } from '../components/ui/LabelIcon';
import { LIST_CHECK, YouPage } from './you/shared';

interface HRTModeSettingsProps {
    onBack: () => void;
}

const OPTIONS = [
    { value: 'transfem', labelKey: 'mode.transfem' },
    { value: 'transmasc', labelKey: 'mode.transmasc' },
] as const;

const HRTModeSettings: React.FC<HRTModeSettingsProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { mode, setMode } = useHRTMode();

    return (
        <YouPage>
            <BackHeader parentLabel={t('you.title')} onBack={onBack} title={t('you.hrt_mode')} />
            <ListGroup
                selection="single"
                checkIcon={LIST_CHECK}
                aria-label={t('you.hrt_mode')}
                footer={t('you.hrt_mode_footer')}
                className="mt-2 [&_.list-sep-icon]:ms-[48px]"
            >
                {OPTIONS.map(({ value, labelKey }) => (
                    <ListRow key={value} className="min-h-[52px]"
                        leading={<LabelIcon icon={Helix} tone={value === 'transfem' ? 'pink' : 'blue'} />}
                        title={t(labelKey)} selected={mode === value} onClick={() => setMode(value)} />
                ))}
            </ListGroup>
        </YouPage>
    );
};

export default HRTModeSettings;
