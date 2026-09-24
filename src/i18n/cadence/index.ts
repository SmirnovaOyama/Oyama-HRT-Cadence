import type { Lang } from '../translations';
import type { AreaStrings } from './types';
import { shell } from './shell';
import { today } from './today';
import { chart } from './chart';
import { log } from './log';
import { timeline } from './timeline';
import { tests } from './tests';
import { you } from './you';
import { account } from './account';
import { reminders } from './reminders';
import { supplies } from './supplies';
import { overrides } from './overrides';

// Strings added by the Cadence redesign, split by area so each screen owns its
// own file. They sit on top of the original packs in translations.ts.
export const CADENCE_AREAS: Record<string, AreaStrings> = { shell, today, chart, log, timeline, tests, you, account, reminders, supplies, overrides };

const LANGS: Lang[] = ['zh', 'zh-TW', 'yue', 'en', 'ja', 'ko', 'tr'];

export const CADENCE_STRINGS = Object.fromEntries(
    LANGS.map(lang => [lang, Object.assign({}, ...Object.values(CADENCE_AREAS).map(area => area[lang]))]),
) as Record<Lang, Record<string, string>>;
