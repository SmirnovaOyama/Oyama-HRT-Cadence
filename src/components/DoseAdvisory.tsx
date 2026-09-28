import React from 'react';
import { Attention } from './icons';
import { DoseAdvisory as Advisory, HormoneLevelAdvisory } from '../../logic';

// Heads-ups about logged doses and measured labs. Status is always an icon plus
// words (design/cadence/spec/components.md C12, C14):
//   - `panel`: the attention panel on Today, a flat attention fill with the
//     icon in the attention colour and the words in ink;
//   - otherwise a plain line in the attention colour, for inline use in the
//     dose form and on Blood tests.

const PANEL = 'flex items-start gap-3 rounded-2xl bg-[var(--c-attention-fill)] p-4 text-base text-[var(--c-ink)]';
const LINE = 'flex items-start gap-2 text-sm text-[var(--c-attention)]';

const AdvisoryText: React.FC<{ text: string; panel?: boolean }> = ({ text, panel }) =>
    panel ? (
        <div role="note" className={PANEL}>
            <Attention size={20} className="mt-0.5 shrink-0 text-[var(--c-attention)]" />
            <p className="m-0 min-w-0">{text}</p>
        </div>
    ) : (
        <p className={LINE}>
            <Attention size={16} className="mt-[3px] shrink-0" />
            <span>{text}</span>
        </p>
    );

/** Logged doses running clearly high. Shared by Today and the dose form. */
export const DoseAdvisoryLine: React.FC<{ advisory: Advisory; t: (k: string) => string; panel?: boolean }> = ({ advisory, t, panel }) => (
    <AdvisoryText text={t(`advisory.${advisory.kind}.body`)} panel={panel} />
);

/** Latest estradiol and testosterone labs both low or both high. Shared by Today and Blood tests. */
export const HormoneLevelAdvisoryLine: React.FC<{ advisory: HormoneLevelAdvisory; t: (k: string) => string; panel?: boolean }> = ({ advisory, t, panel }) => (
    <AdvisoryText text={t(`advisory.hormone_${advisory.kind}.body`)} panel={panel} />
);

/**
 * Today's notices, in order: the dose warning, then the lab warning, both as
 * attention panels. The blood-test prompt lives in Today's estimate card.
 */
const DoseAdvisoryNotice: React.FC<{
    advisory: Advisory | null;
    hormoneAdvisory?: HormoneLevelAdvisory | null;
    t: (k: string) => string;
    className?: string;
}> = ({ advisory, hormoneAdvisory, t, className }) => {
    if (!advisory && !hormoneAdvisory) return null;
    return (
        <div className={`flex flex-col gap-3 ${className ?? ''}`}>
            {advisory && <DoseAdvisoryLine advisory={advisory} t={t} panel />}
            {hormoneAdvisory && <HormoneLevelAdvisoryLine advisory={hormoneAdvisory} t={t} panel />}
        </div>
    );
};

export default DoseAdvisoryNotice;
