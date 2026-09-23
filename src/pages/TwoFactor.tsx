import React, { useState, useEffect, useRef } from 'react';
import { apiErrorCode } from '../services/apiClient';
import { Attention, Delete, InTarget } from '../components/icons';
import { QRCodeSVG } from 'qrcode.react';
import {
    authService, Passkey,
    serializeAttestationCredential, b64url2ab,
} from '../services/auth';
import { formatRelative } from '../utils/helpers';
import { useTranslation } from '../contexts/LanguageContext';
import { useDialog } from '../contexts/DialogContext';
import { BackHeader, Button, ListGroup, ListRow, PageHeader, SegmentedControl } from '../components/ui';
import { YouPage } from './you/shared';
import { ActionTitle, BusySpinner, ErrorNote, Field, Groups, Loading, Lead, Note, Panel, PasswordInput } from './account/shared';
import PasswordInputModal from '../components/PasswordInputModal';

interface TwoFactorPageProps {
    token: string;
    enabled: boolean;
    onStatusChange: (enabled: boolean) => void;
    onBack: () => void;
    setupRequired?: boolean;
}

type SetupStep = 'scan' | 'verify';
type ActiveTab = 'totp' | 'passkey';

function detectDeviceName(): string {
    const ua = navigator.userAgent;
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (/Android/.test(ua)) return 'Android';
    if (ua.includes('Mac OS X')) return 'Mac';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Linux')) return 'Linux';
    return '';   // the caller substitutes a translated fallback
}

const BackupCodesBlock: React.FC<{
    codes: string[];
    copied: boolean;
    onCopy: () => void;
    onDownload: () => void;
    t: (k: string) => string;
}> = ({ codes, copied, onCopy, onDownload, t }) => (
    <Panel aria-label={t('account.two_step.backup_codes')}>
        <div className="flex items-start gap-3">
            <Attention size={22} className="mt-px flex-none text-[var(--c-attention)]" />
            <p className="m-0 text-sm font-semibold text-[var(--c-ink)]">{t('account.backup_codes_warning')}</p>
        </div>
        <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
            {codes.map((c, i) => (
                <li key={i}>
                    <code className="block rounded-lg bg-[var(--c-surface)] px-2 py-2 text-center font-mono text-base tabular-nums text-[var(--c-ink)]">{c}</code>
                </li>
            ))}
        </ul>
        <div className="flex gap-3">
            <Button variant="secondary" compact onTint className="flex-1" onClick={onCopy}>
                {copied ? t('account.copied') : t('account.two_step.copy_codes')}
            </Button>
            <Button variant="secondary" compact onTint className="flex-1" onClick={onDownload}>
                {t('account.two_step.save_codes')}
            </Button>
        </div>
    </Panel>
);

