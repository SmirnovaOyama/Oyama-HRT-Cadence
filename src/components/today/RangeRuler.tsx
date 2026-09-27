import React, { useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from '../icons';

/* Range ruler (design/cadence/spec/components.md C20): a 24px capsule with the
   target zone filled, the stretch above it tinted warm, the target named inside
   it, a marker at the current level and the two target edges labelled
   underneath. Everything is drawn inside the capsule, so the marker never
   pokes past its rounded ends. Drawn in HTML with percentages rather than a
   scaled SVG, so text stays 13px at any width. */

/** Where a level beyond the scale is shown: its marker, then the arrow in the end cap. */
const END_MARKER = 26;   // marker centre, px from the end
const END_VALUE = 34;    // value text, px from the end
const INSET = 10;        // nearest a marker's centre gets to either end

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

    // Prefer the start of the target zone, then just after it. On narrow
    // screens, use whichever side of the marker can hold the full label.
    // Beyond the scale, the marker waits at that end with the value beside it and
    // an arrow in the end cap saying "further than this".
    const beyond = value > max ? 'high' : value < min ? 'low' : null;

    // Prefer the start of the target zone, then just after it. On narrow
    // screens, use whichever side of the marker (or of the off-scale value at
    // the end) can hold the full label.
    const boxRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLSpanElement>(null);
    const valueRef = useRef<HTMLSpanElement>(null);
    const [labelLeft, setLabelLeft] = useState<number | null>(null);
    useLayoutEffect(() => {
        const box = boxRef.current;
        const label = labelRef.current;
        if (!box || !label) return;
        const check = () => {
            const w = box.clientWidth;
            const labelWidth = label.offsetWidth;
            const inset = 3;
            const gap = 6;
            const rightmost = Math.max(inset, w - inset - labelWidth);
            const start = (lo / 100) * w;
            const valueW = valueRef.current?.offsetWidth ?? 0;
            // The stretch of the bar the marker (and any off-scale value) already uses.
            const [busy0, busy1] = beyond === 'high' ? [w - END_VALUE - valueW - gap, w]
                : beyond === 'low' ? [0, END_VALUE + valueW + gap]
                    : (() => { const x = Math.max(INSET, Math.min(w - INSET, (at / 100) * w)); return [x - 2 - gap, x + 2 + gap]; })();
            const fits = (left: number) => left >= inset && left <= rightmost &&
                (left + labelWidth <= busy0 || left >= busy1);
            const candidates = [start, (hi / 100) * w, busy1, busy0 - labelWidth, inset, rightmost];
            setLabelLeft(candidates.find(fits) ?? Math.min(rightmost, Math.max(inset, start)));
        };
        check();
        const ro = new ResizeObserver(check);
        ro.observe(box);
        return () => ro.disconnect();
    }, [lo, hi, at, beyond, value, targetLabel]);

    const markerLeft = beyond === 'high' ? `calc(100% - ${END_MARKER}px)`
        : beyond === 'low' ? `${END_MARKER}px`
            : `clamp(${INSET}px, ${at}%, calc(100% - ${INSET}px))`;
    const Arrow = beyond === 'low' ? ChevronLeft : ChevronRight;

    return (
        <div role="img" aria-label={ariaLabel} className={`relative h-[50px] w-full ${className ?? ''}`}>
            <div ref={boxRef} className="absolute inset-x-0 top-1 h-6 overflow-hidden rounded-full bg-[var(--c-plate-strong)]">
                <div
                    className="absolute inset-y-0 bg-[var(--c-target-fill)]"
                    style={{ left: `${lo}%`, width: `${hi - lo}%` }}
                />
                {/* Above the target: a faint warm tint up to the end of the bar. */}
                <div
                    className="absolute inset-y-0 right-0 bg-[var(--c-attention)] opacity-20"
                    style={{ left: `${hi}%` }}
                />
                <span
                    ref={labelRef}
                    aria-hidden="true"
                    className="absolute top-0 whitespace-nowrap pl-1.5 text-[13px] font-semibold leading-6 text-[var(--c-target)]"
                    style={{ left: labelLeft ?? `${lo}%` }}
                >
                    {targetLabel}
                </span>
                {beyond && (
                    <>
                        <span
                            ref={valueRef}
                            aria-hidden="true"
                            className="absolute top-0 whitespace-nowrap text-[13px] font-semibold leading-6 tabular-nums text-[var(--c-ink)]"
                            style={beyond === 'high' ? { right: END_VALUE } : { left: END_VALUE }}
                        >
                            {Math.round(value)}
                        </span>
                        <Arrow
                            size={14}
                            aria-hidden="true"
                            className={`absolute top-[5px] text-[var(--c-ink)] ${beyond === 'high' ? 'right-1.5' : 'left-1.5'}`}
                        />
                    </>
                )}
                {/* The marker sits inside the capsule, 4px clear of its top and bottom. */}
                <span
                    aria-hidden="true"
                    className="absolute inset-y-1 w-1 -translate-x-1/2 rounded-full bg-[var(--c-ink)]"
                    style={{ left: markerLeft }}
                />
            </div>
            {[target.low, target.high].map((v, i) => (
                <span
                    key={i}
                    aria-hidden="true"
                    className="absolute top-[31px] -translate-x-1/2 text-[13px] font-medium leading-[18px] text-[var(--c-muted)] tabular-nums"
                    style={{ left: `${i === 0 ? lo : hi}%` }}
                >
                    {v}
                </span>
            ))}
        </div>
    );
};

export default RangeRuler;
