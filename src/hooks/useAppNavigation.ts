import { useState, useRef, useEffect } from 'react';

export type ViewKey = 'home' | 'share' | 'history' | 'lab' | 'lab-calibration' | 'settings' | 'account' | 'admin' | 'sessions' | 'two-factor' | 'change-password' | 'delete-account' | 'edit-profile' | 'edit-avatar' | 'pk-params' | 'settings-hrt-mode' | 'settings-appearance' | 'settings-weight' | 'settings-export' | 'settings-import' | 'settings-transparency' | 'settings-milk-tea' | 'settings-cat-states' | 'reminders' | 'supplies';

/** The top-level destinations: the four tabs (Today, Timeline, Tests, You)
 *  plus Admin, which only the desktop rail lists. */
export type TabKey = 'home' | 'history' | 'lab' | 'settings' | 'admin' | 'reminders' | 'supplies';

/**
 * Which top-level destination a view belongs to, so a sub-page keeps its parent
 * tab (mobile bar) or rail item (desktop) highlighted. Account and every
 * settings or account sub-page live under You; calibration and the PK
 * parameters sit with the blood tests they tune. Admin has its own rail item on
 * desktop; on mobile it is reached from You, so it maps there when
 * `adminHasItem` is false. Reminders and Supplies work the same way with
 * `routineHasItems` (true on the desktop rail). Anything unknown falls back to You, where the rest
 * of the app's pages live.
 */
export const tabForView = (view: ViewKey, adminHasItem = false, routineHasItems = false): TabKey => {
    switch (view) {
        case 'home':
        case 'share':
            return 'home';
        case 'history':
            return 'history';
        case 'lab':
        case 'lab-calibration':
        case 'pk-params':
            return 'lab';
        case 'admin':
            return adminHasItem ? 'admin' : 'settings';
        // Reminders and Supplies have their own rail items on desktop; on
        // mobile they are reached from You, like Admin.
        case 'reminders':
        case 'supplies':
            return routineHasItems ? view : 'settings';
        default:
            return 'settings';
    }
};

export const useAppNavigation = () => {
    // --- State ---
    const [currentView, setCurrentView] = useState<ViewKey>('home');
    const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
    const mainScrollRef = useRef<HTMLDivElement>(null);

    const viewOrder: ViewKey[] = ['home', 'share', 'history', 'lab', 'lab-calibration', 'settings', 'account', 'sessions', 'two-factor', 'change-password', 'delete-account', 'edit-profile', 'edit-avatar', 'pk-params', 'settings-hrt-mode', 'settings-appearance', 'settings-weight', 'settings-export', 'settings-import', 'settings-transparency', 'settings-milk-tea', 'settings-cat-states', 'reminders', 'supplies', 'admin'];

    // --- Actions ---
    const handleViewChange = (view: ViewKey) => {
        if (view === currentView) return;
        const currentIndex = viewOrder.indexOf(currentView);
        const nextIndex = viewOrder.indexOf(view);
        setTransitionDirection(nextIndex >= currentIndex ? 'forward' : 'backward');
        setCurrentView(view);
    };

    // --- Effects ---
    // Reset scroll when switching views
    useEffect(() => {
        const el = mainScrollRef.current;
        if (el) el.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }, [currentView]);

    return {
        currentView,
        transitionDirection,
        handleViewChange,
        mainScrollRef,
    };
};
