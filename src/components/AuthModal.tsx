import React, { useState } from 'react';
import { Passkey, TwoStep } from './icons';
import { Button } from './ui';
import { BusySpinner, ErrorNote, Field, Panel, PasswordInput } from '../pages/account/shared';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { authService, serializeAssertionCredential, b64url2ab } from '../services/auth';
import { SecondaryPage } from './ui/SecondaryPage';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [needsTOTP, setNeedsTOTP] = useState(false);
    const [twoFAMethod, setTwoFAMethod] = useState<'totp' | 'passkey' | null>(null);
    const [totpCode, setTotpCode] = useState('');
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [backupCode, setBackupCode] = useState('');
    const [passkeyLoading, setPasskeyLoading] = useState(false);

    const { login, register, loginWithToken } = useAuth();
    const { t } = useTranslation();

    if (!isOpen) return null;

    // `verifiedPassword` is set only when the passkey is the second factor: the
    // server has already accepted that password, and passing it on lets the
    // cloud key be derived from it. A standalone passkey sign-in passes nothing.
    const handlePasskeyLogin = async (verifiedPassword?: string) => {
        // Never let anything but a real password through: wired straight to an
        // onClick this would receive the click event, and a key derived from
        // that stringified object encrypts uploads no other device can read.
        const verified = typeof verifiedPassword === 'string' ? verifiedPassword : undefined;
        if (!window.PublicKeyCredential) {
            setError(t('auth.passkey_unsupported'));
            return;
        }
        setPasskeyLoading(true);
        setError(null);
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
            onClose();
        } catch (e: any) {
            if (e.name !== 'NotAllowedError') {
                setError(e.message || t('auth.passkey_failed'));
            }
        } finally {
            setPasskeyLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            if (isLogin) {
                await login(
                    username, password,
                    needsTOTP && twoFAMethod === 'totp' && !useBackupCode ? totpCode : undefined,
                    needsTOTP && useBackupCode ? backupCode : undefined,
                );
            } else {
                await register(username, password);
                onClose();
                // needsSetup2FA redirect is handled by App.tsx
                return;
            }
            onClose();
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
                setError(null);
                if (method === 'passkey') {
                    setTimeout(() => handlePasskeyLogin(password), 100);
                }
            } else {
                setError(err.message || t('error.generic'));
            }
        } finally {
            setLoading(false);
        }
    };

    const passkeyOnly = needsTOTP && twoFAMethod === 'passkey' && !useBackupCode;
    const webauthn = typeof window !== 'undefined' && !!window.PublicKeyCredential;

    return (
        <SecondaryPage
            title={isLogin ? t('account.auth.sign_in') : t('account.auth.create_title')}
            onBack={() => { if (!loading) onClose(); }}
        >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <ErrorNote>{error}</ErrorNote>

                <Field label={t('auth.username')} htmlFor="auth-username">
                    <input
                        id="auth-username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="input-base"
                        placeholder={t('auth.username_placeholder')}
                        autoComplete="username"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        required
                    />
                </Field>

                <Field label={t('auth.password')} htmlFor="auth-password">
                    <PasswordInput
                        id="auth-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('auth.password_placeholder')}
                        autoComplete={isLogin ? 'current-password' : 'new-password'}
                        required
                    />
                </Field>

                {needsTOTP && isLogin && (
                    <div className="flex flex-col gap-4">
                        <Panel>
                            <div className="flex items-start gap-3">
                                <TwoStep size={22} className="mt-px flex-none text-[var(--c-ink)]" />
                                <p className="m-0 text-sm text-[var(--c-ink)]">{t('auth.needs_2fa')}</p>
                            </div>
                        </Panel>
                        {useBackupCode ? (
                            <>
                                <Field label={t('account.field.backup_code')} htmlFor="auth-backup">
                                    <input
                                        id="auth-backup"
                                        type="text"
                                        value={backupCode}
                                        onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                                        className="input-base text-center font-mono"
                                        placeholder={t('auth.backup_code_placeholder')}
                                        autoComplete="off"
                                        autoFocus
                                        required={useBackupCode}
                                    />
                                </Field>
                                <Button variant="plain" className="self-start" onClick={() => { setUseBackupCode(false); setBackupCode(''); }}>
                                    {twoFAMethod === 'totp' ? t('account.auth.use_app_code') : t('account.auth.use_passkey')}
                                </Button>
                            </>
                        ) : (
                            <>
                                {twoFAMethod !== 'passkey' && (
                                    <Field label={t('account.field.code')} htmlFor="auth-totp">
                                        <input
                                            id="auth-totp"
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]{6}"
                                            maxLength={6}
                                            value={totpCode}
                                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            className="input-base text-center font-mono tabular-nums"
                                            placeholder="000000"
                                            autoComplete="one-time-code"
                                            autoFocus
                                            required={needsTOTP && !useBackupCode}
                                        />
                                    </Field>
                                )}
                                {twoFAMethod === 'passkey' && !webauthn && (
                                    <ErrorNote>{t('auth.passkey_unsupported')}</ErrorNote>
                                )}
                                {webauthn && (
                                    <Button
                                        variant={twoFAMethod === 'passkey' ? 'primary' : 'secondary'}
                                        block
                                        onClick={() => handlePasskeyLogin()}
                                        disabled={passkeyLoading}
                                    >
                                        {passkeyLoading ? <BusySpinner /> : twoFAMethod === 'passkey' ? <Passkey size={20} /> : null}
                                        {t('account.auth.use_passkey')}
                                    </Button>
                                )}
                                <Button variant="plain" className="self-start" onClick={() => setUseBackupCode(true)}>
                                    {t('account.auth.use_backup')}
                                </Button>
                            </>
                        )}
                    </div>
                )}

                {!passkeyOnly && (
                    <Button type="submit" variant="primary" block disabled={loading} className="mt-1">
                        {loading && <BusySpinner />}
                        {isLogin ? t('account.auth.sign_in') : t('account.auth.create')}
                    </Button>
                )}

                <div className="flex flex-wrap items-center justify-center gap-x-1 text-sm text-[var(--c-muted)]">
                    <span>{isLogin ? t('auth.no_account') : t('auth.has_account')}</span>
                    <Button
                        variant="plain"
                        className="px-1"
                        onClick={() => { setIsLogin(!isLogin); setError(null); }}
                    >
                        {isLogin ? t('account.auth.create') : t('account.auth.sign_in')}
                    </Button>
                </div>
            </form>
        </SecondaryPage>
    );
};

export default AuthModal;
