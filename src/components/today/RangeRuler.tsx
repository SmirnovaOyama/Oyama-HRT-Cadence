import React, { useLayoutEffect, useRef, useState } from 'react';

/* Range ruler (design/cadence/spec/components.md C20): a 24px bar with the
   target zone filled, the target named inside it, a marker at the current
   level and the two target edges labelled underneath. Drawn in HTML with
   percentages rather than a scaled SVG, so text stays 13px at any width. */

export interface TargetRange {
    low: number;
    high: number;
}

/** The ruler's scale: half the target's width below it, a full width above (50–300 for 100–200). */
export function rulerScale({ low, high }: TargetRange): [number, number] {
    const span = high - low;
    return [Math.max(0, low - span / 2), high + span];
}

export interface RangeRulerProps {
    value: number;
    target: TargetRange;
    /** "Target 100–200" */
    targetLabel: string;
    ariaLabel: string;
    className?: string;
}

const RangeRuler: React.FC<RangeRulerProps> = ({ value, target, targetLabel, ariaLabel, className }) => {
    const [min, max] = rulerScale(target);
    const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
    const lo = pct(target.low);
    const hi = pct(target.high);
    const at = pct(value);

    // The name sits at the start of the target zone, as on the board. When the
    // marker would cross it, it moves just past the zone's right edge instead,
    // where the marker can't be (a value that high puts the marker there only
    // when it is outside the zone, and then it isn't over the start).
    const boxRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLSpanElement>(null);
    const [labelAfter, setLabelAfter] = useState(false);
    useLayoutEffect(() => {
        const box = boxRef.current;
        const label = labelRef.current;
        if (!box || !label) return;
        const check = () => {
            const w = box.clientWidth;
            const start = (lo / 100) * w;
            const end = start + label.offsetWidth;
            const x = (at / 100) * w;
            setLabelAfter(x >= start - 6 && x <= end + 6 && value >= target.low && value <= target.high);
        };
        check();
        const ro = new ResizeObserver(check);
        ro.observe(box);
        return () => ro.disconnect();
    }, [lo, at, value, target.low, target.high, targetLabel]);

    return (
        <div role="img" aria-label={ariaLabel} className={`relative h-11 w-full ${className ?? ''}`}>
            <div ref={boxRef} className="absolute inset-x-0 top-1 h-6 overflow-hidden rounded-md border border-[var(--c-control)] bg-[var(--c-surface)]">
                <div
                    className="absolute inset-y-0 bg-[var(--c-target-fill)]"
                    style={{ left: `${lo}%`, width: `${hi - lo}%` }}
                />
                <span
                    ref={labelRef}
                    aria-hidden="true"
                    className="absolute top-0 whitespace-nowrap pl-1.5 text-[13px] font-semibold leading-[22px] text-[var(--c-target)]"
                    style={{ left: `${labelAfter ? hi : lo}%` }}
                >
                    {targetLabel}
                </span>
            </div>
            <div className="absolute top-0 h-8 w-0.5 -translate-x-1/2 bg-[var(--c-ink)]" style={{ left: `${at}%` }} aria-hidden="true" />
            <svg
                width="12"
                height="7"
                viewBox="0 0 12 7"
                className="absolute top-0 -translate-x-1/2"
                style={{ left: `${at}%` }}
                aria-hidden="true"
            >
                <polygon points="0,0 12,0 6,7" style={{ fill: 'var(--c-ink)' }} />
            </svg>
            {[target.low, target.high].map((v, i) => (
                <span
                    key={i}
                    aria-hidden="true"
                    className="absolute top-[26px] -translate-x-1/2 text-[13px] font-medium leading-[18px] text-[var(--c-muted)] tabular-nums"
                    style={{ left: `${i === 0 ? lo : hi}%` }}
                >
                    {v}
                </span>
            ))}
        </div>
    );
};

export default RangeRuler;
