import { expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PixelCatProvider } from '../src/contexts/PixelCatContext';
import History from '../src/pages/History';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import { HRTModeProvider } from '../src/contexts/HRTModeContext';
import { DialogProvider } from '../src/contexts/DialogContext';
import { SecondaryPageProvider } from '../src/components/ui/SecondaryPage';
import { translateEnglish } from '../src/i18n/english';
import { Ester, Route } from '../logic';

test('Timeline offers saved quick doses and their management entry even without templates', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: { getItem: () => null, setItem: () => {} },
    });
    try {
        const noop = () => {};
        const html = renderToStaticMarkup(
            <LanguageProvider><HRTModeProvider><SecondaryPageProvider><DialogProvider><PixelCatProvider>
                <History t={translateEnglish} isQuickAddOpen setIsQuickAddOpen={noop}
                    doseTemplates={[]} quickDoses={[{ id: 'quick', route: Route.oral, ester: Ester.E2, value: 3, createdAt: 1 }]}
                    onAddQuickDose={noop} onDeleteQuickDose={noop}
                    onSaveTemplate={noop} onDeleteTemplate={noop} onSaveEvent={noop}
                    onDeleteEvent={noop} onAddEvents={noop} onDeleteEvents={noop} groupedEvents={[]} />
            </PixelCatProvider></DialogProvider></SecondaryPageProvider></HRTModeProvider></LanguageProvider>,
        );
        expect(html).toContain('role="radio"');
        expect(html).toContain('Estradiol 3');
        expect(html).toContain('>Edit</button>');
    } finally {
        if (original) Object.defineProperty(globalThis, 'localStorage', original);
        else Reflect.deleteProperty(globalThis, 'localStorage');
    }
});
