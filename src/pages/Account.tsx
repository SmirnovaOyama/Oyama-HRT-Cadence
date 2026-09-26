import React, { useState, useEffect, useMemo } from 'react';
import {
    Attention, Back, ChevronDown, CloudDownload, CloudUpload, Database, Delete, Devices, Edit, ImageAdd, Key, Lock, Merge, Minus,
    Passkey, Plus, SignIn, SignOut, Spinner, TwoStep, Verified, You,
} from '../components/icons';
import { BackHeader, Button, ListGroup, ListRow, SegmentedControl } from '../components/ui';
import { LabelIcon } from '../components/ui/LabelIcon';
import { Avatar, GroupHeader, LIST_CHEVRON, SyncPanel, YouPage, useSyncWords } from './you/shared';
import { useTranslation } from '../contexts/LanguageContext';

import { useAuth } from '../contexts/AuthContext';
import { cloudService, BackupMeta } from '../services/cloud';
import { readCloudBackup, unlockCloudBackup, normalizeBackupPayload, hasCloudKey, deriveAndCacheCloudKey } from '../utils/cloudBackup';
import { useDialog } from '../contexts/DialogContext';
import { authService, serializeAssertionCredential, b64url2ab, sessionIdFromToken } from '../services/auth';
import PasswordInputModal from '../components/PasswordInputModal';
import { describeSyncError, SyncStatus } from '../hooks/useCloudSync';
import { formatBytes } from '../utils/helpers';
import { MAX_CLOUD_BACKUPS } from '../../backupPolicy';
import { computeBackupMergeDiff, type BackupMergeRecords } from '../utils/backupMergePreview';

interface LocalData extends BackupMergeRecords {
    weight: number;
}

interface AccountProps {
    t: (key: string) => string;
    user: any;
    token: string | null;
    onLogout: () => void;
    onCloudSave: () => void;
    onCloudLoad: (backupId?: string) => void;
    onCloudMerge: (backupId: string) => void;
    localData: LocalData;
    onNavigate: (view: string) => void;
    twoFAEnabled: boolean;
    onTwoFAStatusChange: (enabled: boolean) => void;
    syncStatus: SyncStatus;
    /** Why `syncStatus` is `error`, when it is — see CloudSyncState.errorCode. */
    syncErrorCode: string | null;
    lastSyncedAt: number | null;
}

/**
 * Why the password prompt is open.
 *
 * `expand` is one encrypted backup in the list the user asked to look inside.
 * `sync` is the whole device having no key at all: the state that shows as
 * "cloud archive is encrypted, unlock it first" and, until it is cleared, stops
 * every backup this device would otherwise write.
 */
type UnlockTarget =
    | { purpose: 'expand'; rawData: any; backupId: string }
    | { purpose: 'sync' };

/** Replace `{name}` placeholders in a translated string. */
const fill = (text: string, vars: Record<string, string | number>) =>
    Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), text);

