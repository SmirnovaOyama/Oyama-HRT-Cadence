import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { BackHeader, Button } from '../components/ui';
import { YouPage } from './you/shared';
import { BusySpinner, ErrorNote, Field, Lead, PasswordInput } from './account/shared';

const ChangePassword: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t } = useTranslation();
    const { changePassword } = useAuth();
    const [current, setCurrent] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirm, setConfirm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!current || !newPass || !confirm || isLoading) return;
        if (newPass !== confirm) { setError(t('pw.mismatch')); return; }
        if (newPass.length < 8) { setError(t('pw.too_short')); return; }

        setIsLoading(true);
        setError('');
        try {
            await changePassword(current, newPass);
            onBack();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <YouPage>
            <BackHeader parentLabel={t('account.title')} onBack={onBack} title={t('account.page.password')} />

            <form onSubmit={handleSubmit} className="mt-2 flex max-w-md flex-col gap-6">
                <Lead>{t('account.password.lead')}</Lead>

                <ErrorNote>{error}</ErrorNote>

                <div className="flex flex-col gap-5">
                    <Field label={t('account.field.current_password')} htmlFor="cp-current">
                        <PasswordInput
                            id="cp-current"
                            value={current}
                            onChange={e => setCurrent(e.target.value)}
                            autoComplete="current-password"
                            autoFocus
                        />
                    </Field>
                    <Field label={t('account.field.new_password')} htmlFor="cp-new" hint={t('account.password.rule')}>
                        <PasswordInput
                            id="cp-new"
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            autoComplete="new-password"
                        />
                    </Field>
                    <Field label={t('account.field.confirm_password')} htmlFor="cp-confirm">
                        <PasswordInput
                            id="cp-confirm"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            autoComplete="new-password"
                        />
                    </Field>
                </div>

                <Button type="submit" variant="primary" block disabled={!current || !newPass || !confirm || isLoading}>
                    {isLoading && <BusySpinner />}
                    {t('btn.save')}
                </Button>
            </form>
        </YouPage>
    );
};

export default ChangePassword;
