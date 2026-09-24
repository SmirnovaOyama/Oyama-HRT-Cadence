import React, { useEffect, useState, useCallback } from 'react';
import {
    Attention, ChevronLeft, ChevronRight, Cloud, Delete, Notice, Search, Verified,
} from '../components/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { formatBytes } from '../utils/helpers';
import { adminService, AdminUser, AdminUser2FA, BackupMeta, TwoFactorScope, StorageReport } from '../services/admin';
import { useDialog } from '../contexts/DialogContext';
import { noticeService, NoticeLevel, SiteNotice } from '../services/notice';
import { Lang } from '../i18n/translations';
import { BackHeader, Button, ListGroup, ListRow, PageHeader, SegmentedControl } from '../components/ui';
import { SecondaryPage } from '../components/ui/SecondaryPage';
import DateTimePicker from '../components/DateTimePicker';
import { Avatar, LIST_CHECK, LIST_CHEVRON, YouPage } from './you/shared';
import { ActionTitle, BusySpinner, DangerTitle, ErrorNote, Field, Loading, Note, Panel, PasswordInput } from './account/shared';

/* The admin console. It is an operator's tool, so its words stay in English
   (as they always have); only the look follows Cadence. */

type AdminCat = 'users' | 'notice' | 'system';
type UserPanel =
    | null
    | { type: 'actions'; user: AdminUser }
    | { type: 'password'; user: AdminUser }
    | { type: 'edit'; user: AdminUser }
    | { type: 'backups'; user: AdminUser }
    | { type: '2fa'; user: AdminUser };

let _savedCat: AdminCat = 'users';

function timeAgo(ts: number | null | undefined): string {
    if (!ts) return '—';
    const diff = Math.floor(Date.now() / 1000) - ts;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
}

