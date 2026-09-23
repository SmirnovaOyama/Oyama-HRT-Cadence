import { useTranslation } from '../contexts/LanguageContext';
import { useEscape } from '../hooks/useEscape';
import { Button } from './ui';

// A bottom sheet on phones, a centred dialog from md up (.modal-* in
// index.css). The three points are separate paragraphs, not a bulleted list:
// nothing in Cadence puts a dot in front of text.
const DisclaimerModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { t } = useTranslation();

    useEscape(onClose, isOpen);

    if (!isOpen) return null;

    return (
        <div
            className="modal-overlay z-[60]"
            onClick={onClose}
        >
            <div className="modal-shell" onClick={e => e.stopPropagation()}>
                <div
                    className="modal-card"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="disclaimer-title"
                >
                    <h2 id="disclaimer-title" className="modal-title">{t('disclaimer.title')}</h2>

                    <div className="mb-6 flex flex-col gap-3 text-base text-[var(--c-ink)]">
                        <p className="m-0">{t('disclaimer.text.intro')}</p>
                        <p className="m-0 text-[var(--c-muted)]">{t('disclaimer.text.point1')}</p>
                        <p className="m-0 text-[var(--c-muted)]">{t('disclaimer.text.point2')}</p>
                        <p className="m-0 text-[var(--c-muted)]">{t('disclaimer.text.point3')}</p>
                    </div>

                    <Button variant="primary" block onClick={onClose}>
                        {t('btn.ok')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DisclaimerModal;
