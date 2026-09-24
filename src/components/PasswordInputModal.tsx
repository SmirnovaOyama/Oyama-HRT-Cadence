import React, { useState, useEffect, useId } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { SecondaryPage } from './ui/SecondaryPage';
import { Button } from './ui';
import { BusySpinner, ErrorNote, PasswordInput } from '../pages/account/shared';

interface PasswordInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (pw: string) => void;
    title?: string;
    description?: string;
    error?: string | null;
    loading?: boolean;
    /** Mask the input as a password field (defaults to the legacy visible text). */
    masked?: boolean;
}

const PasswordInputModal = ({ isOpen, onClose, onConfirm, title, description, error, loading, masked }: PasswordInputModalProps) => {
    const { t } = useTranslation();
    const [password, setPassword] = useState("");
    const descId = useId();
    const inputId = useId();

    useEffect(() => {
        if (isOpen) setPassword("");
    }, [isOpen]);

    if (!isOpen) return null;

    const submit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (password && !loading) onConfirm(password);
    };

    const inputProps = {
        id: inputId,
        value: password,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
        'aria-label': title ?? t('account.password_prompt.title'),
        'aria-describedby': descId,
        placeholder: t('auth.password'),
        autoComplete: 'current-password',
        autoFocus: true,
    };

    return (
        <SecondaryPage title={title ?? t('account.password_prompt.title')} onBack={onClose}>
            <form
                onSubmit={submit}
                className="flex flex-col gap-4"
                aria-describedby={descId}
            >
                <p id={descId} className="m-0 text-sm text-[var(--c-muted)]">{description ?? t('import.password_desc')}</p>

                {masked
                    ? <PasswordInput {...inputProps} />
                    : <input type="text" className="input-base font-mono" autoCapitalize="off" autoCorrect="off" spellCheck={false} {...inputProps} />}

                <ErrorNote>{error}</ErrorNote>

                <div className="flex gap-3">
                    <Button variant="secondary" compact className="flex-1" onClick={onClose}>
                        {t('btn.cancel')}
                    </Button>
                    <Button type="submit" variant="primary" compact className="flex-1" disabled={!password || loading}>
                        {loading && <BusySpinner />}
                        {t('btn.ok')}
                    </Button>
                </div>
            </form>
        </SecondaryPage>
    );
};

export default PasswordInputModal;
