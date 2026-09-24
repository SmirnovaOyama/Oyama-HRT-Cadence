import React, { useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../../contexts/LanguageContext';
import { BackHeader } from './PageHeader';
import { PageContext, type PageEntry } from './secondaryPageState';

export { useSecondaryNavigation } from './secondaryPageState';

/** Child pages occupy the ordinary content column. Ancestors stay mounted so
 *  returning from a picker or confirmation never discards a form draft. */
export function SecondaryPageProvider({ children }: { children: React.ReactNode }) {
    const [host, setHost] = useState<HTMLDivElement | null>(null);
    const [entries, setEntries] = useState<PageEntry[]>([]);
    const entriesRef = useRef(entries);
    entriesRef.current = entries;
    const register = useCallback((entry: PageEntry) => {
        setEntries(previous => [...previous.filter(p => p.id !== entry.id), entry]);
        return () => setEntries(previous => previous.filter(p => p.id !== entry.id));
    }, []);
    const closeAll = useCallback(() => {
        for (const entry of [...entriesRef.current].reverse()) entry.onBack();
    }, []);

    // Only the innermost page receives Escape. Legacy listeners must not close
    // a parent as well when dismissing a nested date choice or confirmation.
    useEffect(() => {
        const back = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || !entriesRef.current.length) return;
            // An expanded inline picker closes before navigating Back.
            if (event.target instanceof HTMLElement && event.target.closest('[data-escape-local="true"]')) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            entriesRef.current[entriesRef.current.length - 1].onBack();
        };
        window.addEventListener('keydown', back, true);
        return () => window.removeEventListener('keydown', back, true);
    }, []);

    const value = useMemo(() => ({ host, setHost, entries, register, closeAll }), [host, entries, register, closeAll]);
    return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}

/** Put beside the main page, inside the app's content scroller. */
export function SecondaryPageHost() {
    const context = useContext(PageContext);
    if (!context) throw new Error('Secondary pages require SecondaryPageProvider');
    return <div ref={context.setHost} style={{ display: context.entries.length ? undefined : 'none' }} />;
}

export interface SecondaryPageProps {
    title: React.ReactNode;
    onBack: () => void;
    children: React.ReactNode;
    backLabel?: React.ReactNode;
    wide?: boolean;
}

export function SecondaryPage({ title, onBack, children, backLabel, wide = false }: SecondaryPageProps) {
    const context = useContext(PageContext);
    if (!context) throw new Error('Secondary pages require SecondaryPageProvider');
    const { t } = useTranslation();
    const id = useId();
    const onBackRef = useRef(onBack);
    onBackRef.current = onBack;
    const sectionRef = useRef<HTMLElement>(null);
    const hostRef = useRef(context.host);
    hostRef.current = context.host;
    const active = context.entries[context.entries.length - 1]?.id === id;

    useLayoutEffect(() => {
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const scroller = hostRef.current?.closest<HTMLElement>('[data-page-scroll]');
        const scrollTop = scroller?.scrollTop ?? 0;
        const unregister = context.register({ id, onBack: () => onBackRef.current() });
        return () => {
            unregister();
            requestAnimationFrame(() => {
                if (opener?.isConnected && opener.getClientRects().length) {
                    opener.focus({ preventScroll: true });
                    if (scroller) scroller.scrollTop = scrollTop;
                }
            });
        };
    }, [id, context.register]);

    useLayoutEffect(() => {
        if (!active || !sectionRef.current) return;
        const section = sectionRef.current;
        const scroller = section.closest<HTMLElement>('[data-page-scroll]');
        if (scroller) scroller.scrollTop = 0;
        const choiceOnly = section.querySelectorAll('[role="radiogroup"]').length === 1
            && !section.querySelector('input, textarea');
        const target = (choiceOnly ? section.querySelector<HTMLElement>('[aria-checked="true"]') : null)
            ?? section.querySelector<HTMLElement>('h1');
        if (target) {
            if (target.tagName === 'H1') target.tabIndex = -1;
            target.focus({ preventScroll: true });
            if (target.getAttribute('aria-checked') === 'true') target.scrollIntoView({ block: 'nearest' });
        }
    }, [active, context.host]);

    if (!context.host) return null;
    return createPortal(
        <section
            ref={sectionRef}
            data-secondary-page={id}
            style={{ display: active ? undefined : 'none' }}
            className={`mx-auto w-full ${wide ? 'max-w-[864px]' : 'max-w-[704px]'} px-4 pb-8 md:px-8`}
        >
            <BackHeader
                title={title}
                parentLabel={backLabel ?? t('shell.back')}
                onBack={onBack}
                className="sticky top-0 z-10 bg-[var(--c-paper)]"
            />
            <div className="pt-2">{children}</div>
        </section>,
        context.host,
    );
}
