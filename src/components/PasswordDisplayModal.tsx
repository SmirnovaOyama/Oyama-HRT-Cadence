import { useId, useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useEscape } from '../hooks/useEscape';
import { Button } from './ui';

const PasswordDisplayModal = ({ isOpen, onClose, password }: { isOpen: boolean, onClose: () => void, password: string }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const titleId = useId();

    useEscape(onClose, isOpen);

    const handleCopy = () => {
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay z-[60]">
            <div className="modal-shell">
                <div className="modal-card flex flex-col gap-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
                    <div className="flex flex-col gap-1">
                        <h2 id={titleId} className="modal-title m-0">{t('account.export.password_title')}</h2>
                        <p className="m-0 text-sm text-[var(--c-muted)]">{t('export.password_desc')}</p>
                    </div>

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
            </div>
        </div>
    );
};

export default PasswordDisplayModal;