const Admin: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const { t } = useTranslation();
    const { token } = useAuth();
    const { showDialog } = useDialog();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cat, setCat] = useState<AdminCat>(_savedCat);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchDebounce, setSearchDebounce] = useState('');
    const [panel, setPanel] = useState<UserPanel>(null);

    const [page, setPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const PAGE_SIZE = 20;
    const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));

    const [newPassword, setNewPassword] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [backups, setBackups] = useState<BackupMeta[]>([]);
    const [backupsLoading, setBackupsLoading] = useState(false);
    const [twoFA, setTwoFA] = useState<AdminUser2FA | null>(null);
    const [twoFALoading, setTwoFALoading] = useState(false);

    // --- Site notice ---
    // `noticeLang` is which text the textarea is editing: the default body, or
    // one per-locale override. The overrides are optional everywhere — a notice
    // with only a default is shown in that wording to everyone.
    const [notice, setNotice] = useState<SiteNotice | null>(null);
    const [noticeLoading, setNoticeLoading] = useState(false);
    const [noticeSaving, setNoticeSaving] = useState(false);
    const [noticeBody, setNoticeBody] = useState('');
    const [noticeI18n, setNoticeI18n] = useState<Partial<Record<Lang, string>>>({});
    const [noticeLevel, setNoticeLevel] = useState<NoticeLevel>('info');
    const [noticeStart, setNoticeStart] = useState('');
    const [noticeEnd, setNoticeEnd] = useState('');
    const [noticeLang, setNoticeLang] = useState<'default' | Lang>('default');
    const [noticePicker, setNoticePicker] = useState<'start' | 'end' | null>(null);

    const cats: { value: AdminCat; label: string }[] = [
        { value: 'users', label: 'Users' },
        { value: 'notice', label: 'Notice' },
        { value: 'system', label: 'System' },
    ];

    const selectCat = (c: AdminCat) => {
        _savedCat = c;
        setCat(c);
    };

    const [storage, setStorage] = useState<StorageReport | null>(null);
    const [storageLoading, setStorageLoading] = useState(false);
    const [storageError, setStorageError] = useState<string | null>(null);
    const loadStorage = async () => {
        if (!token) return;
        setStorageLoading(true);
        setStorageError(null);
        try { setStorage(await adminService.getStorage(token)); }
        catch (e: any) { setStorageError(e?.message || 'Failed to measure storage.'); }
        finally { setStorageLoading(false); }
    };

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => setSearchDebounce(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchUsers = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const data = await adminService.getUsers(token, searchDebounce || undefined, page, PAGE_SIZE);
            setUsers(data.users);
            setTotalUsers(data.total);
        } catch {
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [token, searchDebounce, page]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Reset to page 1 when search changes
    useEffect(() => { setPage(1); }, [searchDebounce]);

    const handleDeleteUser = (user: AdminUser) => {
        if (!token) return;
        showDialog('confirm', `Delete user "${user.username}"? This cannot be undone.`, async () => {
            try {
                await adminService.deleteUser(token, user.id);
                setUsers(prev => prev.filter(u => u.id !== user.id));
                if (panel && 'user' in panel && panel.user.id === user.id) setPanel(null);
                showDialog('alert', 'User deleted.');
            } catch { showDialog('alert', 'Failed to delete user.'); }
        });
    };

    const openPasswordPanel = (user: AdminUser) => {
        setNewPassword('');
        setPanel({ type: 'password', user });
    };

    const openEditPanel = (user: AdminUser) => {
        setNewUsername(user.username);
        setPanel({ type: 'edit', user });
    };

    const submitPassword = async () => {
        if (!token || !panel || panel.type !== 'password') return;
        try {
            const { sessionsRevoked } = await adminService.changeUserPassword(token, panel.user.id, newPassword);
            showDialog('alert', sessionsRevoked > 0
                ? `Password updated. Signed out ${sessionsRevoked} active session${sessionsRevoked === 1 ? '' : 's'}.`
                : 'Password updated.');
            setPanel(null);
        } catch (e: any) { showDialog('alert', e.message || 'Failed to update password.'); }
    };

    const submitUsername = async () => {
        if (!token || !panel || panel.type !== 'edit') return;
        try {
            await adminService.changeUsername(token, panel.user.id, newUsername);
            setUsers(prev => prev.map(u => u.id === panel.user.id ? { ...u, username: newUsername.trim() } : u));
            showDialog('alert', 'Username updated.');
            setPanel(null);
        } catch (e: any) { showDialog('alert', e.message || 'Failed to update username.'); }
    };

    const handleResetAvatar = async (user: AdminUser) => {
        if (!token) return;
        showDialog('confirm', `Reset avatar for "${user.username}"?`, async () => {
            try {
                await adminService.resetAvatar(token, user.id);
                showDialog('alert', 'Avatar reset.');
            } catch { showDialog('alert', 'Failed to reset avatar.'); }
        });
    };

    const openTwoFAPanel = async (user: AdminUser) => {
        if (!token) return;
        setTwoFA(null);
        setPanel({ type: '2fa', user });
        setTwoFALoading(true);
        try {
            setTwoFA(await adminService.getUser2FA(token, user.id));
        } catch { setTwoFA(null); }
        finally { setTwoFALoading(false); }
    };

    const clearTwoFA = (user: AdminUser, scope: TwoFactorScope, confirmText: string) => {
        if (!token) return;
        showDialog('confirm', confirmText, async () => {
            try {
                const cleared = await adminService.clearUser2FA(token, user.id, scope);
                setTwoFA(await adminService.getUser2FA(token, user.id));
                setUsers(prev => prev.map(u => u.id === user.id ? {
                    ...u,
                    has_totp: cleared.totp ? 0 : u.has_totp,
                    passkey_count: cleared.passkeys > 0 ? 0 : u.passkey_count,
                } : u));
                const parts = [
                    cleared.totp && 'authenticator app',
                    cleared.passkeys > 0 && `${cleared.passkeys} passkey${cleared.passkeys === 1 ? '' : 's'}`,
                    cleared.backupCodes > 0 && `${cleared.backupCodes} backup code${cleared.backupCodes === 1 ? '' : 's'}`,
                ].filter(Boolean) as string[];
                const sessions = cleared.sessions > 0
                    ? ` ${cleared.sessions} session${cleared.sessions === 1 ? '' : 's'} signed out.`
                    : '';
                showDialog('alert', parts.length
                    ? `Removed ${parts.join(', ')}.${sessions}`
                    : `Nothing to remove — ${user.username} had no 2FA enrolled.`);
            } catch (e: any) { showDialog('alert', e.message || 'Failed to reset 2FA.'); }
        });
    };

    const openBackupsPanel = async (user: AdminUser) => {
        if (!token) return;
        setPanel({ type: 'backups', user });
        setBackupsLoading(true);
        try {
            const data = await adminService.getUserBackups(token, user.id);
            setBackups(data);
        } catch { setBackups([]); }
        finally { setBackupsLoading(false); }
    };

    const handleDeleteBackup = async (backupId: string) => {
        if (!token || !panel || panel.type !== 'backups') return;
        try {
            await adminService.deleteBackup(token, panel.user.id, backupId);
            setBackups(prev => prev.filter(b => b.id !== backupId));
            setUsers(prev => prev.map(u => u.id === panel.user.id ? { ...u, backup_count: Math.max(0, (u.backup_count || 1) - 1) } : u));
        } catch { showDialog('alert', 'Failed to delete backup.'); }
    };

    const handlePurgeBackups = async () => {
        if (!token || !panel || panel.type !== 'backups') return;
        showDialog('confirm', `Purge ALL backups for "${panel.user.username}"?`, async () => {
            try {
                await adminService.purgeBackups(token, panel.user.id);
                setBackups([]);
                setUsers(prev => prev.map(u => u.id === panel.user.id ? { ...u, backup_count: 0, last_backup_at: null, total_backup_size: 0 } : u));
                showDialog('alert', 'All backups purged.');
            } catch { showDialog('alert', 'Failed to purge backups.'); }
        });
    };

    const panelSubtitle = (type: NonNullable<UserPanel>['type']) =>
        type === 'password' ? 'Change password'
            : type === 'edit' ? 'Edit profile'
                : type === '2fa' ? 'Two-step sign-in'
                    : type === 'backups' ? 'Cloud backups'
                        : 'Manage account';

    const renderPanel = () => {
        if (!panel) return null;
        const user = panel.user;

        return (
            <SecondaryPage
                key={`${user.id}-${panel.type}`}
                title={panel.type === 'actions' ? user.username : panelSubtitle(panel.type)}
                backLabel={panel.type === 'actions' ? t('nav.admin') : user.username}
                onBack={() => setPanel(panel.type === 'actions' ? null : { type: 'actions', user })}
            >
                    <div className="flex flex-col gap-5">

                        {panel.type === 'actions' && (
                            <div className="flex flex-col gap-6">
                                <ListGroup chevronIcon={LIST_CHEVRON}>
                                    <ListRow
                                        title="Cloud backups"
                                        value={(user.backup_count ?? 0) > 0 ? String(user.backup_count) : undefined}
                                        drillIn
                                        onClick={() => openBackupsPanel(user)}
                                    />
                                    <ListRow
                                        title="Two-step sign-in"
                                        drillIn
                                        onClick={() => openTwoFAPanel(user)}
                                    />
                                    <ListRow
                                        title="Change password"
                                        drillIn
                                        onClick={() => openPasswordPanel(user)}
                                    />
                                    <ListRow
                                        title="Edit profile"
                                        drillIn
                                        onClick={() => openEditPanel(user)}
                                    />
                                </ListGroup>
                                <ListGroup>
                                    <ListRow
                                        title={<DangerTitle>Delete user</DangerTitle>}
                                        onClick={() => handleDeleteUser(user)}
                                    />
                                </ListGroup>
                            </div>
                        )}

                        {panel.type === 'password' && (
                            <form
                                className="flex flex-col gap-4"
                                onSubmit={e => { e.preventDefault(); if (newPassword.length >= 8) void submitPassword(); }}
                            >
                                <Field label="New password" htmlFor="admin-new-password" hint="At least 8 characters. Every session of this account is signed out.">
                                    <PasswordInput
                                        id="admin-new-password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        autoComplete="new-password"
                                        autoFocus
                                    />
                                </Field>
                                <Button type="submit" variant="primary" block disabled={newPassword.length < 8}>
                                    Update password
                                </Button>
                            </form>
                        )}

                        {panel.type === 'edit' && (
                            <div className="flex flex-col gap-6">
                                <form
                                    className="flex flex-col gap-4"
                                    onSubmit={e => {
                                        e.preventDefault();
                                        if (newUsername.trim() && newUsername.trim() !== user.username) void submitUsername();
                                    }}
                                >
                                    <Field label="Username" htmlFor="admin-username">
                                        <input
                                            id="admin-username"
                                            type="text"
                                            value={newUsername}
                                            onChange={e => setNewUsername(e.target.value)}
                                            className="input-base"
                                            autoCapitalize="off"
                                            autoCorrect="off"
                                            spellCheck={false}
                                            autoFocus
                                        />
                                    </Field>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        compact
                                        className="self-end"
                                        disabled={!newUsername.trim() || newUsername.trim() === user.username}
                                    >
                                        Save username
                                    </Button>
                                </form>
                                <ListGroup footer="Removes the uploaded picture; the initial is shown instead.">
                                    <ListRow
                                        title={<DangerTitle>Reset avatar</DangerTitle>}
                                        onClick={() => handleResetAvatar(user)}
                                    />
                                </ListGroup>
                            </div>
                        )}

                        {panel.type === '2fa' && (
                            twoFALoading ? (
                                <Loading />
                            ) : !twoFA ? (
                                <Panel><Note>Could not load the two-step status.</Note></Panel>
                            ) : (
                                <div className="flex flex-col gap-6">
                                    <ListGroup>
                                        <ListRow title="Authenticator app" value={twoFA.totp ? 'On' : 'Off'} />
                                        <ListRow title="Passkeys" value={twoFA.passkeys === 0 ? 'None' : String(twoFA.passkeys)} />
                                        <ListRow title="Unused backup codes" value={twoFA.backupCodes === 0 ? 'None' : String(twoFA.backupCodes)} />
                                    </ListGroup>
                                    {/* Every action here removes a factor, so they share one
                                        bottom group rather than sitting beside the counts. */}
                                    <ListGroup footer="Erasing a factor drops this account back to its password alone. Confirm who is asking first.">
                                        <ListRow
                                            title={<DangerTitle>Turn off the authenticator app</DangerTitle>}
                                            disabled={!twoFA.totp}
                                            onClick={() => clearTwoFA(user, 'totp', `Turn off the authenticator app for "${user.username}"? They will sign in with their password alone, and every active session is signed out.`)}
                                        />
                                        <ListRow
                                            title={<DangerTitle>Remove all passkeys</DangerTitle>}
                                            disabled={twoFA.passkeys === 0}
                                            onClick={() => clearTwoFA(user, 'passkeys', `Remove all ${twoFA.passkeys} passkey(s) for "${user.username}"? Every active session is signed out.`)}
                                        />
                                        <ListRow
                                            title={<DangerTitle>Erase backup codes</DangerTitle>}
                                            disabled={twoFA.backupCodes === 0}
                                            onClick={() => clearTwoFA(user, 'backup_codes', `Erase the remaining backup codes for "${user.username}"? Their sessions stay signed in.`)}
                                        />
                                        <ListRow
                                            title={<DangerTitle>Erase everything</DangerTitle>}
                                            disabled={!twoFA.enabled && twoFA.backupCodes === 0}
                                            onClick={() => clearTwoFA(user, 'all', `Erase all two-step sign-in for "${user.username}"? This removes the authenticator secret, every passkey and every backup code, and signs out all of their sessions.`)}
                                        />
                                    </ListGroup>
                                </div>
                            )
                        )}

                        {panel.type === 'backups' && (
                            backupsLoading ? (
                                <Loading />
                            ) : backups.length === 0 ? (
                                <Panel><Note>No backups found.</Note></Panel>
                            ) : (
                                <div className="flex flex-col gap-6">
                                    <ListGroup
                                        header={`${backups.length} backup${backups.length === 1 ? '' : 's'}, ${formatBytes(backups.reduce((sum, b) => sum + b.data_size, 0))} in total`}
                                    >
                                        {backups.map(b => (
                                            <ListRow
                                                key={b.id}
                                                title={<span className="block truncate">{new Date(b.created_at * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>}
                                                sub={<span className="block truncate">{formatBytes(b.data_size)}, <span className="font-mono">{b.id.slice(0, 8)}</span></span>}
                                                trailing={
                                                    <Button
                                                        variant="icon"
                                                        onClick={() => handleDeleteBackup(b.id)}
                                                        aria-label="Delete backup"
                                                        className="-me-2 text-[var(--c-danger)]"
                                                    >
                                                        <Delete size={22} />
                                                    </Button>
                                                }
                                            />
                                        ))}
                                    </ListGroup>
                                    <ListGroup>
                                        <ListRow title={<DangerTitle>Purge all backups</DangerTitle>} onClick={handlePurgeBackups} />
                                    </ListGroup>
                                </div>
                            )
                        )}
                    </div>
            </SecondaryPage>
        );
    };

    // Rendered as plain elements (not a nested component) so typing in the search
    // field doesn't remount the subtree and drop focus on every keystroke.
    const pageItems = Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
        .reduce<(number | 'gap')[]>((acc, p, i, arr) => {
            if (i > 0 && p - arr[i - 1] > 1) acc.push('gap');
            acc.push(p);
            return acc;
        }, []);

    const userSub = (u: AdminUser) => {
        const hasTwoStep = (u.has_totp ?? 0) > 0 || (u.passkey_count ?? 0) > 0;
        return (
            <span className="flex items-center gap-x-3 overflow-hidden whitespace-nowrap">
                <span className="font-mono">{u.id.slice(0, 8)}</span>
                {(u.backup_count ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1">
                        <Cloud size={16} className="flex-none" />
                        {u.backup_count}, {formatBytes(u.total_backup_size || 0)}, {timeAgo(u.last_backup_at)}
                    </span>
                )}
                {hasTwoStep && (
                    <span className="inline-flex items-center gap-1">
                        <Verified size={16} className="flex-none" />
                        {[
                            (u.has_totp ?? 0) > 0 && 'App',
                            (u.passkey_count ?? 0) > 0 && `${u.passkey_count} passkey${u.passkey_count === 1 ? '' : 's'}`,
                        ].filter(Boolean).join(', ')}
                    </span>
                )}
            </span>
        );
    };

    // Rendered as plain elements (not a nested component) so typing in the search
    // field doesn't remount the subtree and drop focus on every keystroke.
    const renderUsers = () => (
        <div className="flex flex-col gap-4">
            <div className="relative">
                <Search size={20} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
                <input
                    type="search"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search users"
                    aria-label="Search users"
                    className="input-base ps-12"
                />
            </div>

            {loading && users.length === 0 ? (
                <Loading />
            ) : error ? (
                <ErrorNote>{error}</ErrorNote>
            ) : users.length === 0 ? (
                <Panel><Note>No users found{searchDebounce ? ` for "${searchDebounce}"` : ''}.</Note></Panel>
            ) : (
                <ListGroup chevronIcon={LIST_CHEVRON} footer={`${totalUsers.toLocaleString('en-US')} registered account${totalUsers === 1 ? '' : 's'}`}>
                    {users.map(u => (
                        <ListRow
                            key={u.id}
                            leading={<Avatar username={u.username} size={40} />}
                            title={u.username}
                            sub={userSub(u)}
                            drillIn
                            onClick={() => setPanel({ type: 'actions', user: u })}
                        />
                    ))}
                </ListGroup>
            )}

            {totalPages > 1 && (
                <nav className="flex items-center justify-center gap-1" aria-label="Pages">
                    <Button
                        variant="icon"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        aria-label="Previous page"
                    >
                        <ChevronLeft size={22} />
                    </Button>
                    {pageItems.map((item, i) =>
                        item === 'gap' ? (
                            <span key={`gap-${i}`} className="px-1 text-sm text-[var(--c-muted)]" aria-hidden="true">…</span>
                        ) : (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setPage(item)}
                                aria-current={page === item ? 'page' : undefined}
                                className={`h-11 min-w-11 rounded-full px-2 text-base tabular-nums ${page === item
                                    ? 'bg-[var(--c-plate-strong)] font-semibold text-[var(--c-ink)]'
                                    : 'text-[var(--c-muted)] hover:bg-[var(--c-plate)] hover:text-[var(--c-ink)]'}`}
                            >
                                {item}
                            </button>
                        ),
                    )}
                    <Button
                        variant="icon"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        aria-label="Next page"
                    >
                        <ChevronRight size={22} />
                    </Button>
                </nav>
            )}
        </div>
    );

    // Local date/time <-> unix seconds. The picker speaks the operator's local
    // time; everything stored and compared server-side is UTC seconds.
    const toLocalInput = (ts: number | null): string => {
        if (!ts) return '';
        const d = new Date(ts * 1000);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const fromLocalInput = (value: string): number | null => {
        if (!value) return null;
        const ms = new Date(value).getTime();
        return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
    };

    const applyNotice = (n: SiteNotice | null) => {
        setNotice(n);
        setNoticeBody(n?.body ?? '');
        setNoticeI18n(n?.i18n ?? {});
        setNoticeLevel(n?.level ?? 'info');
        setNoticeStart(toLocalInput(n?.startsAt ?? null));
        setNoticeEnd(toLocalInput(n?.expiresAt ?? null));
    };

    const fetchNotice = useCallback(async () => {
        if (!token) return;
        setNoticeLoading(true);
        try {
            applyNotice(await noticeService.getStored(token));
        } catch {
            showDialog('alert', 'Failed to load the site notice.');
        } finally {
            setNoticeLoading(false);
        }
    }, [token, showDialog]);

    // Loaded on entering the tab rather than on mount: the users list is what
    // the page opens on, and this is one request nobody asked for until then.
    useEffect(() => {
        if (cat === 'notice') void fetchNotice();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cat]);

    const noticeLangs: { id: 'default' | Lang; label: string }[] = [
        { id: 'default', label: 'Default' },
        { id: 'zh', label: 'Simplified Chinese' },
        { id: 'zh-TW', label: 'Traditional Chinese' },
        { id: 'yue', label: 'Cantonese' },
        { id: 'en', label: 'English' },
        { id: 'ja', label: 'Japanese' },
        { id: 'ko', label: 'Korean' },
        { id: 'tr', label: 'Turkish' },
    ];

    const noticeTextFor = (id: 'default' | Lang): string =>
        id === 'default' ? noticeBody : (noticeI18n[id] ?? '');

    const setNoticeTextFor = (id: 'default' | Lang, value: string) => {
        if (id === 'default') setNoticeBody(value);
        else setNoticeI18n(prev => ({ ...prev, [id]: value }));
    };

    const saveNotice = async () => {
        if (!token) return;
        const body = noticeBody.trim();
        if (!body) {
            showDialog('alert', 'The default text is what every locale without its own wording falls back to, so it cannot be empty.');
            return;
        }
        const startsAt = fromLocalInput(noticeStart);
        const expiresAt = fromLocalInput(noticeEnd);
        if (startsAt != null && expiresAt != null && expiresAt <= startsAt) {
            showDialog('alert', 'The end time has to be after the start time.');
            return;
        }
        setNoticeSaving(true);
        try {
            applyNotice(await noticeService.save(token, { body, i18n: noticeI18n, level: noticeLevel, startsAt, expiresAt }));
            showDialog('alert', 'Notice published. New visits see it right away; tabs already open pick it up within ten minutes.');
        } catch (e: any) {
            showDialog('alert', e?.message || 'Failed to save the notice.');
        } finally {
            setNoticeSaving(false);
        }
    };

    const clearNotice = () => {
        if (!token) return;
        showDialog('confirm', 'Take the banner down for everyone?', async () => {
            try {
                await noticeService.clear(token);
                applyNotice(null);
                setNoticeLang('default');
            } catch { showDialog('alert', 'Failed to clear the notice.'); }
        });
    };

    // Same wording the banner uses: the locale's override when it has one, the
    // default otherwise. Lets the operator see what a given locale will read.
    const noticePreview = noticeLang === 'default'
        ? noticeBody
        : (noticeI18n[noticeLang]?.trim() || noticeBody);

    const noticeWindowLabel = (): string => {
        if (!notice) return 'Nothing is being shown.';
        const now = Math.floor(Date.now() / 1000);
        if (notice.startsAt != null && now < notice.startsAt) return `Scheduled for ${new Date(notice.startsAt * 1000).toLocaleString('en-US')}`;
        if (notice.expiresAt != null && now >= notice.expiresAt) return `Expired ${new Date(notice.expiresAt * 1000).toLocaleString('en-US')}`;
        if (notice.expiresAt != null) return `Live until ${new Date(notice.expiresAt * 1000).toLocaleString('en-US')}`;
        return 'Live now, until you clear it';
    };

    const noticeLangLabel = noticeLangs.find(l => l.id === noticeLang)?.label;

    const renderNotice = () => (
        noticeLoading ? (
            <Loading />
        ) : (
            <div className="flex flex-col gap-6">
                <Note className="px-4">One banner at the top of the app, for everyone, signed in or not.</Note>

                <ListGroup
                    header="Wording for"
                    footer="Editing the text shows it again to people who dismissed it."
                    selection="single"
                    checkIcon={LIST_CHECK}
                >
                    {noticeLangs.map(({ id, label }) => (
                        <ListRow
                            key={id}
                            title={label}
                            value={id !== 'default' && noticeTextFor(id).trim() ? 'Own wording' : undefined}
                            selected={noticeLang === id}
                            onClick={() => setNoticeLang(id)}
                        />
                    ))}
                </ListGroup>

                <Field
                    label={noticeLang === 'default' ? 'Default text (required)' : `Wording for ${noticeLangLabel}`}
                    htmlFor="admin-notice-text"
                    hint={`${noticeTextFor(noticeLang).length}/2000 characters. Bare https:// links become clickable.`}
                >
                    <textarea
                        id="admin-notice-text"
                        value={noticeTextFor(noticeLang)}
                        onChange={e => setNoticeTextFor(noticeLang, e.target.value)}
                        rows={4}
                        maxLength={2000}
                        placeholder={noticeLang === 'default' ? 'What everyone should know' : 'Leave empty to use the default text'}
                        className="input-base resize-y"
                    />
                </Field>

                <div className="flex flex-col gap-2">
                    <p className="m-0 px-4 text-sm font-semibold text-[var(--c-muted)]" id="admin-notice-tone">Tone</p>
                    <SegmentedControl<NoticeLevel>
                        aria-label="Tone"
                        value={noticeLevel}
                        onChange={setNoticeLevel}
                        options={[{ value: 'info', label: 'Info' }, { value: 'warn', label: 'Warning' }]}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <ListGroup chevronIcon={LIST_CHEVRON}>
                        <ListRow
                            title="Show from"
                            sub={noticeStart ? new Date(noticeStart).toLocaleString('en-US') : 'Any time'}
                            drillIn
                            onClick={() => setNoticePicker('start')}
                        />
                        <ListRow
                            title="Hide after"
                            sub={noticeEnd ? new Date(noticeEnd).toLocaleString('en-US') : 'No end time'}
                            drillIn
                            onClick={() => setNoticePicker('end')}
                        />
                    </ListGroup>
                    {(noticeStart || noticeEnd) && (
                        <div className="flex flex-wrap gap-2">
                            {noticeStart && <Button variant="plain" compact onClick={() => setNoticeStart('')}>Clear start time</Button>}
                            {noticeEnd && <Button variant="plain" compact onClick={() => setNoticeEnd('')}>Clear end time</Button>}
                        </div>
                    )}
                </div>

                {noticePreview.trim() && (
                    <div className="flex flex-col gap-2">
                        <p className="m-0 px-4 text-sm font-semibold text-[var(--c-muted)]">Preview</p>
                        <Panel>
                            <p className={`m-0 flex items-start gap-2 whitespace-pre-wrap break-words text-sm ${noticeLevel === 'warn' ? 'text-[var(--c-attention)]' : 'text-[var(--c-ink)]'}`}>
                                {noticeLevel === 'warn'
                                    ? <Attention size={20} className="mt-px flex-none" />
                                    : <Notice size={20} className="mt-px flex-none" />}
                                <span>{noticePreview}</span>
                            </p>
                        </Panel>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    <Button variant="primary" block onClick={saveNotice} disabled={noticeSaving || !noticeBody.trim()}>
                        {noticeSaving ? <BusySpinner /> : <Notice size={20} />}
                        {notice ? 'Update notice' : 'Publish notice'}
                    </Button>
                    <Note className="px-4">{noticeWindowLabel()}{notice ? `, revision ${notice.revision}` : ''}</Note>
                </div>

                <ListGroup>
                    <ListRow title={<DangerTitle>Take down</DangerTitle>} onClick={clearNotice} disabled={!notice} />
                </ListGroup>
            </div>
        )
    );

    const renderSystem = () => (
        <div className="flex flex-col gap-6">
            <ListGroup>
                <ListRow title="Status" value="Operational" />
                <ListRow title="Backend" value={window.location.hostname === 'localhost' ? 'Local' : 'Remote'} />
            </ListGroup>

            {/* Storage. The one number nobody could see until the database hit
                its plan's cap — the worker reads every backup body to produce
                it, so it is fetched on demand rather than on every visit. */}
            <div className="flex flex-col gap-2">
                <ListGroup
                    header="Storage"
                    footer={storage
                        ? `${formatBytes(storage.payload_bytes)} of payload across ${storage.tables.reduce((n, tb) => n + tb.rows, 0).toLocaleString('en-US')} rows, measured ${timeAgo(storage.measured_at)}.`
                        : 'How much of the database each table uses, to compare against the D1 plan limit.'}
                >
                    {(storage?.tables ?? []).map(tb => (
                        <ListRow
                            key={tb.table}
                            title={<span className="block truncate font-mono text-sm">{tb.table}</span>}
                            value={
                                <span className="tabular-nums">
                                    {tb.rows.toLocaleString('en-US')}{tb.payload_bytes > 0 ? `, ${formatBytes(tb.payload_bytes)}` : ''}
                                </span>
                            }
                        />
                    ))}
                    <ListRow
                        title={<ActionTitle>{storage ? 'Measure again' : 'Measure'}</ActionTitle>}
                        trailing={storageLoading ? <BusySpinner /> : undefined}
                        onClick={loadStorage}
                        disabled={storageLoading}
                    />
                </ListGroup>
                {storageError && <ErrorNote className="px-4">{storageError}</ErrorNote>}
            </div>
        </div>
    );

    const catContent = (id: AdminCat) => (id === 'users' ? renderUsers() : id === 'notice' ? renderNotice() : renderSystem());

    return (
        <YouPage>
            {onBack
                ? <BackHeader parentLabel={t('you.title')} onBack={onBack} title={t('nav.admin')} />
                : <PageHeader title={t('nav.admin')} />}

            <div className="mt-2 flex flex-col gap-6">
                <SegmentedControl<AdminCat>
                    aria-label={t('nav.admin')}
                    value={cat}
                    onChange={selectCat}
                    options={cats}
                />
                {catContent(cat)}
            </div>

            {renderPanel()}
            {noticePicker && (
                <DateTimePicker
                    isOpen
                    title={noticePicker === 'start' ? 'Show from' : 'Hide after'}
                    initialDate={new Date((noticePicker === 'start' ? noticeStart : noticeEnd) || Date.now())}
                    onClose={() => setNoticePicker(null)}
                    onConfirm={date => {
                        const value = toLocalInput(date.getTime() / 1000);
                        if (noticePicker === 'start') setNoticeStart(value);
                        else setNoticeEnd(value);
                        setNoticePicker(null);
                    }}
                />
            )}
        </YouPage>
    );
};

export default Admin;
