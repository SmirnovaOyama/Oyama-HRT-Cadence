import { expect, test } from 'bun:test';
import { resolveLanguage, translatorFor } from '../src/i18n/languages';
import { shouldShowOnboarding } from '../src/pages/Onboarding';

test('language upgrade preserves explicit choices and recognizes older Chinese locales', () => {
    expect(resolveLanguage('en', ['zh-CN'])).toBe('en');
    expect(resolveLanguage('zh', ['en-US'])).toBe('zh');
    expect(resolveLanguage('zh-TW')).toBe('zh');
    expect(resolveLanguage(null, ['zh-CN'])).toBe('zh');
    expect(resolveLanguage('ja')).toBe('en');
    expect(translatorFor('zh')('shell.tab.you')).toBe('我');
    expect(translatorFor('en')('shell.tab.you')).toBe('You');
});

test('existing UUID-account records skip onboarding without changing stored data', () => {
    const records = new Map([
        ['hrt-u12345678-1234-1234-1234-123456789012-masc-events', '[{"id":"old-dose"}]'],
        ['hrt-lang', 'zh'],
    ]);
    const before = [...records];
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
        getItem: (k: string) => records.get(k) ?? null,
        key: (i: number) => [...records.keys()][i] ?? null,
        get length() { return records.size; },
    } });
    try {
        expect(shouldShowOnboarding()).toBe(false);
        expect([...records]).toEqual(before);
    } finally {
        if (original) Object.defineProperty(globalThis, 'localStorage', original);
        else Reflect.deleteProperty(globalThis, 'localStorage');
    }
});
