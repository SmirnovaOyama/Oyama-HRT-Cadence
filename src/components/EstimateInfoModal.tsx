import { useTranslation } from '../contexts/LanguageContext';
import { SecondaryPage } from './ui/SecondaryPage';

interface EstimateInfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    /**
     * Plain-language steps behind today's number (design/cadence/spec/components.md
     * C26, "How this was worked out"). When given, the page leads with them and
     * keeps the model caveat and source underneath.
     */
    explanation?: string[];
}

const EstimateInfoModal = ({ isOpen, onClose, explanation }: EstimateInfoModalProps) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    const explained = !!explanation?.length;

    return (
        <SecondaryPage title={explained ? t('today.info.title') : t('modal.estimate.title')} onBack={onClose}>
            <div className="mb-5 flex flex-col gap-3 text-base leading-relaxed text-[var(--c-ink)]">
                {explained ? (
                    explanation!.map((line, i) => <p key={i} className="m-0">{line}</p>)
                ) : (
                    <p className="m-0 text-[var(--c-muted)]">{t('modal.estimate.p1')}</p>
                )}
                <p className="m-0 rounded-2xl bg-[var(--c-plate)] p-4 text-sm text-[var(--c-ink)]">
                    {t('modal.estimate.p2')}
                </p>
                {!explained && <p className="m-0 text-sm text-[var(--c-muted)]">{t('modal.estimate.p3')}</p>}
                <p className="m-0 text-sm text-[var(--c-muted)]">
                    {t('modal.estimate.source')}{' '}
                    <a
                        href="https://transfemscience.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[var(--c-accent)] underline underline-offset-2"
                    >
                        transfemscience.org
                    </a>
                </p>
            </div>

            <button type="button" onClick={onClose} className="btn-primary btn-block">
                {t('btn.ok')}
            </button>
        </SecondaryPage>
    );
};

export default EstimateInfoModal;
