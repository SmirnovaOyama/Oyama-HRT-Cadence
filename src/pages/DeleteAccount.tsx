import React, { useState, useEffect } from 'react';
import { apiErrorCode } from '../services/apiClient';
import { useDialog } from '../contexts/DialogContext';
import { BackHeader, Button } from '../components/ui';
import { YouPage } from './you/shared';
import { BusySpinner, ErrorNote, Field, Lead, PasswordInput } from './account/shared';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { authService } from '../services/auth';

const DeleteAccount: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t } = useTranslation();
    const { deleteAccount, token } = useAuth();
    const { showDialog } = useDialog();
    const [password, setPassword] = useState('');
    const [code, setCode] = useState('');
    const [backupCode, setBackupCode] = useState('');
    const [useBackup, setUseBackup] = useState(false);
    const [totpEnabled, setTotpEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');


    useEffect(() => {
        if (!token) return;
        authService.get2FAStatus(token)
            .then(s => setTotpEnabled(!!s.totp))
            .catch(() => {});
    }, [token]);

    const twoFAReady = !totpEnabled || (useBackup ? !!backupCode.trim() : code.length === 6);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!password || !twoFAReady || isLoading) return;
        showDialog('confirm', t('account.delete.confirm'), () => { void runDelete(); });
    };

    const runDelete = async () => {
        setIsLoading(true);
        setError('');
        try {
            await deleteAccount(
                password,
                totpEnabled && !useBackup ? code : undefined,
                totpEnabled && useBackup ? backupCode.trim() : undefined,
            );
            // Account is gone and the auth context logs out; leave this view so
            // we don't linger on a delete page for a now-signed-out user.
            onBack();
        } catch (e: any) {
            const code = apiErrorCode(e);
            if (code === 'TWO_FACTOR_REQUIRED' || code === 'TWO_FACTOR_INVALID') {
                // Surface the 2FA field even if the status probe failed earlier.
                setTotpEnabled(true);
                setError(t('account.2fa_verify_failed'));
            } else {
                setError(e?.message || t('error.generic'));
            }
            setIsLoading(false);
        }
    };

    return (
        <YouPage>
            <BackHeader parentLabel={t('account.title')} onBack={onBack} title={t('account.page.delete')} />

            <form onSubmit={handleSubmit} className="mt-2 flex max-w-md flex-col gap-6">
                <Lead note={t('account.delete.lead')}>{t('account.delete.warning')}</Lead>

                <ErrorNote>{error}</ErrorNote>

                <Field label={t('account.delete.password')} htmlFor="da-password">
                    <PasswordInput
                        id="da-password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        autoComplete="current-password"
                        autoFocus
                    />
                </Field>

                {totpEnabled && (
                    useBackup ? (
                        <div className="flex flex-col gap-1">
                            <Field label={t('account.field.backup_code')} htmlFor="da-backup">
                                <input
                                    id="da-backup"
                                    type="text"
                                    value={backupCode}
                                    onChange={e => setBackupCode(e.target.value.toUpperCase())}
                                    className="input-base text-center font-mono"
                                    placeholder={t('auth.backup_code_placeholder')}
                                    autoComplete="off"
                                />
                            </Field>
                            <Button variant="plain" className="self-start" onClick={() => { setUseBackup(false); setBackupCode(''); }}>
                                {t('account.auth.use_app_code')}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            <Field label={t('account.field.code')} htmlFor="da-code">
                                <input
                                    id="da-code"
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                    value={code}
                                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="input-base text-center font-mono tabular-nums"
                                    placeholder="000000"
                                    autoComplete="one-time-code"
                                />
                            </Field>
                            <Button variant="plain" className="self-start" onClick={() => { setUseBackup(true); setCode(''); }}>
                                {t('account.auth.use_backup')}
                            </Button>
                        </div>
                    )
                )}

                <Button type="submit" variant="destructive" className="self-start" disabled={!password || !twoFAReady || isLoading}>
                    {isLoading && <BusySpinner />}
                    {t('account.page.delete')}
                </Button>
            </form>
        </YouPage>
    );
};

export default DeleteAccount;
