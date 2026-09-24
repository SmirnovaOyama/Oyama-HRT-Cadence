import { useTranslation } from '../contexts/LanguageContext';
import { SecondaryPage } from './ui/SecondaryPage';
import { Button } from './ui';

// The three points are separate paragraphs, not a bulleted list:
// nothing in Cadence puts a dot in front of text.
const DisclaimerModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <SecondaryPage title={t('disclaimer.title')} onBack={onClose}>
            <div className="mb-6 flex flex-col gap-3 text-base text-[var(--c-ink)]">
                <p className="m-0">{t('disclaimer.text.intro')}</p>
                <p className="m-0 text-[var(--c-muted)]">{t('disclaimer.text.point1')}</p>
                <p className="m-0 text-[var(--c-muted)]">{t('disclaimer.text.point2')}</p>
                <p className="m-0 text-[var(--c-muted)]">{t('disclaimer.text.point3')}</p>
            </div>

            <Button variant="primary" block onClick={onClose}>
                {t('btn.ok')}
            </Button>
        </SecondaryPage>
    );
};

export default DisclaimerModal;
