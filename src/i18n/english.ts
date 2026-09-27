import { TRANSLATIONS } from './translations';
import { CADENCE_STRINGS } from './cadence';

/** English strings retained for consumers that explicitly require an English export. */
export const ENGLISH_STRINGS: Readonly<Record<string, string>> = {
    ...TRANSLATIONS.en,
    ...CADENCE_STRINGS.en,
};

export const translateEnglish = (key: string): string => ENGLISH_STRINGS[key] ?? key;
