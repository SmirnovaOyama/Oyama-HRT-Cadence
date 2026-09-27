import { createContext, useContext } from 'react';
import type { DisplayLanguage } from '../i18n/languages';

interface LanguageState {
    lang: DisplayLanguage;
    setLang: (lang: DisplayLanguage) => void;
    t: (key: string) => string;
}

// Separate from the UI module so hot updates preserve context identity.
export const LanguageContext = createContext<LanguageState | null>(null);

export const useTranslation = () => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useTranslation must be used within LanguageProvider');
    return context;
};
