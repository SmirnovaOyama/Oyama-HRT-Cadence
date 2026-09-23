import React, { useEffect, useState } from 'react';
import { Attention, BackedUp, Check, ChevronRight, Cloud, CloudOff, Lock, Spinner } from '../../components/icons';
import type { IconComponent } from '../../components/icons';
import type { SyncStatus } from '../../hooks/useCloudSync';
import { describeSyncError } from '../../hooks/useCloudSync';
import type { Lang } from '../../i18n/translations';
import { LOCALE_MAP } from '../../utils/helpers';

/* Pieces shared by the You tab, its sub-pages and the account page. */

/** Check drawn after the selected row of a single-selection ListGroup. */
export const LIST_CHECK = <Check size={22} />;
/** Chevron drawn after a drill-in row. */
export const LIST_CHEVRON = <ChevronRight size={16} />;

/** Page body for settings-style pages: 16px gutter on phones, one centred
 *  column about 640px wide on larger screens (format_rules.md 12), and room
 *  under the content for the bottom bar. */
export function YouPage({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={`mx-auto w-full max-w-[704px] px-4 pb-32 md:px-8 ${className ?? ''}`}>{children}</div>;
}

/** Small group header (15/20 600 muted, 16px inset) for content that is not a
 *  ListGroup, such as a status panel or a hand-built list. */
export function GroupHeader({ children, id }: { children: React.ReactNode; id?: string }) {
    return <h2 id={id} className="list-group-header">{children}</h2>;
}

/** 40px leading tile for a list row (C11): plate fill, muted 22px icon. */
export function IconTile({ icon: Icon, danger = false }: { icon: IconComponent; danger?: boolean }) {
    return (
        <span
            aria-hidden="true"
            className={`grid h-10 w-10 place-items-center rounded-[12px] ${danger
                ? 'bg-[var(--c-danger-fill)] text-[var(--c-danger)]'
                : 'bg-[var(--c-plate)] text-[var(--c-muted)]'}`}
        >
            <Icon size={22} />
        </span>
    );
}

/** Round avatar: the uploaded picture, or the first letter of the username
 *  on the accent container when there is none. */
export function Avatar({ username, size = 56, cacheKey }: { username: string; size?: number; cacheKey?: number }) {
    const [failed, setFailed] = useState(false);
    const src = `/api/user/avatar/${encodeURIComponent(username)}${cacheKey ? `?t=${cacheKey}` : ''}`;
    useEffect(() => setFailed(false), [src]);
    return (
        <span
            aria-hidden="true"
            className="relative grid flex-none place-items-center overflow-hidden rounded-full bg-[var(--c-accent-container)] font-semibold text-[var(--c-on-accent-container)]"
            style={{ width: size, height: size, fontSize: Math.round(size * 0.43), lineHeight: 1 }}
        >
            {username.charAt(0).toUpperCase()}
            {!failed && (
                <img
                    src={src}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={() => setFailed(true)}
                />
            )}
        </span>
    );
}

/** Re-render every `ms` so relative times ("4 minutes ago") stay honest. */
function useTick(ms: number) {
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => setTick(n => n + 1), ms);
        return () => window.clearInterval(id);
    }, [ms]);
}

function relativeTime(then: number, lang: Lang): string {
    const seconds = Math.round((then - Date.now()) / 1000);
    const locale = LOCALE_MAP[lang] ?? 'en-US';
    let rtf: Intl.RelativeTimeFormat;
    try {
        rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    } catch {
        return new Date(then).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }
    const abs = Math.abs(seconds);
    if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour');
    return rtf.format(Math.round(seconds / 86400), 'day');
}

export interface SyncWords {
    icon: IconComponent;
    /** Colour class for the icon. */
    tone: string;
    title: string;
    sub: string;
    /** The state as one short line with no closing full stop, for a row's
     *  sub-line ("Backed up 4 minutes ago"). */
    line: string;
    spin?: boolean;
}

/**
 * The backup state in words. `status` is undefined when the host has not
 * passed the live sync state; the words then fall back to the preference.
 */
/** Drop the closing full stop so a sentence can sit in a row as a state line. */
function withLine(words: Omit<SyncWords, 'line'>, line?: string): SyncWords {
    return { ...words, line: line ?? words.title.replace(/[.。．]$/u, '') };
}

export function useSyncWords(opts: {
    t: (key: string) => string;
    lang: Lang;
    autoSync: boolean;
    status?: SyncStatus;
    errorCode?: string | null;
    lastSyncedAt?: number | null;
}): SyncWords {
    const { t, lang, autoSync, status, errorCode, lastSyncedAt } = opts;
    useTick(30_000);

    const muted = 'text-[var(--c-muted)]';
    const encrypted = t('you.sync.encrypted');

    if (status === 'locked') {
        return withLine({ icon: Lock, tone: 'text-[var(--c-attention)]', title: t('you.sync.locked'), sub: t('you.sync.locked_sub') }, t('you.sync.locked_short'));
    }
    if (status === 'error') {
        return withLine({ icon: Attention, tone: 'text-[var(--c-attention)]', title: t('you.sync.error'), sub: describeSyncError(errorCode ?? null, t) }, t('you.sync.error_short'));
    }
    if (!autoSync || status === 'off') {
        return withLine({ icon: CloudOff, tone: muted, title: t('you.sync.off'), sub: t('you.sync.off_sub') });
    }
    if (status === 'syncing') {
        return withLine({ icon: Spinner, tone: muted, title: t('you.sync.syncing'), sub: encrypted, spin: true });
    }
    if (lastSyncedAt) {
        const title = Date.now() - lastSyncedAt < 60_000
            ? t('you.sync.just_now')
            : t('you.sync.backed_up').replace('{time}', relativeTime(lastSyncedAt, lang));
        return withLine({ icon: BackedUp, tone: 'text-[var(--c-target)]', title, sub: encrypted });
    }
    if (status === 'idle') {
        return withLine({ icon: Cloud, tone: muted, title: t('you.sync.idle'), sub: encrypted });
    }
    return { icon: Cloud, tone: muted, title: t('you.sync.on'), sub: encrypted, line: t('you.sync.on_short') };
}

/** C14 plate panel: the backup state as an icon plus words, with room for a
 *  switch row or an action underneath. */
export function SyncPanel({ words, children }: { words: SyncWords; children?: React.ReactNode }) {
    const Icon = words.icon;
    return (
        <section className="flex flex-col gap-3 rounded-2xl bg-[var(--c-plate)] p-4" aria-live="polite">
            <div className="flex items-start gap-3">
                <Icon size={22} className={`mt-px flex-none ${words.tone} ${words.spin ? 'animate-spin' : ''}`} />
                <div className="flex min-w-0 flex-1 flex-col">
                    <p className="m-0 text-base font-semibold text-[var(--c-ink)]">{words.title}</p>
                    <p className="m-0 text-sm text-[var(--c-muted)]">{words.sub}</p>
                </div>
            </div>
            {children}
        </section>
    );
}
