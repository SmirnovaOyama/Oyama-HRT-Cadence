import { TRANSLATIONS } from './translations';
import { CADENCE_STRINGS } from './cadence';

/** The app has one display language, independent of stored or browser locale. */
export const ENGLISH_STRINGS: Readonly<Record<string, string>> = {
    ...TRANSLATIONS.en,
    ...CADENCE_STRINGS.en,
};

export const translateEnglish = (key: string): string => ENGLISH_STRINGS[key] ?? key;
