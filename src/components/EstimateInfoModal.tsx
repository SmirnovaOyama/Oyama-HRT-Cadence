import { useTranslation } from '../contexts/LanguageContext';
import { SecondaryPage } from './ui/SecondaryPage';

interface EstimateInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    /**
     * Complete paragraphs explaining today's number, followed by one model
     * caveat and the relevant source.
     */
    explanation?: string[];
    showEstradiolSource?: boolean;
}

const EstimateInfoModal = ({ isOpen, onClose, explanation, showEstradiolSource = true }: EstimateInfoModalProps) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const explained = !!explanation?.length;

    return (
        <SecondaryPage title={explained ? t('today.info.title') : t('modal.estimate.title')} onBack={onClose}>
            <div className="mb-5 flex flex-col gap-3 text-base leading-relaxed text-[var(--c-ink)]">
                {explained ? (
                    explanation!.map((paragraph, i) => <p key={i} className="m-0">{paragraph}</p>)
                ) : (
                    <p className="m-0 text-[var(--c-muted)]">{t('modal.estimate.p1')}</p>
                )}
                <p className="m-0 text-sm text-[var(--c-muted)]">
                    {t(explained ? 'today.info.only_test' : 'modal.estimate.p2')}
                </p>
                {!explained && <p className="m-0 text-sm text-[var(--c-muted)]">{t('modal.estimate.p3')}</p>}
                {showEstradiolSource && <p className="m-0 text-sm text-[var(--c-muted)]">
                    {t('today.info.source')}{' '}
                    <a
                        href="https://transfemscience.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--c-accent)] underline underline-offset-2"
                    >
                        Transfeminine Science
                    </a>
                </p>}
            </div>

            <button type="button" onClick={onClose} className="btn-primary btn-block">
                {t('btn.ok')}
            </button>
        </SecondaryPage>
    );
};

export default EstimateInfoModal;
