// Fails when a Cadence string is missing from any of the 7 languages, or when
// two areas define the same key.
import { CADENCE_AREAS } from '../src/i18n/cadence';

const LANGS = ['zh', 'zh-TW', 'yue', 'en', 'ja', 'ko', 'tr'] as const;
let problems = 0;
const owner = new Map<string, string>();

for (const [area, strings] of Object.entries(CADENCE_AREAS)) {
    const keys = new Set(LANGS.flatMap(l => Object.keys(strings[l] ?? {})));
    for (const key of keys) {
        const missing = LANGS.filter(l => !strings[l]?.[key]);
        if (missing.length) { problems++; console.error(`${area}: "${key}" missing in ${missing.join(', ')}`); }
        const prev = owner.get(key);
        if (prev && prev !== area) { problems++; console.error(`"${key}" defined in both ${prev} and ${area}`); }
        owner.set(key, area);
    }
}

if (problems) { console.error(`${problems} problem(s)`); process.exit(1); }
console.log(`i18n ok: ${owner.size} Cadence keys in ${LANGS.length} languages`);