const TwoFactorPage: React.FC<TwoFactorPageProps> = ({ token, enabled, onStatusChange, onBack, setupRequired = false }) => {
    const { t } = useTranslation();
    const { showDialog } = useDialog();

    const [activeTab, setActiveTab] = useState<ActiveTab>('totp');

    // TOTP
    const [step, setStep] = useState<SetupStep>('scan');
    const [secret, setSecret] = useState('');
    const [uri, setUri] = useState('');
    const [code, setCode] = useState('');
    const [secretVisible, setSecretVisible] = useState(false);
    const [secretCopied, setSecretCopied] = useState(false);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [loading, setLoading] = useState(false);
    const [setupLoading, setSetupLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [disablePassword, setDisablePassword] = useState('');
    const [disableCode, setDisableCode] = useState('');
    const [disableLoading, setDisableLoading] = useState(false);
    const [disableError, setDisableError] = useState<string | null>(null);
    // The `enabled` prop is the OR of every factor, so a passkey-only account
    // arrives here with enabled=true and this tab used to render its "disable"
    // form — demanding an authenticator code from someone who never enrolled an
    // authenticator, with no way to reach setup. The TOTP tab keys off the TOTP
    // flag alone; null means the status is still loading.
    const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null);

    // Passkey
    const [passkeys, setPasskeys] = useState<Passkey[]>([]);
    const [passkeyLoading, setPasskeyLoading] = useState(false);
    const [passkeyError, setPasskeyError] = useState<string | null>(null);
    const [registerLoading, setRegisterLoading] = useState(false);
    const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
    const [passkeySuccess, setPasskeySuccess] = useState(false);
    const webauthnSupported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

    // Backup codes
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [backupRemaining, setBackupRemaining] = useState<number | null>(null);
    const [backupLoading, setBackupLoading] = useState(false);
    const [backupError, setBackupError] = useState<string | null>(null);
    const [backupCopied, setBackupCopied] = useState(false);
    const backupCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Every action here either destroys a recovery path or hands out a new
    // credential, so the worker asks for the password on each. Nothing collected
    // it, which is why these actions came back "Current password is required".
    const [pwPrompt, setPwPrompt] = useState<
        | null
        | { kind: 'passkey'; passkey: Passkey }
        | { kind: 'backup' }
        | { kind: 'enable'; secret: string; code: string }
        | { kind: 'register'; challengeToken: string; credential: object; deviceName: string }
    >(null);
    const [pwError, setPwError] = useState<string | null>(null);
    const [pwLoading, setPwLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;
        // Ask the server which factors this account actually has rather than
        // inferring them from the combined flag the parent passes down.
        authService.get2FAStatus(token).then(s => {
            if (cancelled) return;
            setTotpEnabled(s.totp);
            if (!s.totp) initSetup();
            if (s.totp || s.passkey) fetchBackupRemaining();
        }).catch(() => {
            if (cancelled) return;
            setTotpEnabled(false);
            initSetup();
        });
        fetchPasskeys();
        return () => {
            cancelled = true;
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            if (backupCopyTimerRef.current) clearTimeout(backupCopyTimerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCopySecret = () => {
        navigator.clipboard.writeText(secret).then(() => {
            if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
            setSecretCopied(true);
            copyTimerRef.current = setTimeout(() => setSecretCopied(false), 2000);
        });
    };

    const initSetup = async () => {
        setSetupLoading(true);
        setError(null);
        try {
            const data = await authService.setup2FA(token);
            setSecret(data.secret);
            setUri(data.uri);
        } catch (e: any) {
            setError(e.message || t('account.2fa_setup_failed'));
        } finally {
            setSetupLoading(false);
        }
    };

    // Turning TOTP on writes the secret that gates login and replaces every
    // backup code, so the worker now demands the password. Collect it here
    // rather than sending the request and bouncing off a 400.
    const handleEnable = (e: React.FormEvent) => {
        e.preventDefault();
        if (!code || code.length !== 6) return;
        setError(null);
        setPwError(null);
        setPwPrompt({ kind: 'enable', secret, code });
    };

    const fetchBackupRemaining = async () => {
        try {
            const data = await authService.getBackupCodesStatus(token);
            setBackupRemaining(data.remaining);
        } catch { /* best-effort */ }
    };

    const handleGenerateBackupCodes = () => {
        setBackupError(null);
        setPwError(null);
        setPwPrompt({ kind: 'backup' });
    };

    const submitPasswordPrompt = async (password: string) => {
        if (!pwPrompt) return;
        setPwLoading(true);
        setPwError(null);
        try {
            if (pwPrompt.kind === 'backup') {
                setBackupLoading(true);
                const codes = await authService.generateBackupCodes(token, password);
                setBackupCodes(codes);
                setBackupRemaining(codes.length);
            } else if (pwPrompt.kind === 'enable') {
                setLoading(true);
                const result = await authService.enable2FA(token, pwPrompt.secret, pwPrompt.code, password);
                setBackupCodes(result.backupCodes ?? []);
                setBackupRemaining(result.backupCodes?.length ?? 0);
                setTotpEnabled(true);
                setSuccess(true);
            } else if (pwPrompt.kind === 'register') {
                setRegisterLoading(true);
                const result = await authService.registerPasskey(
                    token, pwPrompt.challengeToken, pwPrompt.credential, pwPrompt.deviceName, password,
                );
                // Registering the first passkey mints backup codes that exist
                // only in this response. Dropping them left a passkey-only user
                // with no recovery path at all if the authenticator was lost.
                if (result.backupCodes?.length) {
                    setBackupCodes(result.backupCodes);
                    setBackupRemaining(result.backupCodes.length);
                }
                setPasskeySuccess(true);
                await fetchPasskeys();
                onStatusChange(true);
            } else {
                const pk = pwPrompt.passkey;
                setDeleteLoadingId(pk.id);
                await authService.deletePasskey(token, pk.id, password);
                const left = passkeys.filter(p => p.id !== pk.id);
                setPasskeys(left);
                // Dropping the last passkey can take the account back to a
                // single factor, so the parent's badge has to hear about it.
                onStatusChange(totpEnabled === true || left.length > 0);
            }
            setPwPrompt(null);
        } catch (e: any) {
            const msg = e.message || '';
            const code = apiErrorCode(e);
            // The password prompt stays up for a wrong (or missing) password;
            // anything else closes it and reports on the section it came from.
            if (code === 'INVALID_CREDENTIALS' || (code === 'INVALID_REQUEST' && msg.includes('password is required'))) {
                setPwError(t('account.2fa_verify_failed'));
            } else {
                setPwPrompt(null);
                if (pwPrompt.kind === 'backup') setBackupError(msg || t('account.backup_codes_generate'));
                else if (pwPrompt.kind === 'enable') setError(code === 'TWO_FACTOR_INVALID' ? t('account.2fa_verify_failed') : t('account.2fa_setup_failed'));
                else setPasskeyError(msg || t('auth.passkey_failed'));
            }
        } finally {
            setPwLoading(false);
            setBackupLoading(false);
            setLoading(false);
            setRegisterLoading(false);
            setDeleteLoadingId(null);
        }
    };

    const handleCopyBackupCodes = () => {
        navigator.clipboard.writeText(backupCodes.join('\n')).then(() => {
            if (backupCopyTimerRef.current) clearTimeout(backupCopyTimerRef.current);
            setBackupCopied(true);
            backupCopyTimerRef.current = setTimeout(() => setBackupCopied(false), 2000);
        });
    };

    const handleDownloadBackupCodes = () => {
        const text = `HRT Tracker - Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${backupCodes.join('\n')}\n\nEach code can only be used once. Store these securely.`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'hrt-tracker-backup-codes.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDisable = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!disablePassword || !disableCode) return;
        setDisableLoading(true);
        setDisableError(null);
        try {
            await authService.disable2FA(token, disablePassword, disableCode);
            setTotpEnabled(false);
            // Any remaining passkey still makes this a two-factor account.
            onStatusChange(passkeys.length > 0);
            showDialog('alert', t('account.2fa_disabled_success'));
            onBack();
        } catch (e: any) {
            const code = apiErrorCode(e);
            if (code === 'INVALID_CREDENTIALS' || code === 'TWO_FACTOR_INVALID') {
                setDisableError(t('account.2fa_verify_failed'));
            } else {
                setDisableError(t('account.2fa_disable_failed'));
            }
        } finally {
            setDisableLoading(false);
        }
    };

    const fetchPasskeys = async () => {
        setPasskeyLoading(true);
        setPasskeyError(null);
        try {
            const list = await authService.listPasskeys(token);
            setPasskeys(list);
        } catch (e: any) {
            setPasskeyError(e.message);
        } finally {
            setPasskeyLoading(false);
        }
    };

    const handleRegisterPasskey = async () => {
        if (!webauthnSupported) return;
        setRegisterLoading(true);
        setPasskeyError(null);
        setPasskeySuccess(false);
        try {
            const opts = await authService.registerPasskeyOptions(token);
            const credential = await navigator.credentials.create({
                publicKey: {
                    // Use the server's values rather than locally invented ones.
                    // `user.id` was a fixed 16 zero bytes for every account, and
                    // an authenticator REPLACES a discoverable credential that
                    // shares (rpId, userHandle) — so enrolling a second account
                    // on the same device silently destroyed the first account's
                    // passkey, while its row lived on server-side and kept
                    // demanding a passkey the authenticator no longer held.
                    rp: { id: opts.rp.id, name: opts.rp.name },
                    user: {
                        id: b64url2ab(opts.user.id),
                        name: opts.user.name,
                        displayName: opts.user.displayName,
                    },
                    challenge: b64url2ab(opts.challenge),
                    // Server-advertised only: the worker verifies ES256 (COSE -7)
                    // and nothing else, so offering RS256 just yielded a 400 for
                    // any authenticator that picked it.
                    pubKeyCredParams: opts.pubKeyCredParams,
                    authenticatorSelection: opts.authenticatorSelection,
                    timeout: opts.timeout ?? 60000,
                    excludeCredentials: (opts.excludeCredentialIds ?? []).map((id: string) => ({
                        type: 'public-key' as const,
                        id: b64url2ab(id),
                    })),
                },
            }) as PublicKeyCredential | null;
            if (!credential) return;
            // The ceremony runs first so a mistyped password can be retried in
            // the modal without touching the authenticator again; the challenge
            // token stays valid for five minutes.
            setPwError(null);
            setPwPrompt({
                kind: 'register',
                challengeToken: opts.challengeToken,
                credential: serializeAttestationCredential(credential),
                deviceName: detectDeviceName(),
            });
        } catch (e: any) {
            if (e.name !== 'NotAllowedError') {
                setPasskeyError(e.message || t('auth.passkey_failed'));
            }
        } finally {
            setRegisterLoading(false);
        }
    };

    const handleDeletePasskey = (pk: Passkey) => {
        showDialog('confirm', t('account.passkey_delete_confirm'), () => {
            setPasskeyError(null);
            setPwError(null);
            setPwPrompt({ kind: 'passkey', passkey: pk });
        });
    };

    const setupStep = success ? 2 : step === 'scan' ? 1 : 2;
    const nowSec = Math.floor(Date.now() / 1000);
    // The app is on and nothing is being set up: the page shows its state, and
    // turning it off is the destructive action at the bottom of the page.
    const showTurnOff = activeTab === 'totp' && totpEnabled === true && !success;

    return (
        <YouPage>
            {setupRequired ? (
                <PageHeader title={t('account.page.two_step')} />
            ) : (
                <BackHeader parentLabel={t('account.title')} onBack={onBack} title={t('account.page.two_step')} />
            )}

            <Groups className="mt-2">
                <div className="flex flex-col gap-4">
                    {setupRequired && (
                        <Panel>
                            <div className="flex items-start gap-3">
                                <Attention size={22} className="mt-px flex-none text-[var(--c-attention)]" />
                                <p className="m-0 text-sm text-[var(--c-ink)]">{t('auth.setup_2fa_required')}</p>
                            </div>
                        </Panel>
                    )}
                    <Lead>{t('account.two_step.lead_short')}</Lead>
                    <SegmentedControl<ActiveTab>
                        aria-label={t('account.page.two_step')}
                        value={activeTab}
                        onChange={setActiveTab}
                        options={[
                            { value: 'totp', label: t('account.two_step.app') },
                            { value: 'passkey', label: t('account.two_step.passkeys') },
                        ]}
                    />
                </div>

                {/* ===== Authenticator app ===== */}
                {activeTab === 'totp' && totpEnabled === null && <Loading />}

                {showTurnOff && (
                    <ListGroup>
                        <ListRow title={t('account.two_step.app')} value={t('account.two_step.on')} />
                    </ListGroup>
                )}

                {activeTab === 'totp' && (totpEnabled === false || success) && (
                    <div className="flex flex-col gap-5">
                        {/* Progress in words, not a row of dots. */}
                        <div className="flex flex-col gap-1">
                            <p className="m-0 text-sm text-[var(--c-muted)]">
                                {t('account.step_of').replace('{n}', String(setupStep)).replace('{total}', '2')}
                            </p>
                            <h2 className="m-0 text-xl font-semibold text-[var(--c-ink)]">
                                {success
                                    ? t('account.2fa_enabled_success')
                                    : step === 'scan' ? t('account.two_step.scan_title') : t('account.two_step.verify_title')}
                            </h2>
                        </div>

                        {step === 'scan' && !success && (
                            <>
                                <ErrorNote>{error}</ErrorNote>
                                <div className="flex flex-col gap-1">
                                    <p className="m-0 text-base text-[var(--c-ink)]">{t('account.two_step.scan_hint')}</p>
                                    <Note>{t('account.2fa_recommended_apps')}</Note>
                                </div>
                                {setupLoading ? (
                                    <Loading />
                                ) : uri ? (
                                    <div className="flex justify-center py-2">
                                        {/* White on purpose, in every theme: scanners need the contrast. */}
                                        <div className="inline-block rounded-2xl border border-[var(--c-hairline)] bg-white p-4">
                                            <QRCodeSVG value={uri} size={176} />
                                        </div>
                                    </div>
                                ) : null}
                                {secret && (
                                    <div className="flex flex-col gap-2">
                                        <p className="list-group-header m-0">{t('account.two_step.key_label')}</p>
                                        <code
                                            className={`block break-all rounded-xl bg-[var(--c-plate)] px-4 py-3 font-mono text-base text-[var(--c-ink)] ${!secretVisible ? 'select-none blur-sm' : ''}`}
                                            aria-hidden={!secretVisible}
                                        >
                                            {secret}
                                        </code>
                                        <div className="flex gap-3">
                                            <Button variant="secondary" compact className="flex-1" onClick={() => setSecretVisible(v => !v)} aria-pressed={secretVisible}>
                                                {secretVisible ? t('account.two_step.hide_key') : t('account.two_step.show_key')}
                                            </Button>
                                            <Button variant="secondary" compact className="flex-1" onClick={handleCopySecret}>
                                                {secretCopied ? t('account.copied') : t('account.two_step.copy_key')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                <Button variant="primary" block onClick={() => setStep('verify')} disabled={!secret || setupLoading}>
                                    {t('account.next')}
                                </Button>
                            </>
                        )}

                        {step === 'verify' && !success && (
                            <form onSubmit={handleEnable} className="flex flex-col gap-5">
                                <p className="m-0 text-base text-[var(--c-ink)]">{t('account.2fa_verify')}</p>
                                <ErrorNote>{error}</ErrorNote>
                                <Field label={t('account.field.code')} htmlFor="tf-enable-code">
                                    <input
                                        id="tf-enable-code"
                                        type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                                        value={code}
                                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        className="input-base text-center font-mono text-2xl tabular-nums"
                                        placeholder="000000" autoComplete="one-time-code" autoFocus
                                    />
                                </Field>
                                <div className="flex gap-3">
                                    <Button variant="secondary" compact className="flex-1" onClick={() => setStep('scan')}>
                                        {t('account.back')}
                                    </Button>
                                    <Button type="submit" variant="primary" compact className="flex-1" disabled={loading || code.length !== 6}>
                                        {loading && <BusySpinner />}
                                        {t('account.two_step.turn_on')}
                                    </Button>
                                </div>
                            </form>
                        )}

                        {success && (
                            <>
                                <Panel>
                                    <div className="flex items-start gap-3">
                                        <InTarget size={22} className="mt-px flex-none text-[var(--c-target)]" />
                                        <p className="m-0 text-sm text-[var(--c-ink)]">{t('account.2fa_success_hint')}</p>
                                    </div>
                                </Panel>
                                {backupCodes.length > 0 && (
                                    <BackupCodesBlock codes={backupCodes} copied={backupCopied} onCopy={handleCopyBackupCodes} onDownload={handleDownloadBackupCodes} t={t} />
                                )}
                                <Button variant="primary" block onClick={() => { onStatusChange(true); onBack(); }}>
                                    {t('account.done')}
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {/* ===== Passkeys ===== */}
                {activeTab === 'passkey' && (
                    <div className="flex flex-col gap-4">
                        <ErrorNote>{passkeyError}</ErrorNote>
                        {passkeySuccess && (
                            <p className="m-0 flex items-start gap-2 text-sm text-[var(--c-target)]" role="status">
                                <InTarget size={20} className="mt-px flex-none" />
                                {t('account.passkey_registered')}
                            </p>
                        )}

                        {backupCodes.length > 0 && (
                            <BackupCodesBlock codes={backupCodes} copied={backupCopied} onCopy={handleCopyBackupCodes} onDownload={handleDownloadBackupCodes} t={t} />
                        )}

                        {passkeyLoading ? (
                            <Loading />
                        ) : (
                            <ListGroup
                                header={t('account.two_step.passkeys')}
                                footer={webauthnSupported ? t('account.two_step.passkeys_footer') : t('auth.passkey_unsupported')}
                            >
                                {passkeys.length === 0 && (
                                    <ListRow title={<span className="text-[var(--c-muted)]">{t('account.two_step.no_passkeys')}</span>} />
                                )}
                                {passkeys.map(pk => (
                                    <ListRow
                                        key={pk.id}
                                        title={<span className="block truncate">{pk.device_name || t('session.unknown_device')}</span>}
                                        sub={t('account.two_step.added').replace('{when}', formatRelative(pk.created_at, nowSec, t))}
                                        trailing={
                                            <Button
                                                variant="icon"
                                                onClick={() => handleDeletePasskey(pk)}
                                                disabled={deleteLoadingId === pk.id}
                                                aria-label={t('account.two_step.passkey_remove')}
                                                className="-me-2 text-[var(--c-danger)]"
                                            >
                                                {deleteLoadingId === pk.id ? <BusySpinner /> : <Delete size={22} />}
                                            </Button>
                                        }
                                    />
                                ))}
                                {webauthnSupported && (
                                    <ListRow
                                        title={<ActionTitle>{passkeys.length === 0 ? t('account.two_step.passkey_add') : t('account.two_step.passkey_add_another')}</ActionTitle>}
                                        trailing={registerLoading ? <BusySpinner /> : undefined}
                                        onClick={handleRegisterPasskey}
                                        disabled={registerLoading}
                                    />
                                )}
                            </ListGroup>
                        )}
                    </div>
                )}

                {/* ===== Backup codes, once any factor is on ===== */}
                {enabled && (
                    <div className="flex flex-col gap-4">
                        <ListGroup header={t('account.two_step.backup_codes')} footer={t('account.two_step.backup_footer')}>
                            <ListRow
                                title={t('account.two_step.codes_left')}
                                value={backupRemaining !== null && backupRemaining > 0
                                    ? String(backupRemaining)
                                    : t('account.two_step.codes_none')}
                            />
                            <ListRow
                                title={
                                    <ActionTitle>
                                        {backupRemaining !== null && backupRemaining > 0
                                            ? t('account.two_step.backup_regenerate')
                                            : t('account.two_step.backup_generate')}
                                    </ActionTitle>
                                }
                                trailing={backupLoading ? <BusySpinner /> : undefined}
                                onClick={handleGenerateBackupCodes}
                                disabled={backupLoading}
                            />
                        </ListGroup>
                        <ErrorNote>{backupError}</ErrorNote>
                        {backupCodes.length > 0 && activeTab === 'totp' && !success && (
                            <BackupCodesBlock codes={backupCodes} copied={backupCopied} onCopy={handleCopyBackupCodes} onDownload={handleDownloadBackupCodes} t={t} />
                        )}
                    </div>
                )}

                {/* ===== Turning the app off: destructive, so last ===== */}
                {showTurnOff && (
                    <form onSubmit={handleDisable} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <p className="list-group-header m-0">{t('account.two_step.turn_off')}</p>
                            <Note className="px-4">{t('account.two_step.turn_off_hint')}</Note>
                        </div>
                        <ErrorNote>{disableError}</ErrorNote>
                        <Field label={t('account.field.current_password')} htmlFor="tf-disable-password">
                            <PasswordInput
                                id="tf-disable-password"
                                value={disablePassword}
                                onChange={e => setDisablePassword(e.target.value)}
                                required
                                autoComplete="current-password"
                            />
                        </Field>
                        <Field label={t('account.field.code')} htmlFor="tf-disable-code">
                            <input
                                id="tf-disable-code"
                                type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                                value={disableCode}
                                onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="input-base text-center font-mono tabular-nums"
                                placeholder="000000" required autoComplete="one-time-code"
                            />
                        </Field>
                        <Button
                            type="submit"
                            variant="destructive"
                            className="self-start"
                            disabled={disableLoading || !disablePassword || disableCode.length !== 6}
                        >
                            {disableLoading && <BusySpinner />}
                            {t('account.two_step.turn_off')}
                        </Button>
                    </form>
                )}
            </Groups>

            <PasswordInputModal
                isOpen={!!pwPrompt}
                onClose={() => { setPwPrompt(null); setPwError(null); }}
                onConfirm={submitPasswordPrompt}
                title={t('account.field.current_password')}
                description={
                    pwPrompt?.kind === 'passkey' ? t('account.passkey_delete_password_desc')
                        : pwPrompt?.kind === 'enable' ? t('account.2fa_enable_password_desc')
                            : pwPrompt?.kind === 'register' ? t('account.passkey_add_password_desc')
                                : t('account.backup_codes_password_desc')
                }
                error={pwError}
                loading={pwLoading}
                masked
            />
        </YouPage>
    );
};

export default TwoFactorPage;
