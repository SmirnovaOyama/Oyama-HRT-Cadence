// The app is English-only. Retained translation packs help detect keys that
// would otherwise fall through to a missing label; they are not UI choices.
import { CADENCE_AREAS } from '../src/i18n/cadence';
import { TRANSLATIONS } from '../src/i18n/translations';
import { ENGLISH_STRINGS } from '../src/i18n/english';

let problems = 0;
const owner = new Map<string, string>();
const allKeys = new Set(Object.values(TRANSLATIONS).flatMap(pack => Object.keys(pack)));

for (const [area, strings] of Object.entries(CADENCE_AREAS)) {
    const keys = new Set(Object.values(strings).flatMap(pack => Object.keys(pack ?? {})));
    for (const key of keys) {
        allKeys.add(key);
        if (!strings.en?.[key]) { problems++; console.error(`${area}: "${key}" missing in English`); }
        const prev = owner.get(key);
        if (prev && prev !== area) { problems++; console.error(`"${key}" defined in both ${prev} and ${area}`); }
        owner.set(key, area);
    }
}

for (const key of allKeys) {
    if (!ENGLISH_STRINGS[key]) { problems++; console.error(`"${key}" missing in English`); }
}

if (problems) { console.error(`${problems} problem(s)`); process.exit(1); }
console.log(`i18n ok: ${allKeys.size} English strings (${owner.size} Cadence keys)`);
