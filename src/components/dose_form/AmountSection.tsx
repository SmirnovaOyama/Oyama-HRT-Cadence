import React from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { Ester, isTestosteroneEster } from '../../../logic';
import { SegmentedControl } from '../ui';
import DoseStepper from './DoseStepper';
import { GroupHeader, esterName, formatApprox, midSentence } from './shared';

export type AmountBasis = 'raw' | 'bio';

export interface AmountSectionProps {
    ester: Ester;
    rawDose: string;
    e2Dose: string;
    onRawChange: (val: string) => void;
    onE2Change: (val: string) => void;
    /** Which figure the stepper edits: the medicine as taken, or the hormone itself. */
    basis: AmountBasis;
    onBasisChange: (basis: AmountBasis) => void;
    step: number;
}

/** Esters that are the hormone itself: there is nothing to convert. */
const isPlain = (ester: Ester) => ester === Ester.E2 || ester === Ester.T;

/**
 * "How much" for pills, injections and under-the-tongue doses: the stepper,
 * a unit switch when the medicine is an ester (EV mg or E2 mg), and the
 * converted figure as the group footer.
 */
const AmountSection: React.FC<AmountSectionProps> = ({
    ester,
    rawDose,
    e2Dose,
    onRawChange,
    onE2Change,
    basis,
    onBasisChange,
    step,
}) => {
    const { t, lang } = useTranslation();
    const isT = isTestosteroneEster(ester);
    const plain = isPlain(ester);
    const hasBasis = !plain && ester !== Ester.CPA;
    const editBio = plain || (hasBasis && basis === 'bio');

    const value = editBio ? e2Dose : rawDose;
    const onChange = editBio ? onE2Change : onRawChange;

    let note: string | null = null;
    if (hasBasis) {
        if (editBio) {
            const raw = parseFloat(rawDose);
            if (Number.isFinite(raw) && raw > 0) {
                note = t('log.raw_note')
                    .replace('{mg}', formatApprox(raw))
                    .replace('{name}', midSentence(lang, esterName(t, ester)));
            }
        } else {
            const bio = parseFloat(e2Dose);
            if (Number.isFinite(bio) && bio > 0) {
                note = t(isT ? 'log.t_note' : 'log.e2_note').replace('{mg}', formatApprox(bio));
            }
        }
    }

    return (
        <section>
            <GroupHeader
                trailing={hasBasis ? (
                    <SegmentedControl<AmountBasis>
                        aria-label={t('log.basis')}
                        className="w-44 flex-none"
                        value={basis}
                        onChange={onBasisChange}
                        options={[
                            { value: 'raw', label: `${ester} mg` },
                            { value: 'bio', label: isT ? 'T mg' : 'E2 mg' },
                        ]}
                    />
                ) : undefined}
            >
                {t('log.how_much')}
            </GroupHeader>
            <div className="list-group">
                <DoseStepper
                    value={value}
                    onChange={onChange}
                    step={step}
                    unit="mg"
                    label={t('log.amount')}
                />
            </div>
            {note && <p className="list-group-footer m-0">{note}</p>}
        </section>
    );
};

export default AmountSection;
