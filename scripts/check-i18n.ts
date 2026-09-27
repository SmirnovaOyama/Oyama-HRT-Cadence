import { CADENCE_AREAS } from '../src/i18n/cadence';
import { TRANSLATIONS } from '../src/i18n/translations';
import { DISPLAY_LANGUAGES, LANGUAGE_STRINGS } from '../src/i18n/languages';
let problems = 0;
const owner = new Map<string, string>();
const allKeys = new Set(Object.values(TRANSLATIONS).flatMap(pack => Object.keys(pack)));
for (const [area, strings] of Object.entries(CADENCE_AREAS)) {
    const keys = new Set(Object.values(strings).flatMap(pack => Object.keys(pack ?? {})));
    for (const key of keys) {
        allKeys.add(key);
        for (const lang of DISPLAY_LANGUAGES) {
            if (!strings[lang]?.[key]) { problems++; console.error(`${area}: "${key}" missing in ${lang}`); }
        }
        const prev = owner.get(key);
        if (prev && prev !== area) { problems++; console.error(`"${key}" defined in both ${prev} and ${area}`); }
        owner.set(key, area);
    }
}
for (const lang of DISPLAY_LANGUAGES) {
    for (const key of allKeys) {
        if (!LANGUAGE_STRINGS[lang][key]) { problems++; console.error(`"${key}" missing in ${lang}`); }
    }
    for (const [key, value] of Object.entries(LANGUAGE_STRINGS.en)) {
        const placeholders = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]))].sort().join(',');
        if (placeholders(value) !== placeholders(LANGUAGE_STRINGS[lang][key] ?? '')) {
            problems++; console.error(`${lang}: placeholder mismatch in "${key}"`);
        }
    }
}
if (problems) { console.error(`${problems} problem(s)`); process.exit(1); }
console.log(`i18n ok: ${allKeys.size} keys in English and Simplified Chinese`);
