import React from 'react';
import { Today, Timeline, Tests, You, Shield, Log, Reminder, Supplies, Attention } from './icons';
import type { IconComponent } from './icons';
import { Button } from './ui';
import PixelCat from './PixelCat';
import { useTranslation } from '../contexts/LanguageContext';
import { tabForView, TabKey, ViewKey } from '../hooks/useAppNavigation';

/* Desktop rail (boards DesktopToday / DesktopAssistant, recipe C17): plate
   background with a right hairline, the wordmark, the two main actions, the
   top-level destinations. Account, mode and backup details belong on You.
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
    /** A tracked supply is out or due for reordering: the Supplies item then
     *  carries the attention icon and says so to screen readers. */
    suppliesAttention?: boolean;
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
    { id: 'reminders', labelKey: 'reminders.title', icon: Reminder },
    { id: 'supplies', labelKey: 'supplies.title', icon: Supplies },
    { id: 'settings', labelKey: 'shell.tab.you', icon: You },
];

const ADMIN_ITEM: RailItem = { id: 'admin', labelKey: 'nav.admin', icon: Shield };

const Sidebar: React.FC<SidebarProps> = ({
    currentView,
    onViewChange,
    onLogDose,
    onAddTest,
    isAdmin,
    locked = false,
    suppliesAttention = false,
}) => {
    const { t } = useTranslation();

    const items = isAdmin ? [...ITEMS, ADMIN_ITEM] : ITEMS;
    const activeTab = tabForView(currentView, isAdmin, true);

    return (
        <aside
            aria-label={t('shell.nav.sidebar')}
            // Keep icons proportional to this fixed-width rail and its local type sizes.
            style={{ '--ui-scale': 1 } as React.CSSProperties}
            className="hidden md:flex w-[264px] h-full shrink-0 flex-col gap-6 overflow-y-auto scrollbar-hide px-4 py-6 bg-[var(--c-plate)] border-r border-[var(--c-hairline)]"
        >
            {/* Wordmark: the real pixel cat, then the app name. */}
            <div className="flex min-h-[44px] items-center gap-2.5">
                <PixelCat pose="donut" size={44} className="shrink-0" />
                <span className="whitespace-nowrap text-[20px] leading-7 font-medium text-[var(--c-ink)]">Oyama Tracker</span>
            </div>

            <div className="flex flex-col gap-3">
                <Button variant="primary" compact block className="text-[17px] leading-[24px]" onClick={onLogDose} disabled={locked}>
                    <Log size={18} />
                    <span>{t('shell.rail.log_dose')}</span>
                </Button>
                <Button variant="secondary" compact block onTint className="text-[17px] leading-[24px]" onClick={onAddTest} disabled={locked}>
                    <Tests size={18} />
                    {t('shell.rail.add_test')}
                </Button>
            </div>

            <nav aria-label={t('shell.nav.main')} className="flex flex-col gap-1">
                {items.map(({ id, labelKey, icon: Icon }) => {
                    const isActive = activeTab === id;
                    const attention = id === 'supplies' && suppliesAttention;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onViewChange(id)}
                            disabled={locked}
                            aria-current={isActive ? 'page' : undefined}
                            aria-label={attention ? t('shell.rail.supplies_attention') : undefined}
                            className={`rail-item flex min-h-[44px] w-full items-center gap-3 rounded-full px-4 text-left text-[17px] leading-[24px] font-medium ${isActive
                                ? 'bg-[var(--c-plate-strong)] text-[var(--c-ink)]'
                                : 'text-[var(--c-muted)] hover:text-[var(--c-ink)] hover:bg-[var(--c-plate-strong)]'
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                            <Icon size={20} className="shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{t(labelKey)}</span>
                            {attention && <Attention size={20} aria-hidden className="shrink-0 text-[var(--c-attention)]" />}
                        </button>
                    );
                })}
            </nav>

        </aside>
    );
};

export default Sidebar;
