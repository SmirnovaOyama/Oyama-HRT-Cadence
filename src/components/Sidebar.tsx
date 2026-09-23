import React, { useEffect, useState } from 'react';
import { Today, Timeline, Tests, You, Shield, Log } from './icons';
import type { IconComponent } from './icons';
import { Button } from './ui';
import PixelCat from './PixelCat';
import { useTranslation } from '../contexts/LanguageContext';
import { useHRTMode } from '../contexts/HRTModeContext';
import { tabForView, TabKey, ViewKey } from '../hooks/useAppNavigation';
import type { SyncStatus } from '../hooks/useCloudSync';
import { LOCALE_MAP } from '../utils/helpers';
import type { Lang } from '../i18n/translations';

/* Desktop rail (boards DesktopToday / DesktopAssistant, recipe C17): plate
   background with a right hairline, the wordmark, the two main actions, the
   top-level destinations and a footer with the HRT mode and the backup state.
   Hidden below md, where the bottom TabBar takes over. */

interface SidebarProps {
    currentView: ViewKey;
    onViewChange: (view: ViewKey) => void;
    /** Opens the dose form for a new dose. */
    onLogDose: () => void;
    /** Goes to Blood tests and opens its add-result form. */
    onAddTest: () => void;
    isAdmin: boolean;
    /** Forced 2FA setup: everything but the setup page is locked. */
    locked?: boolean;
    isSignedIn: boolean;
    syncStatus: SyncStatus;
    lastSyncedAt: number | null;
}

interface RailItem {
    id: TabKey;
    labelKey: string;
    icon: IconComponent;
}

const ITEMS: RailItem[] = [
    { id: 'home', labelKey: 'shell.tab.today', icon: Today },
    { id: 'history', labelKey: 'shell.tab.timeline', icon: Timeline },
    { id: 'lab', labelKey: 'shell.rail.tests', icon: Tests },
    { id: 'settings', labelKey: 'shell.tab.you', icon: You },
];

const ADMIN_ITEM: RailItem = { id: 'admin', labelKey: 'nav.admin', icon: Shield };

/** "4 minutes ago" in the reader's language, or null under a minute. */
const relativeTime = (thenMs: number, nowMs: number, lang: Lang): string | null => {
    const sec = Math.max(0, Math.round((nowMs - thenMs) / 1000));
    if (sec < 60) return null;
    let rtf: Intl.RelativeTimeFormat;
    try {
        rtf = new Intl.RelativeTimeFormat(LOCALE_MAP[lang] || 'en-US', { numeric: 'always' });
    } catch {
        return null;
    }
    if (sec < 3600) return rtf.format(-Math.floor(sec / 60), 'minute');
    if (sec < 86400) return rtf.format(-Math.floor(sec / 3600), 'hour');
    return rtf.format(-Math.floor(sec / 86400), 'day');
};

/** The cloud backup state in words, for the rail footer. */
export const useBackupLine = (isSignedIn: boolean, status: SyncStatus, lastSyncedAt: number | null): string => {
    const { t, lang } = useTranslation();
    const [now, setNow] = useState(() => Date.now());

    // Keep "4 minutes ago" honest while the page sits open.
    useEffect(() => {
        if (status !== 'synced' || lastSyncedAt === null) return;
        setNow(Date.now());
        const id = window.setInterval(() => setNow(Date.now()), 30_000);
        return () => window.clearInterval(id);
    }, [status, lastSyncedAt]);

    if (!isSignedIn) return t('shell.sync.local_only');
    switch (status) {
        case 'off': return t('shell.sync.off');
        case 'idle': return t('shell.sync.idle');
        case 'syncing': return t('shell.sync.syncing');
        case 'locked': return t('shell.sync.locked');
        case 'error': return t('shell.sync.error');
        case 'synced': {
            if (lastSyncedAt === null) return t('shell.sync.synced_plain');
            const rel = relativeTime(lastSyncedAt, now, lang);
            return rel === null ? t('shell.sync.synced_now') : t('shell.sync.synced').replace('{time}', rel);
        }
    }
};

const Sidebar: React.FC<SidebarProps> = ({
    currentView,
    onViewChange,
    onLogDose,
    onAddTest,
    isAdmin,
    locked = false,
    isSignedIn,
    syncStatus,
    lastSyncedAt,
}) => {
    const { t } = useTranslation();
    const { mode } = useHRTMode();
    const backupLine = useBackupLine(isSignedIn, syncStatus, lastSyncedAt);

    const items = isAdmin ? [...ITEMS, ADMIN_ITEM] : ITEMS;
    const activeTab = tabForView(currentView, isAdmin);

    return (
        <aside
            aria-label={t('shell.nav.sidebar')}
            className="hidden md:flex w-[264px] h-full shrink-0 flex-col gap-6 overflow-y-auto scrollbar-hide px-4 py-6 bg-[var(--c-plate)] border-r border-[var(--c-hairline)]"
        >
            {/* Wordmark: the real pixel cat, then the app name. */}
            <div className="flex min-h-11 items-center gap-2.5">
                <PixelCat pose="donut" size={52} className="shrink-0" />
                <span className="whitespace-nowrap text-[22px] leading-7 font-semibold text-[var(--c-ink)]">Oyama Tracker</span>
            </div>

            <div className="flex flex-col gap-3">
                <Button variant="primary" compact block onClick={onLogDose} disabled={locked}>
                    <Log size={20} />
                    <span>{t('shell.rail.log_dose')}</span>
                </Button>
                <Button variant="secondary" compact block onTint onClick={onAddTest} disabled={locked}>
                    {t('shell.rail.add_test')}
                </Button>
            </div>

            <nav aria-label={t('shell.nav.main')} className="flex flex-col gap-1">
                {items.map(({ id, labelKey, icon: Icon }) => {
                    const isActive = activeTab === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onViewChange(id)}
                            disabled={locked}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex h-11 w-full items-center gap-3 rounded-xl border px-3 text-left text-base ${isActive
                                ? 'border-[var(--c-hairline)] bg-[var(--c-surface)] font-semibold text-[var(--c-ink)]'
                                : 'border-transparent font-medium text-[var(--c-muted)] hover:text-[var(--c-ink)] hover:bg-[var(--c-plate-strong)]'
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                            <Icon size={20} className="shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{t(labelKey)}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="flex-1" />

            <div className="flex flex-col gap-1 border-t border-[var(--c-hairline)] pt-4 text-sm text-[var(--c-muted)]">
                <p className="m-0">{t(mode === 'transmasc' ? 'mode.transmasc' : 'mode.transfem')}</p>
                <p className="m-0">{backupLine}</p>
            </div>
        </aside>
    );
};

export default Sidebar;
