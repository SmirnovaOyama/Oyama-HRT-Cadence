import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import ExportSection from '../components/ExportSection';
import { DoseEvent, LabResult } from '../../logic';
import { BackHeader } from '../components/ui';
import { YouPage } from './you/shared';
import { Lead } from './account/shared';

interface ExportSettingsProps {
    events: DoseEvent[];
    labResults: LabResult[];
    hasBackupData: boolean;
    weight: number;
    onExport: (encrypt: boolean, password?: string) => Promise<string | null>;
    onQuickExport: () => void;
    onBack: () => void;
}

const ExportSettings: React.FC<ExportSettingsProps> = ({ events, labResults, hasBackupData, weight, onExport, onQuickExport, onBack }) => {
    const { t } = useTranslation();

    return (
        <YouPage>
            <BackHeader parentLabel={t('you.title')} onBack={onBack} title={t('account.page.export')} />
            <Lead className="mt-2 mb-6">{t('account.export.lead')}</Lead>
            <ExportSection
                events={events}
                labResults={labResults}
                hasBackupData={hasBackupData}
                weight={weight}
                onExport={onExport}
                onQuickExport={onQuickExport}
            />
        </YouPage>
    );
};

export default ExportSettings;
