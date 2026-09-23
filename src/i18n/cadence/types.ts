import type { Lang } from '../translations';

/** One area's strings, keyed by language. Every language carries the same keys. */
export type AreaStrings = Record<Lang, Record<string, string>>;
