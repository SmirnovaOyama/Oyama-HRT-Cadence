import { createContext, useContext } from 'react';

export interface PageEntry { id: string; onBack: () => void }
interface PageNavigation {
    host: HTMLDivElement | null;
    setHost: (host: HTMLDivElement | null) => void;
    entries: PageEntry[];
    register: (entry: PageEntry) => () => void;
    closeAll: () => void;
}

// Page-header refreshes must preserve the context used by mounted parent pages.
export const PageContext = createContext<PageNavigation | null>(null);

export function useSecondaryNavigation() {
    const value = useContext(PageContext);
    if (!value) throw new Error('Secondary pages require SecondaryPageProvider');
    return { hasPages: value.entries.length > 0, closeAll: value.closeAll };
}
