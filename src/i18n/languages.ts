import { TRANSLATIONS } from './translations';
import { CADENCE_STRINGS } from './cadence';

export type DisplayLanguage = 'en' | 'zh';
export const DISPLAY_LANGUAGES = ['en', 'zh'] as const;
export const LANGUAGE_STRINGS: Record<DisplayLanguage, Readonly<Record<string, string>>> = {
    en: { ...TRANSLATIONS.en, ...CADENCE_STRINGS.en, 'settings.language': 'Language' },
    zh: { ...TRANSLATIONS.zh, ...CADENCE_STRINGS.zh, 'settings.language': '语言' },
};

/** Keep existing Chinese preferences; use English for unsupported languages. */
export function resolveLanguage(saved: string | null, browserLanguages: readonly string[] = []): DisplayLanguage {
    if (saved) return /^zh(?:-|$)|^yue(?:-|$)/i.test(saved) ? 'zh' : 'en';
    return browserLanguages.some(lang => /^zh(?:-|$)|^yue(?:-|$)/i.test(lang)) ? 'zh' : 'en';
}

export const translatorFor = (lang: DisplayLanguage) => (key: string): string =>
    LANGUAGE_STRINGS[lang][key] ?? LANGUAGE_STRINGS.en[key] ?? key;
