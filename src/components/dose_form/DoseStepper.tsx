import React from 'react';
import { Minus, Plus } from '../icons';
import { Button } from '../ui';
import { useTranslation } from '../../contexts/LanguageContext';
import { formatAmount } from './shared';

interface DoseStepperProps {
    value: string;
    onChange: (val: string) => void;
    /** Amount one press of minus or plus moves by. Values snap to it. */
    step: number;
    min?: number;
    max?: number;
    /** Unit shown after the number, e.g. "mg" or "µg/day". */
    unit: string;
    /** Accessible name of the number field. */
    label: string;
    placeholder?: string;
}

/** The C7 stepper: 48px tinted minus and plus with the amount in 30/36 600
 *  between them. The amount stays a real, typeable number field. Meant to be
 *  one row of a list group. */
const DoseStepper: React.FC<DoseStepperProps> = ({ value, onChange, step, min = 0, max, unit, label, placeholder = '0' }) => {
    const { t } = useTranslation();
    const current = parseFloat(value);
    const base = Number.isFinite(current) ? current : 0;

    const nudge = (dir: 1 | -1) => {
        let next = dir > 0
            ? Math.floor(base / step + 1e-9) * step + step
            : Math.ceil(base / step - 1e-9) * step - step;
        if (next < min) next = min;
        if (max !== undefined && next > max) next = max;
        onChange(formatAmount(next));
    };

    const shown = value || placeholder;
    const width = `calc(${Math.max(1, shown.length)}ch + 6px)`;

    return (
        <div role="group" aria-label={label} className="flex items-center gap-3 px-4 py-3">
            <Button
                variant="secondary"
                aria-label={t('log.less')}
                className="h-12 min-h-12 w-12 flex-none rounded-xl px-0"
                disabled={base <= min}
                onClick={() => nudge(-1)}
            >
                <Minus size={22} />
            </Button>
            <label className="flex min-w-0 flex-1 cursor-text items-baseline justify-center gap-1.5 text-[30px] font-semibold leading-9 text-[var(--c-ink)]">
                <input
                    type="number"
                    inputMode="decimal"
                    min={min}
                    max={max}
                    step="any"
                    value={value}
                    placeholder={placeholder}
                    aria-label={label}
                    onChange={e => onChange(e.target.value)}
                    style={{ width }}
                    className="min-w-0 max-w-full rounded-lg border-0 bg-transparent p-0 text-center text-[30px]! leading-9 font-semibold tabular-nums text-[var(--c-ink)] outline-none placeholder:text-[var(--c-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-ink)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <span className="flex-none whitespace-nowrap">{unit}</span>
            </label>
            <Button
                variant="secondary"
                aria-label={t('log.more')}
                className="h-12 min-h-12 w-12 flex-none rounded-xl px-0"
                disabled={max !== undefined && base >= max}
                onClick={() => nudge(1)}
            >
                <Plus size={22} />
            </Button>
        </div>
    );
};

export default DoseStepper;