const Account: React.FC<AccountProps> = ({
    t,
    user,
    token,
    onLogout,
    onCloudSave,
    onCloudLoad,
    onCloudMerge,
    localData,
    onNavigate,
    twoFAEnabled,
    onTwoFAStatusChange,
    syncStatus,
    syncErrorCode,
    lastSyncedAt,
}) => {
    // Bust the avatar cache once per mount so returning from the edit-avatar
    // page (which remounts Account) reflects a freshly uploaded image.
    const avatarCacheBuster = useMemo(() => Date.now(), []);
    const [backupList, setBackupList] = useState<BackupMeta[]>([]);
    const [backupsLoading, setBackupsLoading] = useState(false);
    const [savingCloud, setSavingCloud] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [expandedData, setExpandedData] = useState<Record<string, any>>({});
    const [expandLoading, setExpandLoading] = useState<string | null>(null);
    const [mergeDiffId, setMergeDiffId] = useState<string | null>(null);
    // Unlock prompt for end-to-end-encrypted backups when this device lacks the key.
    const [unlockTarget, setUnlockTarget] = useState<UnlockTarget | null>(null);
    const [unlockError, setUnlockError] = useState<string | null>(null);
    const [unlockLoading, setUnlockLoading] = useState(false);
    const { showDialog } = useDialog();

    // Inline auth form state
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState<string | null>(null);
    const [authLoading, setAuthLoading] = useState(false);
    const [needsTOTP, setNeedsTOTP] = useState(false);
    const [twoFAMethod, setTwoFAMethod] = useState<'totp' | 'passkey' | null>(null);
    const [totpCode, setTotpCode] = useState('');
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [backupCode, setBackupCode] = useState('');
    const [passkeyLoading, setPasskeyLoading] = useState(false);
    const { login, register, loginWithToken } = useAuth();
    const { lang } = useTranslation();
    // Account only receives the status; `off` already covers sync switched off.
    const syncWords = useSyncWords({ t, lang, autoSync: true, status: syncStatus, errorCode: syncErrorCode, lastSyncedAt });

    // `silent` refreshes the list in place. Sync reports in on its own schedule
    // — including a poll every few minutes — and swapping the whole list for a
    // spinner each time it does would have the page blinking at someone who
    // never asked for anything.
    const fetchBackups = async (silent = false) => {
        if (!token) return;
        if (!silent) setBackupsLoading(true);
        try {
            const list = await cloudService.listMeta(token);
            setBackupList(list);
        } catch { if (!silent) setBackupList([]); }
        finally { if (!silent) setBackupsLoading(false); }
    };

    useEffect(() => {
        if (user && token) {
            fetchBackups();
            authService.get2FAStatus(token).then(s => onTwoFAStatusChange(s.enabled)).catch(() => {});
        }
    }, [user, token]);

    // A sync that uploaded leaves a new revision behind; refresh so the list
    // below isn't showing a version that has already been superseded.
    useEffect(() => {
        if (lastSyncedAt && user && token) fetchBackups(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastSyncedAt]);

    const handleSave = async () => {
        setSavingCloud(true);
        try {
            await onCloudSave();
            await fetchBackups();
        } finally { setSavingCloud(false); }
    };

    const handleDeleteBackup = async (id: string) => {
        if (!token) return;
        showDialog('confirm', t('account.delete_backup_confirm'), async () => {
            try {
                await cloudService.deleteBackup(token, id);
                setBackupList(prev => prev.filter(b => b.id !== id));
                setExpandedData(prev => { const n = { ...prev }; delete n[id]; return n; });
            } catch { showDialog('alert', t('account.delete_backup_failed')); }
        });
    };

    const toggleExpand = async (b: BackupMeta) => {
        if (expandedId === b.id) { setExpandedId(null); return; }
        setExpandedId(b.id);
        if (expandedData[b.id]) return;
        setExpandLoading(b.id);
        try {
            const backup = await cloudService.loadOne(token!, b.id);
            const res = await readCloudBackup(backup.data);
            if (res.status === 'ok') {
                setExpandedData(prev => ({ ...prev, [b.id]: normalizeBackupPayload(res.data) }));
            } else if (res.status === 'locked') {
                // Encrypted but no key on this device — ask for the password.
                setExpandLoading(null);
                setUnlockError(null);
                setUnlockTarget({ purpose: 'expand', rawData: backup.data, backupId: b.id });
            } else {
                showDialog('alert', t('account.load_backup_failed'));
                setExpandedId(null);
            }
        } catch {
            showDialog('alert', t('account.load_backup_failed'));
            setExpandedId(null);
        } finally { setExpandLoading(null); }
    };

    /**
     * Ask the server whether this is really the account password.
     *
     * Only needed where there is no ciphertext to try a derived key against. The
     * key derivation itself accepts anything — it is PBKDF2 over the password and
     * the user id, with nothing to check the result against — so without this a
     * typo would be cached as this device's key and every upload after it
     * encrypted under something no other device can derive.
     *
     * `/api/login` compares the password before it looks at second factors, so a
     * correct one comes back either as a 2FA challenge or as a session. The
     * session is revoked immediately: the user asked to unlock, not to sign in
     * again, and an extra row in their device list is not what they meant.
     */
    const passwordIsCurrent = async (password: string): Promise<boolean> => {
        try {
            const data = await authService.login(user.username, password);
            const sid = sessionIdFromToken(data.token);
            if (sid) {
                try { await authService.terminateSession(data.token, sid); } catch { /* revoke is best-effort */ }
            }
            return true;
        } catch (e: any) {
            // The password cleared the bcrypt check and the server moved on to
            // asking for a second factor — which is all this needed to know.
            return !!e?.needs2FA;
        }
    };

    /**
     * Give this device the cloud key, so sync can stop reporting `locked`.
     *
     * Prove the password against a real backup wherever there is one: the key is
     * only worth caching once it has actually decrypted something, and a wrong
     * one cached here would go on to encrypt uploads no other device can read.
     * An empty cloud, a plaintext backup from an older build, and a body that
     * will not parse all leave nothing to decrypt, so those fall back to asking
     * the server rather than trusting whatever was typed.
     */
    const unlockSync = async (password: string) => {
        if (!token || !user) return;
        const metas = backupList.length ? backupList : await cloudService.listMeta(token);
        const newest = metas.length
            ? metas.reduce((a, b) => (b.created_at > a.created_at ? b : a))
            : null;

        if (newest) {
            const backup = await cloudService.loadOne(token, newest.id);
            const res = await unlockCloudBackup(backup.data, password, user.id);
            // `locked` here means ciphertext that stayed shut — a wrong password,
            // or an origin where the key cannot be derived at all.
            if (res.status === 'locked') { setUnlockError(t('account.unlock_failed')); return; }
        }
        // Nothing decrypted, so nothing has vouched for the password yet.
        if (!hasCloudKey()) {
            if (!(await passwordIsCurrent(password))) {
                setUnlockError(t('account.unlock_failed'));
                return;
            }
            if (!(await deriveAndCacheCloudKey(password, user.id))) {
                setUnlockError(t('account.unlock_failed'));
                return;
            }
        }
        setUnlockTarget(null);
    };

    const handleUnlockSubmit = async (password: string) => {
        if (!unlockTarget || !user) return;
        setUnlockLoading(true);
        setUnlockError(null);
        try {
            if (unlockTarget.purpose === 'sync') {
                await unlockSync(password);
                return;
            }
            const res = await unlockCloudBackup(unlockTarget.rawData, password, user.id);
            if (res.status === 'ok') {
                setExpandedData(prev => ({ ...prev, [unlockTarget.backupId]: normalizeBackupPayload(res.data) }));
                setExpandedId(unlockTarget.backupId);
                setUnlockTarget(null);
            } else {
                // Wrong password, or the backup was encrypted under an old password.
                setUnlockError(t('account.unlock_failed'));
            }
        } catch {
            setUnlockError(t('account.unlock_failed'));
        } finally {
            setUnlockLoading(false);
        }
    };

    const cancelUnlock = () => {
        // Only the expand prompt owes the list a collapse — cancelling the sync
        // one must not close a backup the user opened separately.
        if (unlockTarget?.purpose === 'expand') setExpandedId(null);
        setUnlockTarget(null);
        setUnlockError(null);
    };

    const handleAuthSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        setAuthLoading(true);
        try {
            if (isLogin) {
                await login(
                    username, password,
                    needsTOTP && twoFAMethod === 'totp' && !useBackupCode ? totpCode : undefined,
                    needsTOTP && useBackupCode ? backupCode : undefined,
                );
            } else {
                await register(username, password);
                return;
            }
            setUsername('');
            setPassword('');
            setNeedsTOTP(false);
            setTwoFAMethod(null);
            setTotpCode('');
            setUseBackupCode(false);
            setBackupCode('');
        } catch (err: any) {
            if (err.needs2FA) {
                const method: 'totp' | 'passkey' = err.method ?? 'totp';
                setNeedsTOTP(true);
                setTwoFAMethod(method);
                setAuthError(null);
                if (method === 'passkey') {
                    setTimeout(() => handlePasskeyLogin(password), 100);
                }
            } else {
                setAuthError(err.message || t('error.generic'));
            }
        } finally {
            setAuthLoading(false);
        }
    };

    // `verifiedPassword` is set only when the passkey is the second factor: the
    // server has already accepted that password, and passing it on lets the
    // cloud key be derived from it. A standalone passkey sign-in passes nothing.
    const handlePasskeyLogin = async (verifiedPassword?: string) => {
        // Never let anything but a real password through: wired straight to an
        // onClick this would receive the click event, and a key derived from
        // that stringified object encrypts uploads no other device can read.
        const verified = typeof verifiedPassword === 'string' ? verifiedPassword : undefined;
        if (!window.PublicKeyCredential) {
            setAuthError(t('auth.passkey_unsupported'));
            return;
        }
        setPasskeyLoading(true);
        setAuthError(null);
        try {
            const opts = await authService.passkeyAuthOptions(username || undefined);
            const credential = await navigator.credentials.get({
                publicKey: {
                    rpId: window.location.hostname,
                    challenge: b64url2ab(opts.challenge),
                    allowCredentials: opts.credentialIds.map(id => ({
                        type: 'public-key' as const,
                        id: b64url2ab(id),
                    })),
                    timeout: 60000,
                    userVerification: 'preferred',
                },
            }) as PublicKeyCredential | null;
            if (!credential) return;
            const result = await authService.passkeyAuthVerify(opts.challengeToken, serializeAssertionCredential(credential));
            await loginWithToken(result, verified);
        } catch (e: any) {
            if (e.name !== 'NotAllowedError') {
                setAuthError(e.message || t('auth.passkey_failed'));
            }
        } finally {
            setPasskeyLoading(false);
        }
    };

    const fieldLabel = 'mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--c-muted)]';
    const hasPasskeys = typeof window !== 'undefined' && !!window.PublicKeyCredential;

    const OrRule = () => (
        <div className="flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-[var(--c-hairline)]" />
            <span className="text-sm text-[var(--c-muted)]">{t('common.or')}</span>
            <div className="h-px flex-1 bg-[var(--c-hairline)]" />
        </div>
    );

    const DiffLine = ({ added, label, n }: { added: boolean; label: string; n: number }) => (
        <li className={`flex items-center gap-2 text-sm ${added ? 'text-[var(--c-ink)]' : 'text-[var(--c-muted)]'}`}>
            {added ? <Plus size={16} className="flex-none" /> : <Minus size={16} className="flex-none" />}
            <span className="flex-1">{label}</span>
            <span className="font-semibold tabular-nums">{added ? `+${n}` : n}</span>
        </li>
    );

    return (
        <YouPage className="[&_.list-sep-icon]:ms-[48px]">
            <BackHeader parentLabel={t('you.title')} onBack={() => onNavigate('settings')} title={t('account.title')} />

            {user ? (
                <div className="mt-2 flex flex-col gap-6">
                    {/* Profile */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => onNavigate('edit-avatar')}
                                aria-label={t('you.account.change_photo')}
                                className="flex-none rounded-full border-0 bg-transparent p-0 cursor-pointer focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-ink)]"
                            >
                                <Avatar username={user.username} size={72} cacheKey={avatarCacheBuster} />
                            </button>
                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                                <span className="truncate text-xl font-semibold text-[var(--c-ink)]">{user.username}</span>
                                {user.isAdmin && (
                                    <Verified size={22} className="flex-none text-[var(--c-accent)]" title={t('you.account.admin')} />
                                )}
                            </div>
                        </div>
                        <ListGroup chevronIcon={LIST_CHEVRON}>
                            <ListRow className="min-h-[52px]" leading={<LabelIcon icon={ImageAdd} tone="pink" />} title={t('you.account.change_photo')} drillIn onClick={() => onNavigate('edit-avatar')} />
                            <ListRow className="min-h-[52px]" leading={<LabelIcon icon={Edit} tone="blue" />} title={t('you.account.change_username')} drillIn onClick={() => onNavigate('edit-profile')} />
                        </ListGroup>
                    </div>

                    {/* Cloud backup */}
                    <section aria-labelledby="account-backup">
                        <GroupHeader id="account-backup">{t('you.account.backup_section')}</GroupHeader>
                        <div className="flex flex-col gap-4">
                            {/* Sync runs on its own, with no prompts. This panel is the only
                                place it reports for duty, so a failure (or a backup this device
                                can't decrypt) is visible somewhere rather than silently never
                                happening. `locked` is the one state that needs a hand: nothing
                                the app can do on its own gets the key back, so the panel carries
                                the unlock action itself. */}
                            <SyncPanel words={syncWords}>
                                {syncStatus === 'locked' && (
                                    <div className="pl-[34px]">
                                        <Button
                                            variant="secondary"
                                            compact
                                            onTint
                                            onClick={() => { setUnlockError(null); setUnlockTarget({ purpose: 'sync' }); }}
                                        >
                                            <Key size={20} />
                                            {t('sync.unlock_action')}
                                        </Button>
                                    </div>
                                )}
                            </SyncPanel>

                            {/* Disabled while locked: with no key on this device the reconcile
                                behind this button cannot read the cloud copy and refuses to
                                overwrite it, so pressing it only ever produced "save failed".
                                The unlock action above is what fixes that. */}
                            <Button
                                variant="primary"
                                block
                                onClick={handleSave}
                                disabled={savingCloud || syncStatus === 'locked' || syncStatus === 'syncing'}
                            >
                                {savingCloud
                                    ? <Spinner size={20} className="animate-spin" />
                                    : <CloudUpload size={20} />}
                                {t('you.account.back_up_now')}
                            </Button>

                            {/* Backup list */}
                            <div className="mt-2">
                                <div className="list-group-header">{t('you.account.backups_header')}</div>
                                {backupsLoading ? (
                                    <div className="flex justify-center py-6 text-[var(--c-muted)]">
                                        <Spinner size={22} className="animate-spin" title={t('you.sync.syncing')} />
                                    </div>
                                ) : backupList.length === 0 ? (
                                    <p className="callout m-0">{t('account.no_backups')}</p>
                                ) : (
                                    <div className="list-group">
                                        {backupList.map((b, i) => {
                                            const open = expandedId === b.id;
                                            const panelId = `backup-${b.id}`;
                                            return (
                                                <React.Fragment key={b.id}>
                                                    {i > 0 && <div className="list-sep" role="presentation" aria-hidden="true" />}
                                                    <div className="flex items-center pe-2">
                                                        <button
                                                            type="button"
                                                            className="list-row list-row-tall flex-1"
                                                            aria-expanded={open}
                                                            aria-controls={panelId}
                                                            onClick={() => toggleExpand(b)}
                                                        >
                                                            <span className="list-row-leading"><LabelIcon icon={Database} tone="blue" /></span>
                                                            <span className="list-row-text">
                                                                <span className="list-row-title">
                                                                    {new Date(b.created_at * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                                                </span>
                                                                <span className="list-row-sub">{formatBytes(b.data_size)}</span>
                                                            </span>
                                                            <span className="list-row-chevron" aria-hidden="true">
                                                                <ChevronDown size={16} className={`chev ${open ? 'rotate-180' : ''}`} />
                                                            </span>
                                                        </button>
                                                        <Button
                                                            variant="icon"
                                                            aria-label={t('you.account.delete_backup')}
                                                            onClick={() => handleDeleteBackup(b.id)}
                                                            className="text-[var(--c-muted)]"
                                                        >
                                                            <Delete size={22} />
                                                        </Button>
                                                    </div>
                                                    <div id={panelId} className="disclosure" data-open={open}>
                                                        <div className="disclosure-inner">
                                                            {expandLoading === b.id ? (
                                                                <div className="flex justify-center py-6 text-[var(--c-muted)]">
                                                                    <Spinner size={22} className="animate-spin" />
                                                                </div>
                                                            ) : expandedData[b.id] ? (() => {
                                                                const data = expandedData[b.id];
                                                                const diff = computeBackupMergeDiff(localData, data);
                                                                const showingDiff = mergeDiffId === b.id;
                                                                const events = (data.events || []) as any[];
                                                                return (
                                                                    <div className="flex flex-col gap-4 px-4 pb-4 pt-1">
                                                                        {/* What is inside */}
                                                                        <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3">
                                                                            {[
                                                                                { label: t('you.account.stat_doses'), val: events.length },
                                                                                { label: t('you.account.stat_weight'), val: data.weight ?? '–' },
                                                                                { label: t('you.account.stat_labs'), val: (data.labResults || []).length },
                                                                                { label: t('you.account.stat_templates'), val: (data.doseTemplates || []).length },
                                                                                { label: t('reminders.schedules'), val: (data.schedules || []).length },
                                                                                { label: t('supplies.title'), val: (data.supplies || []).length },
                                                                            ].map(({ label, val }) => (
                                                                                <div key={label} className="rounded-[12px] bg-[var(--c-plate)] px-3 py-2">
                                                                                    <dt className="text-sm text-[var(--c-muted)]">{label}</dt>
                                                                                    <dd className="m-0 text-base font-semibold tabular-nums text-[var(--c-ink)]">{val}</dd>
                                                                                </div>
                                                                            ))}
                                                                        </dl>

                                                                        {/* Most recent doses */}
                                                                        {events.length > 0 && (
                                                                            <ul className="m-0 flex list-none flex-col p-0">
                                                                                {events.slice(0, 3).map((ev: any, idx: number) => (
                                                                                    <li
                                                                                        key={idx}
                                                                                        className="flex items-center justify-between gap-3 border-b border-[var(--c-hairline)] py-2 text-sm last:border-b-0"
                                                                                    >
                                                                                        <span className="min-w-0 truncate">
                                                                                            <span className="font-semibold text-[var(--c-ink)]">{ev.ester}</span>{' '}
                                                                                            <span className="text-[var(--c-muted)]">{ev.route}</span>
                                                                                        </span>
                                                                                        <span className="flex-none font-semibold tabular-nums text-[var(--c-ink)]">{ev.doseMG} mg</span>
                                                                                    </li>
                                                                                ))}
                                                                                {events.length > 3 && (
                                                                                    <li className="pt-2 text-sm text-[var(--c-muted)]">
                                                                                        {fill(t('you.account.more'), { n: events.length - 3 })}
                                                                                    </li>
                                                                                )}
                                                                            </ul>
                                                                        )}

                                                                        {/* Merge preview */}
                                                                        {showingDiff && (
                                                                            <div className="flex flex-col gap-3 rounded-[12px] bg-[var(--c-plate)] p-3">
                                                                                <p className="m-0 text-sm font-semibold text-[var(--c-muted)]">{t('you.account.merge_preview')}</p>
                                                                                {diff.totalDiff === 0 ? (
                                                                                    <p className="m-0 text-sm text-[var(--c-muted)]">{t('you.account.nothing_to_merge')}</p>
                                                                                ) : (
                                                                                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                                                                                        {diff.newEvents.length > 0 && <DiffLine added label={t('you.account.new_doses')} n={diff.newEvents.length} />}
                                                                                        {diff.newLabs.length > 0 && <DiffLine added label={t('you.account.new_labs')} n={diff.newLabs.length} />}
                                                                                        {diff.newTemplates.length > 0 && <DiffLine added label={t('you.account.new_templates')} n={diff.newTemplates.length} />}
                                                                                        {diff.newSchedules.length > 0 && <DiffLine added label={t('you.account.new_schedules')} n={diff.newSchedules.length} />}
                                                                                        {diff.newSupplies.length > 0 && <DiffLine added label={t('you.account.new_supplies')} n={diff.newSupplies.length} />}
                                                                                        {diff.localOnlyEvents.length > 0 && <DiffLine added={false} label={t('you.account.local_only_doses')} n={diff.localOnlyEvents.length} />}
                                                                                        {diff.localOnlyLabs.length > 0 && <DiffLine added={false} label={t('you.account.local_only_labs')} n={diff.localOnlyLabs.length} />}
                                                                                        {diff.localOnlyTemplates.length > 0 && <DiffLine added={false} label={t('you.account.local_only_templates')} n={diff.localOnlyTemplates.length} />}
                                                                                        {diff.localOnlySchedules.length > 0 && <DiffLine added={false} label={t('you.account.local_only_schedules')} n={diff.localOnlySchedules.length} />}
                                                                                        {diff.localOnlySupplies.length > 0 && <DiffLine added={false} label={t('you.account.local_only_supplies')} n={diff.localOnlySupplies.length} />}
                                                                                    </ul>
                                                                                )}
                                                                                {diff.total > 0 && (
                                                                                    <Button
                                                                                        variant="primary"
                                                                                        compact
                                                                                        block
                                                                                        onClick={() => { onCloudMerge(b.id); setExpandedId(null); setMergeDiffId(null); }}
                                                                                    >
                                                                                        <Merge size={20} />
                                                                                        {fill(t('you.account.confirm_merge'), { n: diff.total })}
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Actions */}
                                                                        <div className="flex flex-wrap gap-2">
                                                                            <Button
                                                                                variant="secondary"
                                                                                compact
                                                                                className="flex-1"
                                                                                aria-expanded={showingDiff}
                                                                                onClick={() => setMergeDiffId(showingDiff ? null : b.id)}
                                                                            >
                                                                                <Merge size={20} />
                                                                                {t(showingDiff ? 'you.account.hide_merge' : 'you.account.show_merge')}
                                                                            </Button>
                                                                            <Button
                                                                                variant={showingDiff ? 'secondary' : 'primary'}
                                                                                compact
                                                                                className="flex-1"
                                                                                onClick={() => { onCloudLoad(b.id); setExpandedId(null); }}
                                                                            >
                                                                                <CloudDownload size={20} />
                                                                                {t('account.restore')}
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })() : null}
                                                        </div>
                                                    </div>
                                                </React.Fragment>
                                            );
                                        })}
                                    </div>
                                )}
                                {backupList.length > 0 && (
                                    <div className="list-group-footer">
                                        {fill(t('you.account.backups_kept'), { n: backupList.length, max: MAX_CLOUD_BACKUPS })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Security */}
                    <ListGroup header={t('you.account.security')} chevronIcon={LIST_CHEVRON}>
                        <ListRow className="min-h-[52px]" leading={<LabelIcon icon={Lock} tone="teal" />} title={t('you.account.password')} drillIn onClick={() => onNavigate('change-password')} />
                        <ListRow
                            className="min-h-[52px]"
                            leading={<LabelIcon icon={TwoStep} tone="green" />}
                            title={t('you.account.two_step')}
                            value={t(twoFAEnabled ? 'you.account.on' : 'you.account.off')}
                            drillIn
                            onClick={() => onNavigate('two-factor')}
                        />
                        <ListRow className="min-h-[52px]" leading={<LabelIcon icon={Passkey} tone="purple" />} title={t('you.account.passkeys')} drillIn onClick={() => onNavigate('two-factor')} />
                        <ListRow className="min-h-[52px]" leading={<LabelIcon icon={Devices} tone="blue" />} title={t('you.account.sessions')} drillIn onClick={() => onNavigate('sessions')} />
                    </ListGroup>

                    {/* Sign out and delete, in their own group at the bottom. */}
                    <ListGroup footer={t('you.account.delete_footer')}>
                        <ListRow className="min-h-[52px]" leading={<LabelIcon icon={SignOut} tone="muted" />} title={<span className="text-[var(--c-ink)]">{t('you.sign_out')}</span>} onClick={onLogout} />
                        <ListRow
                            className="min-h-[52px]"
                            leading={<Delete size={20} className="text-[var(--c-danger)]" />}
                            title={<span className="text-[var(--c-danger)]">{t('you.delete_account')}</span>}
                            onClick={() => onNavigate('delete-account')}
                        />
                    </ListGroup>
                </div>
            ) : (
                <div className="mt-2 flex max-w-md flex-col gap-6">
                    <p className="m-0 text-base text-[var(--c-muted)]">{t('you.signed_out_body')}</p>

                    <SegmentedControl
                        aria-label={t('account.title')}
                        options={[
                            { value: 'in', label: t('you.account.sign_in') },
                            { value: 'up', label: t('you.account.create') },
                        ]}
                        value={isLogin ? 'in' : 'up'}
                        onChange={(v) => { setIsLogin(v === 'in'); setAuthError(null); setNeedsTOTP(false); }}
                    />

                    <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                        {authError && (
                            <p role="alert" className="m-0 flex items-start gap-2 text-base text-[var(--c-danger)]">
                                <Attention size={20} className="mt-0.5 flex-none" />
                                <span>{authError}</span>
                            </p>
                        )}
                        <div>
                            <label htmlFor="account-username" className={fieldLabel}><LabelIcon icon={You} tone="blue" size={18} />{t('auth.username')}</label>
                            <input
                                id="account-username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="input-base"
                                placeholder={t('auth.username_placeholder')}
                                autoComplete="username"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="account-password" className={fieldLabel}><LabelIcon icon={Lock} tone="teal" size={18} />{t('auth.password')}</label>
                            <input
                                id="account-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-base"
                                placeholder={t('auth.password_placeholder')}
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                                required
                            />
                        </div>
                        {needsTOTP && isLogin && (
                            <div className="flex flex-col gap-3">
                                <p className="callout m-0 flex items-start gap-2">
                                    <TwoStep size={20} className="mt-0.5 flex-none text-[var(--c-ink)]" />
                                    <span>{t('auth.needs_2fa')}</span>
                                </p>
                                {useBackupCode ? (
                                    <div className="flex flex-col items-start gap-2">
                                        <label htmlFor="account-backup-code" className={fieldLabel}><LabelIcon icon={Key} tone="orange" size={18} />{t('auth.backup_code_label')}</label>
                                        <input
                                            id="account-backup-code"
                                            type="text"
                                            value={backupCode}
                                            onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                                            className="input-base font-mono text-center"
                                            placeholder={t('auth.backup_code_placeholder')}
                                            autoComplete="off"
                                            autoFocus
                                            required={useBackupCode}
                                        />
                                        <Button variant="plain" className="-ms-3" onClick={() => { setUseBackupCode(false); setBackupCode(''); }}>
                                            <Back size={20} />
                                            {twoFAMethod === 'totp' ? t('auth.totp_code') : t('auth.passkey_as_2fa')}
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        {twoFAMethod !== 'passkey' && (
                                            <div>
                                                <label htmlFor="account-totp" className={fieldLabel}><LabelIcon icon={TwoStep} tone="green" size={18} />{t('auth.totp_code')}</label>
                                                <input
                                                    id="account-totp"
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]{6}"
                                                    maxLength={6}
                                                    value={totpCode}
                                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    className="input-base font-mono text-center"
                                                    placeholder={t('auth.totp_placeholder')}
                                                    autoComplete="one-time-code"
                                                    autoFocus
                                                    required={needsTOTP && !useBackupCode}
                                                />
                                            </div>
                                        )}
                                        {twoFAMethod === 'passkey' && !hasPasskeys && (
                                            <p className="m-0 flex items-start gap-2 text-base text-[var(--c-danger)]">
                                                <Attention size={20} className="mt-0.5 flex-none" />
                                                <span>{t('auth.passkey_unsupported')}</span>
                                            </p>
                                        )}
                                        {hasPasskeys && (
                                            <>
                                                {twoFAMethod !== 'passkey' && <OrRule />}
                                                <Button variant="secondary" block onClick={() => handlePasskeyLogin()} disabled={passkeyLoading}>
                                                    {passkeyLoading ? <Spinner size={20} className="animate-spin" /> : <Passkey size={20} />}
                                                    {t('auth.passkey_as_2fa')}
                                                </Button>
                                            </>
                                        )}
                                        <Button variant="plain" onClick={() => setUseBackupCode(true)}>
                                            <Key size={20} />
                                            {t('auth.use_backup_code')}
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}
                        {!(needsTOTP && twoFAMethod === 'passkey' && !useBackupCode) && (
                            <Button type="submit" variant="primary" block disabled={authLoading}>
                                {authLoading ? <Spinner size={20} className="animate-spin" /> : isLogin ? <SignIn size={20} /> : <You size={20} />}
                                {isLogin ? t('you.account.sign_in') : t('you.account.create')}
                            </Button>
                        )}
                        {isLogin && !needsTOTP && hasPasskeys && (
                            <>
                                <OrRule />
                                <Button variant="secondary" block onClick={() => handlePasskeyLogin()} disabled={passkeyLoading}>
                                    {passkeyLoading ? <Spinner size={20} className="animate-spin" /> : <Passkey size={20} />}
                                    {t('you.account.passkey_sign_in')}
                                </Button>
                            </>
                        )}
                    </form>
                </div>
            )}

            <PasswordInputModal
                isOpen={!!unlockTarget}
                onClose={cancelUnlock}
                onConfirm={handleUnlockSubmit}
                title={t('account.unlock_title')}
                description={t('account.unlock_desc')}
                error={unlockError}
                loading={unlockLoading}
                masked
            />
        </YouPage>
    );
};

export default Account;
