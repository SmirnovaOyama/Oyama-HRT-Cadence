import { createContext, useContext } from 'react';
import type { Lang } from '../i18n/translations';
import { translateEnglish } from '../i18n/english';

// Separate from the UI module so hot updates preserve context identity.
export const englishLanguage = { lang: 'en' as Lang, t: translateEnglish };
export const LanguageContext = createContext<typeof englishLanguage | null>(null);

export const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useTranslation must be used within LanguageProvider');
    return context;
};
