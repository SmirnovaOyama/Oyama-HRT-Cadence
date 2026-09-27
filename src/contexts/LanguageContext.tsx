import React, { useEffect, useMemo, useState } from 'react';
import { LanguageContext } from './languageState';
import { resolveLanguage, translatorFor, type DisplayLanguage } from '../i18n/languages';

export { useTranslation } from './languageState';

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [lang, setLang] = useState<DisplayLanguage>(() => {
        let saved: string | null = null;
        try { saved = localStorage.getItem('hrt-lang'); } catch { /* Storage may be unavailable. */ }
        return resolveLanguage(saved, typeof navigator === 'undefined' ? [] : navigator.languages);
    });
    useEffect(() => {
        try { localStorage.setItem('hrt-lang', lang); } catch { /* Storage may be unavailable. */ }
        document.title = lang === 'zh' ? 'HRT 用药记录' : 'HRT Tracker';
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        document.documentElement.dir = 'ltr';
    }, [lang]);
    const value = useMemo(() => ({ lang, setLang, t: translatorFor(lang) }), [lang]);
    return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
