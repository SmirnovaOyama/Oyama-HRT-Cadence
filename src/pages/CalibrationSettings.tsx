import React from 'react';
import { Check, Sliders, Timeline, ActivityLog, Off, Rewind } from '../components/icons';
import { LabelIcon } from '../components/ui/LabelIcon';
import { useTranslation } from '../contexts/LanguageContext';
import { CalibrationMethod, CalibrationHistoryMode, CalibrationResult } from '../../logic';
import { BackHeader, ListGroup, ListRow, Switch } from '../components/ui';

// The learning estimators mirror the calibration models on hrt.transmtf.com
// (EKF parameter learning, OU-Kalman dynamic calibration, Hybrid-MIPD Bayesian
// fit), reimplemented over this engine's two identifiable parameters: a
// personal amplitude and a personal clearance. People see a plain name; the
// technical one stays in the sub-line.
export const METHOD_ORDER: CalibrationMethod[] = ['mipd', 'ou_kalman', 'ekf', 'off'];

/** Only EKF and MIPD fit a personal clearance; OU-Kalman corrects amplitude only. */
const fitsClearance = (m: CalibrationMethod) => m === 'ekf' || m === 'mipd';

/** Friendly name of a calibration method ("Balanced"). */
export const methodName = (m: CalibrationMethod, t: (k: string) => string) => t(`tests.method.${m}`);

/** "How your curve is adjusted": one sentence about the adjustment, then one
 *  short muted line saying what it rests on (format_rules 10). */
export const CalibrationSummary: React.FC<{ method: CalibrationMethod; calibration: CalibrationResult }> = ({ method, calibration }) => {
    const { t } = useTranslation();

    let main: string;
    let detail: string | null = null;
    if (method === 'off') {
        main = t('tests.adjust.off');
    } else if (calibration.points.length === 0) {
        main = t('tests.adjust.none');
    } else {
        const pct = Math.round((calibration.scale - 1) * 100);
        main = pct === 0
            ? t('tests.adjust.same')
            : t(pct > 0 ? 'tests.adjust.higher' : 'tests.adjust.lower').replace('{p}', String(Math.abs(pct)));
        const hl = Math.round(calibration.halfLifeDeltaPct);
        if (fitsClearance(method) && hl !== 0) {
            main += ' ' + t(hl > 0 ? 'tests.adjust.longer' : 'tests.adjust.shorter').replace('{p}', String(Math.abs(hl)));
        }
        if (calibration.fitErrPct !== null) {
            detail = t('tests.adjust.based_fit')
                .replace('{n}', String(calibration.n))
                .replace('{p}', String(Math.max(1, Math.round(calibration.fitErrPct))));
        } else {
            detail = calibration.n === 1
                ? t('tests.adjust.based_one')
                : t('tests.adjust.based').replace('{n}', String(calibration.n));
        }
    }

    return (
        <div className="flex flex-col gap-1">
            <p className="m-0 text-base text-[var(--c-ink)]">{main}</p>
            {detail && <p className="m-0 text-sm text-[var(--c-muted)]">{detail}</p>}
        </div>
    );
};

/** The method list (pick one) and the history switch. Plain titles with
 *  one-line sub-lines; the technical names and the switch's explanation sit
 *  in the group footers. */
export const CalibrationChoices: React.FC<{
    method: CalibrationMethod;
    setMethod: (m: CalibrationMethod) => void;
    historyMode: CalibrationHistoryMode;
    setHistoryMode: (m: CalibrationHistoryMode) => void;
}> = ({ method, setMethod, historyMode, setHistoryMode }) => {
    const { t } = useTranslation();
    const retro = historyMode === 'retrospective';

    return (
        <div className="flex flex-col gap-6">
            <ListGroup
                header={t('tests.method_label')}
                footer={t('tests.method_footer')}
                selection="single"
                checkIcon={<Check size={22} />}
            >
                {METHOD_ORDER.map(m => (
                    <ListRow
                        key={m}
                        leading={<LabelIcon icon={m === 'mipd' ? Sliders : m === 'ou_kalman' ? Timeline : m === 'ekf' ? ActivityLog : Off} tone={m === 'off' ? 'muted' : m === 'mipd' ? 'teal' : m === 'ou_kalman' ? 'blue' : 'purple'} />}
                        title={<span className="block truncate">{methodName(m, t)}</span>}
                        sub={
                            <span className="block truncate">
                                {m === 'mipd' && (
                                    <><span className="font-semibold text-[var(--c-accent)]">{t('tests.recommended')}</span>{' '}</>
                                )}
                                {t(`tests.method.${m}_sub`)}
                            </span>
                        }
                        selected={method === m}
                        onClick={() => setMethod(m)}
                    />
                ))}
            </ListGroup>

            {/* How a new test may act on the past curve. Meaningless with
                calibration off, so it only shows for a learning method. */}
            {method !== 'off' && (
                <ListGroup footer={<span id="cal-past-footer">{t('tests.past_footer')}</span>}>
                    <ListRow
                        leading={<LabelIcon icon={Rewind} tone="blue" />}
                        title={<span id="cal-past-title" className="block truncate">{t('tests.past')}</span>}
                        trailing={
                            <Switch
                                checked={retro}
                                onChange={on => setHistoryMode(on ? 'retrospective' : 'forward')}
                                aria-labelledby="cal-past-title"
                                aria-describedby="cal-past-footer"
                            />
                        }
                    />
                </ListGroup>
            )}
        </div>
    );
};

interface CalibrationSettingsProps {
    method: CalibrationMethod;
    setMethod: (m: CalibrationMethod) => void;
    historyMode: CalibrationHistoryMode;
    setHistoryMode: (m: CalibrationHistoryMode) => void;
    calibration: CalibrationResult;
    onBack: () => void;
}

/** Sub-page of Blood tests: how tests adjust the curve. */
const CalibrationSettings: React.FC<CalibrationSettingsProps> = ({ method, setMethod, historyMode, setHistoryMode, calibration, onBack }) => {
    const { t } = useTranslation();

    return (
        <div className="relative pb-32">
            <div className="mx-auto flex w-full max-w-[704px] flex-col gap-6 px-4 md:px-8">
                <BackHeader parentLabel={t('tests.page_title')} onBack={onBack} title={t('tests.cal_title')} />

                <CalibrationSummary method={method} calibration={calibration} />

                <CalibrationChoices
                    method={method}
                    setMethod={setMethod}
                    historyMode={historyMode}
                    setHistoryMode={setHistoryMode}
                />

                {/* Attribution: the learning models mirror those on hrt.transmtf.com. */}
                <p className="m-0 px-4 text-sm text-[var(--c-muted)]">{t('cal.source')}</p>
            </div>
        </div>
    );
};

export default CalibrationSettings;
