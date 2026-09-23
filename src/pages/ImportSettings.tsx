import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import ImportSection from '../components/ImportSection';
import { BackHeader } from '../components/ui';
import { YouPage } from './you/shared';
import { Lead } from './account/shared';

interface ImportSettingsProps {
    onImportJson: (text: string) => boolean | Promise<boolean>;
    onBack: () => void;
}

const ImportSettings: React.FC<ImportSettingsProps> = ({ onImportJson, onBack }) => {
    const { t } = useTranslation();

    return (
        <YouPage>
            <BackHeader parentLabel={t('you.title')} onBack={onBack} title={t('account.page.import')} />
            <Lead className="mt-2 mb-6">{t('account.import.lead_short')}</Lead>
            <ImportSection onImportJson={onImportJson} />
        </YouPage>
    );
};

export default ImportSettings;
