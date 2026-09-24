import { useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { SecondaryPage } from './ui/SecondaryPage';
import { Button } from './ui';

const PasswordDisplayModal = ({ isOpen, onClose, password }: { isOpen: boolean, onClose: () => void, password: string }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <SecondaryPage title={t('account.export.password_title')} onBack={onClose}>
            <div className="flex flex-col gap-4">
                <p className="m-0 text-sm text-[var(--c-muted)]">{t('export.password_desc')}</p>

                <p className="m-0 select-all break-all rounded-xl bg-[var(--c-plate)] px-4 py-3 font-mono text-base text-[var(--c-ink)]">
                    {password}
                </p>

                <div className="flex gap-3">
                    <Button variant="secondary" compact className="flex-1" onClick={handleCopy} aria-live="polite">
                        {copied ? t('account.copied') : t('btn.copy')}
                    </Button>
                    <Button variant="primary" compact className="flex-1" onClick={onClose}>
                        {t('account.done')}
                    </Button>
                </div>
            </div>
        </SecondaryPage>
    );
};

export default PasswordDisplayModal;
