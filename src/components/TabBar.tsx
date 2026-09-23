import React from 'react';
import { Today, Timeline, Tests, You, Log } from './icons';
import type { IconComponent } from './icons';
import { useTranslation } from '../contexts/LanguageContext';
import { tabForView, TabKey, ViewKey } from '../hooks/useAppNavigation';

/* Mobile bottom tab bar (boards Main / TodayDark, recipe C16). Docked, not
   floating: white (dark #1E1A16) with a 1px top hairline, five slots with the
   Log button in the middle. Drawn by the .tabbar-* classes in index.css.
   Hidden from md up, where the Sidebar rail takes over. */

interface TabBarProps {
    currentView: ViewKey;
    onViewChange: (view: ViewKey) => void;
    /** Opens the dose form for a new dose. */
    onLogDose: () => void;
    /** Forced 2FA setup: everything but the setup page is locked. */
    locked?: boolean;
}

interface Tab {
    id: TabKey;
    labelKey: string;
    icon: IconComponent;
}

const LEFT: Tab[] = [
    { id: 'home', labelKey: 'shell.tab.today', icon: Today },
    { id: 'history', labelKey: 'shell.tab.timeline', icon: Timeline },
];

const RIGHT: Tab[] = [
    { id: 'lab', labelKey: 'shell.tab.tests', icon: Tests },
    { id: 'settings', labelKey: 'shell.tab.you', icon: You },
];

const TabBar: React.FC<TabBarProps> = ({ currentView, onViewChange, onLogDose, locked = false }) => {
    const { t } = useTranslation();
    const activeTab = tabForView(currentView);

    const renderTab = ({ id, labelKey, icon: Icon }: Tab) => {
        const isActive = activeTab === id;
        return (
            <button
                key={id}
                type="button"
                className="tabbar-item"
                aria-current={isActive ? 'page' : undefined}
                disabled={locked}
                onClick={() => onViewChange(id)}
            >
                <span className="tabbar-pill">
                    <Icon size={22} />
                </span>
                <span className="tabbar-label">{t(labelKey)}</span>
            </button>
        );
    };

    return (
        <nav aria-label={t('shell.nav.main')} className="tabbar md:hidden">
            {LEFT.map(renderTab)}
            <button
                type="button"
                className="tabbar-item tabbar-log"
                aria-label={t('shell.rail.log_dose')}
                disabled={locked}
                onClick={onLogDose}
            >
                <span className="tabbar-pill">
                    <Log size={22} />
                </span>
                <span className="tabbar-label" aria-hidden="true">{t('shell.tab.log')}</span>
            </button>
            {RIGHT.map(renderTab)}
        </nav>
    );
};

export default TabBar;
