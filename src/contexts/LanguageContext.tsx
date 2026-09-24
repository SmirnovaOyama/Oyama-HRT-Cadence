import React, { useEffect } from 'react';
import { englishLanguage, LanguageContext } from './languageState';

export { useTranslation } from './languageState';

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    useEffect(() => {
        // Migrate the old preference without touching any health records.
        try { localStorage.setItem('hrt-lang', 'en'); } catch { /* Storage may be unavailable. */ }
        document.title = 'HRT Tracker';
        document.documentElement.lang = 'en';
        document.documentElement.dir = 'ltr';
    }, []);

    return <LanguageContext.Provider value={englishLanguage}>{children}</LanguageContext.Provider>;
};
