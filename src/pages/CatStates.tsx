import React from 'react';
import { Clock } from '../components/icons';
import PixelCat, { CatPose } from '../components/PixelCat';
import { useTranslation } from '../contexts/LanguageContext';
import { CAT_STATE_WINDOWS, usePixelCats } from '../contexts/PixelCatContext';
import { BackHeader } from '../components/ui';
import { GroupHeader, YouPage } from './you/shared';

interface CatStatesProps {
    onBack: () => void;
}

const POSES: CatPose[] = ['donut', 'loaf'];

const pad = (h: number) => String(h).padStart(2, '0');

/**
 * Developer-mode gallery of every cat state at once.
 *
 * The windows come from CAT_STATE_WINDOWS rather than a list written out again
 * here, so a label can never claim hours the schedule no longer covers. The
 * cats render with `force` so the gallery still works with pixel cats switched
 * off: you opened it to look at the art, not to check the setting.
 */
const CatStates: React.FC<CatStatesProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const { catState } = usePixelCats();

    return (
        <YouPage>
            <BackHeader parentLabel={t('you.title')} onBack={onBack} title={t('settings.cat_states')} />

            <p className="m-0 mb-6 mt-2 text-base text-[var(--c-muted)]">{t('settings.cat_states_desc')}</p>

            <div className="flex flex-col gap-6">
                {POSES.map(pose => (
                    <section key={pose} aria-labelledby={`cat-pose-${pose}`}>
                        <GroupHeader id={`cat-pose-${pose}`}>{t(`cat.pose.${pose}`)}</GroupHeader>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {CAT_STATE_WINDOWS.map(({ state, from, to }) => {
                                const isNow = state === catState;
                                return (
                                    <div
                                        key={state}
                                        className={`flex flex-col gap-1 rounded-2xl p-3 ${isNow
                                            ? 'bg-[var(--c-accent-container)]'
                                            : 'border border-[var(--c-hairline)] bg-[var(--c-surface)]'}`}
                                    >
                                        {/* 104 = 4 × 26, so the sprite stays pixel-crisp. */}
                                        <PixelCat pose={pose} state={state} size={104} force />
                                        <p className="m-0 text-base font-semibold text-[var(--c-ink)]">{t(`cat.state.${state}`)}</p>
                                        <p className="m-0 text-sm tabular-nums text-[var(--c-muted)]">
                                            {pad(from)}:00–{pad(to)}:00
                                        </p>
                                        {isNow && (
                                            <p className="m-0 flex items-center gap-1 text-sm font-semibold text-[var(--c-on-accent-container)]">
                                                <Clock size={16} aria-hidden="true" />
                                                {t('settings.cat_states_now')}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </YouPage>
    );
};

export default CatStates;
