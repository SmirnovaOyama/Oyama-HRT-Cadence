import { expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LanguageProvider } from '../src/contexts/LanguageContext';

test('an existing dialog consumer can read a refreshed provider', async () => {
    const modulePath = '../src/contexts/DialogContext.tsx';
    const previous = await import(`${modulePath}?before-refresh`) as typeof import('../src/contexts/DialogContext');
    const refreshed = await import(`${modulePath}?after-refresh`) as typeof import('../src/contexts/DialogContext');
    // Different query strings re-evaluate the UI module, as a Vite update does.
    expect(previous.DialogProvider === refreshed.DialogProvider).toBe(false);
    function ExistingConsumer() {
        return createElement('span', null, typeof previous.useDialog().showDialog);
    }

    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem: () => 'en' },
    });
    try {
        const html = renderToStaticMarkup(createElement(LanguageProvider, {
            children: createElement(refreshed.DialogProvider, { children: createElement(ExistingConsumer) }),
        }));
        expect(html).toBe('<span>function</span>');
    } finally {
        if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
        else Reflect.deleteProperty(globalThis, 'localStorage');
    }
});

test('an existing parent page can read refreshed secondary navigation', async () => {
    const modulePath = '../src/components/ui/SecondaryPage.tsx';
    const previous = await import(`${modulePath}?before-refresh`) as typeof import('../src/components/ui/SecondaryPage');
    const refreshed = await import(`${modulePath}?after-refresh`) as typeof import('../src/components/ui/SecondaryPage');
    expect(previous.SecondaryPageProvider === refreshed.SecondaryPageProvider).toBe(false);
    function ExistingConsumer() {
        const navigation = previous.useSecondaryNavigation();
        return createElement('span', null, `${navigation.hasPages}:${typeof navigation.closeAll}`);
    }
    const html = renderToStaticMarkup(createElement(refreshed.SecondaryPageProvider, {
        children: createElement(ExistingConsumer),
    }));
    expect(html).toBe('<span>false:function</span>');
});
