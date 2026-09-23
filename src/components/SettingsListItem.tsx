import React from 'react';
import { ChevronRight } from './icons';
import { ListRow } from './ui';

// Cadence tokens flip in .dark on their own, so no dark: pair is needed.
const muted = 'text-[var(--c-muted)]';
const on = 'text-[var(--c-ink)]';

export const settingsMuted = muted;
export const settingsOn = on;

// Accepts Cadence icons as well as custom icon components with the same props.
export type SettingsIcon = React.ComponentType<{ size?: number | string; className?: string }>;

/** A bare 18px muted icon, for inline use beside text. */
export function SettingsIconBox({ icon: Icon }: { icon: SettingsIcon }) {
    return <Icon size={18} className={`${muted} shrink-0`} />;
}

interface SettingsListItemProps {
    /** Kept for older callers. Settings lists carry no icon tiles
     *  (design/cadence/spec/format_rules.md 5), so it is not drawn. */
    icon?: SettingsIcon;
    title: string;
    description?: string;
    trailing?: React.ReactNode;
    onClick?: () => void;
    showChevron?: boolean;
    className?: string;
}

/**
 * Legacy settings row, now a thin wrapper over the Cadence ListRow: a one-line
 * title, an optional short state line, trailing content and a drill-in chevron.
 * Put it inside a ListGroup so it gets the group's border and separators.
 * New code should use ListGroup and ListRow directly.
 */
export const SettingsListItem: React.FC<SettingsListItemProps> = ({
    title,
    description,
    trailing,
    onClick,
    showChevron = true,
    className,
}) => (
    <ListRow
        title={title}
        sub={description}
        trailing={trailing}
        onClick={onClick}
        drillIn={showChevron && !!onClick}
        chevron={<ChevronRight size={16} />}
        className={className}
    />
);

export function maskIpAddress(ip: string | null | undefined): string {
    if (!ip) return '—';
    const trimmed = ip.trim();
    if (!trimmed) return '—';

    const v4 = trimmed.split('.');
    if (v4.length === 4 && v4.every(p => /^\d{1,3}$/.test(p))) {
        return `${v4[0]}.${v4[1]}.***.***`;
    }

    if (trimmed.includes(':')) {
        const head = trimmed.split(':').filter(Boolean)[0] ?? '';
        return head ? `${head}:****:****:****` : '****:****:****:****';
    }

    return '***.***.***.***';
}
