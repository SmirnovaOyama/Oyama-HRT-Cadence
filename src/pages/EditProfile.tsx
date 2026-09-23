import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { BackHeader, Button } from '../components/ui';
import { YouPage } from './you/shared';
import { BusySpinner, ErrorNote, Field, Lead } from './account/shared';

const EditProfile: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { t } = useTranslation();
    const { user, updateProfile } = useAuth();
    const [username, setUsername] = useState(user?.username || '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const unchanged = username === user?.username;

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!username.trim() || isLoading || unchanged) return;
        setIsLoading(true);
        setError('');
        try {
            await updateProfile(username);
            onBack();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <YouPage>
            <BackHeader parentLabel={t('account.title')} onBack={onBack} title={t('account.page.username')} />

            <form onSubmit={handleSubmit} className="mt-2 flex max-w-md flex-col gap-6">
                <Lead>{t('account.username.lead')}</Lead>

                <ErrorNote>{error}</ErrorNote>

                <Field label={t('auth.username')} htmlFor="ep-username">
                    <input
                        id="ep-username"
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        className="input-base"
                        autoComplete="username"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        autoFocus
                    />
                </Field>

                <Button type="submit" variant="primary" block disabled={!username.trim() || isLoading || unchanged}>
                    {isLoading && <BusySpinner />}
                    {t('btn.save')}
                </Button>
            </form>
        </YouPage>
    );
};

export default EditProfile;
