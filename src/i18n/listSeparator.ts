import type { Lang } from './translations';

/**
 * The punctuation a language puts between items of a short inline list, such
 * as a row hint ("Export, Import") or a device line ("Safari, macOS").
 *
 * It replaces the old " · " separator: the design bans dots between or before
 * labels, so each language uses its own list comma instead. Chinese and
 * Cantonese take the full-width comma, Japanese the enumeration comma, and
 * English, Korean and Turkish a comma and a space.
 */
export const listSeparator = (lang: Lang): string => {
    switch (lang) {
        case 'zh':
        case 'zh-TW':
        case 'yue':
            return '，';
        case 'ja':
            return '、';
        default:
            return ', ';
    }
};

/** Joins the items with the language's list separator. */
export const joinList = (lang: Lang, items: readonly string[]): string => items.join(listSeparator(lang));

/**
 * Just the comma, without the trailing space, for rows that lay their items
 * out with a flex gap and pull the comma back against the item before it.
 */
export const listComma = (lang: Lang): string => listSeparator(lang).trimEnd();

/**
 * Joins whole sentences. Chinese, Cantonese and Japanese end a sentence with a
 * full-width stop that carries its own space, so they join with nothing; the
 * other languages join with a space.
 */
export const joinSentences = (lang: Lang, sentences: readonly string[]): string =>
    sentences.join(lang === 'zh' || lang === 'zh-TW' || lang === 'yue' || lang === 'ja' ? '' : ' ');
