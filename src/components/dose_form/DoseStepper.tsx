import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Minus, Plus } from '../icons';
import { Button } from '../ui';
import { useTranslation } from '../../contexts/LanguageContext';
import { formatAmount } from './shared';
import './DoseStepper.css';

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

interface NumberMotion {
    id: number;
    from: string;
    to: string;
    direction: 1 | -1;
}

/** Quiet 36px circles inside 48px hit targets, with a medium-weight value and
 *  a smaller unit. The amount stays a real, typeable number field inside a row. */
const DoseStepper: React.FC<DoseStepperProps> = ({ value, onChange, step, min = 0, max, unit, label, placeholder = '0' }) => {
    const { t } = useTranslation();
    const [motion, setMotion] = useState<NumberMotion | null>(null);
    const latestValue = useRef(value);
    const motionId = useRef(0);
    const current = parseFloat(value);
    const base = Number.isFinite(current) ? current : 0;

    useLayoutEffect(() => {
        latestValue.current = value;
        // External changes and parent-side normalisation do not roll the number.
        setMotion(previous => previous && previous.to !== value ? null : previous);
    }, [value]);

    useEffect(() => {
        if (!motion) return;
        // Also clear when animations are interrupted or disabled mid-flight.
        const timeout = window.setTimeout(() => {
            setMotion(previous => previous?.id === motion.id ? null : previous);
        }, 240);
        return () => window.clearTimeout(timeout);
    }, [motion]);

    const nudge = (dir: 1 | -1) => {
        const parsed = parseFloat(latestValue.current);
        const latest = Number.isFinite(parsed) ? parsed : 0;
        if (!Number.isFinite(step) || step <= 0
            || (dir < 0 && latest <= min)
            || (dir > 0 && max !== undefined && latest >= max)) return;
        let next = dir > 0
            ? Math.floor(latest / step + 1e-9) * step + step
            : Math.ceil(latest / step - 1e-9) * step - step;
        if (next < min) next = min;
        if (max !== undefined && next > max) next = max;
        const formatted = formatAmount(next);
        if (!formatted || Number(formatted) === latest) return;

        const from = latestValue.current || placeholder;
        latestValue.current = formatted;
        const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        setMotion(reducedMotion ? null : { id: ++motionId.current, from, to: formatted, direction: dir });
        // Commit each tap immediately; the animation never queues value changes.
        onChange(formatted);
    };

    const shown = value || placeholder;
    // Reserve two digits so the unit stays put through the common 9 ↔ 10 step.
    const width = `calc(${Math.max(2, shown.length)}ch + 6px)`;

    return (
        <div role="group" aria-label={label} className="dose-stepper flex items-center gap-3 px-4 py-3" data-adjusting={motion ? 'true' : undefined}>
            <Button
                variant="icon"
                aria-label={t('log.less')}
                className="stepper-action flex-none"
                disabled={base <= min}
                onClick={() => nudge(-1)}
            >
                <span aria-hidden="true"><Minus size={22} /></span>
            </Button>
            <label className="flex min-w-0 flex-1 cursor-text items-baseline justify-center gap-1.5 text-[24px] font-medium leading-8 text-[var(--c-ink)]">
                <span
                    className="dose-stepper-value relative inline-block min-w-0 max-w-full"
                    data-rolling={motion ? 'true' : undefined}
                    style={{ width }}
                >
                    <input
                        type="number"
                        inputMode="decimal"
                        min={min}
                        max={max}
                        step="any"
                        value={value}
                        placeholder={placeholder}
                        aria-label={label}
                        onFocus={() => setMotion(null)}
                        onChange={e => {
                            latestValue.current = e.target.value;
                            setMotion(null);
                            onChange(e.target.value);
                        }}
                        className="block w-full min-w-0 max-w-full rounded-full border-0 bg-transparent p-0 text-center text-[24px]! leading-8 font-medium tabular-nums text-[var(--c-ink)] outline-none placeholder:text-[var(--c-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--c-ink)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    {motion && (
                        <span
                            key={motion.id}
                            aria-hidden="true"
                            className="dose-stepper-motion"
                            style={{ '--stepper-travel': `${motion.direction * 10}px` } as React.CSSProperties}
                        >
                            <span className="dose-stepper-number dose-stepper-number-old">{motion.from}</span>
                            <span
                                className="dose-stepper-number dose-stepper-number-new"
                                onAnimationEnd={() => setMotion(previous => previous?.id === motion.id ? null : previous)}
                            >
                                {motion.to}
                            </span>
                        </span>
                    )}
                </span>
                <span className="flex-none whitespace-nowrap text-base font-normal text-[var(--c-muted)]">{unit}</span>
            </label>
            <Button
                variant="icon"
                aria-label={t('log.more')}
                className="stepper-action flex-none"
                disabled={max !== undefined && base >= max}
                onClick={() => nudge(1)}
            >
                <span aria-hidden="true"><Plus size={22} /></span>
            </Button>
        </div>
    );
};

export default DoseStepper;
