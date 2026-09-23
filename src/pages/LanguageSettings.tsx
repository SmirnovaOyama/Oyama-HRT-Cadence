import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { Lang } from '../i18n/translations';
import { BackHeader, ListGroup, ListRow } from '../components/ui';
import { LIST_CHECK, YouPage } from './you/shared';

interface LanguageSettingsProps {
    lang: Lang;
    setLang: (lang: Lang) => void;
    languageOptions: { value: string; label: string }[];
    onBack: () => void;
}

const LanguageSettings: React.FC<LanguageSettingsProps> = ({ lang, setLang, languageOptions, onBack }) => {
    const { t } = useTranslation();

    return (
        <YouPage>
            <BackHeader parentLabel={t('you.title')} onBack={onBack} title={t('drawer.lang')} />
            <ListGroup selection="single" checkIcon={LIST_CHECK} aria-label={t('drawer.lang')} className="mt-2">
                {languageOptions.map(({ value, label }) => (
                    <ListRow
                        key={value}
                        title={label}
                        lang={value}
                        selected={lang === value}
                        onClick={() => setLang(value as Lang)}
                    />
                ))}
            </ListGroup>
        </YouPage>
    );
};

export default LanguageSettings;
