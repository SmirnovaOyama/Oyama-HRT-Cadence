import React from 'react';
import type { IconComponent } from '../icons';
import type { Lang } from '../../i18n/translations';
import { DailySlot, addLocalDays, calendarDaysBetween } from '../../utils/schedule';
import { weekdayShort } from './format';

/* The rhythm dial (design/cadence/spec/components.md C19). One SVG on a
   300×300 grid, centre (150,150):
     - outer ring r106–128: one segment per day of the cycle, day 1 (the day of
       the last dose) at the top, running clockwise;
     - inner ring r90–98: the daily regimen's slots, each placed at its usual
       dose time within the cycle;
     - a hand at "now", drawn last.
   An HTML button sits over the centre disc (the level and the cat).
   Colours are --c-* tokens, so the same drawing works in light and dark. */

const CX = 150;
const CY = 150;
const OUTER_R0 = 106;
const OUTER_R1 = 128;
const INNER_R0 = 90;
const INNER_R1 = 98;
const GAP_DEG = 1.5;
const LABEL_R = 140;
const HAND_R0 = 76;
const HAND_R1 = 134;

const polar = (r: number, deg: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [CX + r * Math.sin(a), CY - r * Math.cos(a)];
};

const f = (n: number) => Math.round(n * 10) / 10;

/** Annular sector between two angles (degrees clockwise from the top). */
function sector(a0: number, a1: number, r0: number, r1: number): string {
    const large = a1 - a0 > 180 ? 1 : 0;
    const [x0, y0] = polar(r1, a0);
    const [x1, y1] = polar(r1, a1);
    const [x2, y2] = polar(r0, a1);
    const [x3, y3] = polar(r0, a0);
    return `M${f(x0)} ${f(y0)} A${r1} ${r1} 0 ${large} 1 ${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} A${r0} ${r0} 0 ${large} 0 ${f(x3)} ${f(y3)} Z`;
}

type Paint = { fill: string; stroke?: string; strokeWidth?: number; dash?: string };

const SEG: Record<'dose' | 'past' | 'today' | 'doseToday' | 'future', Paint> = {
    dose: { fill: 'var(--c-accent)' },
    past: { fill: 'var(--c-plate-strong)' },
    today: { fill: 'var(--c-accent-container)', stroke: 'var(--c-ink)', strokeWidth: 2 },
    doseToday: { fill: 'var(--c-accent)', stroke: 'var(--c-ink)', strokeWidth: 2 },
    future: { fill: 'var(--c-surface)', stroke: 'var(--c-hairline)', strokeWidth: 1 },
};

const SLOT: Record<Exclude<DailySlot['state'], 'none'>, Paint> = {
    taken: { fill: 'var(--c-second)' },
    missed: { fill: 'none', stroke: 'var(--c-control)', strokeWidth: 1.5, dash: '3 2' },
    due: { fill: 'none', stroke: 'var(--c-second)', strokeWidth: 1.5, dash: '3 2' },
    dueNow: { fill: 'var(--c-second-tint)', stroke: 'var(--c-second)', strokeWidth: 2 },
    upcoming: { fill: 'var(--c-surface)', stroke: 'var(--c-hairline)', strokeWidth: 1 },
};

const paintStyle = (p: Paint): React.CSSProperties => ({
    fill: p.fill,
    stroke: p.stroke ?? 'none',
    strokeWidth: p.strokeWidth,
    strokeDasharray: p.dash,
});

export interface RhythmDialProps {
    /** Days in the cycle (outer ring segments). */
    cycleDays: number;
    /** Local midnight of cycle day 1. */
    cycleStartMs: number;
    /** Whether day 1 holds a logged dose (false for the empty first-run dial). */
    hasDose: boolean;
    /** How far through the cycle "now" is, 0..1. */
    fraction: number;
    nowMs: number;
    /** Glyph drawn on the dose segment (the route's icon). */
    glyph?: IconComponent;
    /** Daily slots covering the cycle's days, or null for no inner ring. */
    slots: DailySlot[] | null;
    lang: Lang;
    ariaLabel: string;
    /** Centre content (cat, number, unit). */
    children: React.ReactNode;
    onCentreClick?: () => void;
    centreAriaLabel?: string;
}

const RhythmDial: React.FC<RhythmDialProps> = ({
    cycleDays,
    cycleStartMs,
    hasDose,
    fraction,
    nowMs,
    glyph: Glyph,
    slots,
    lang,
    ariaLabel,
    children,
    onCentreClick,
    centreAriaLabel,
}) => {
    const n = Math.max(2, cycleDays);
    const step = 360 / n;
    const cycleEndMs = addLocalDays(cycleStartMs, n);
    const todayIndex = calendarDaysBetween(cycleStartMs, nowMs);

    const segments = Array.from({ length: n }, (_, i) => {
        const isToday = i === todayIndex;
        let paint: Paint;
        if (!hasDose) paint = isToday ? SEG.today : SEG.future;
        else if (i === 0) paint = isToday ? SEG.doseToday : SEG.dose;
        else if (isToday) paint = SEG.today;
        else if (i < todayIndex) paint = SEG.past;
        else paint = SEG.future;
        return { i, d: sector(i * step + GAP_DEG, (i + 1) * step - GAP_DEG, OUTER_R0, OUTER_R1), paint };
    });

    // Label every day up to a week (weekday names); longer cycles use day
    // numbers, thinned out past two weeks so they never crowd.
    const labels = Array.from({ length: n }, (_, i) => {
        const isToday = i === todayIndex;
        if (n > 14 && i % 7 !== 0 && !isToday) return null;
        const text = n <= 7 ? weekdayShort(addLocalDays(cycleStartMs, i), lang) : String(i + 1);
        const [x, y] = polar(LABEL_R, (i + 0.5) * step);
        return { i, x, y: y + 5, text, isToday };
    }).filter(Boolean) as { i: number; x: number; y: number; text: string; isToday: boolean }[];

    const slotHalf = Math.min(7, step * 0.136);
    const slotPaths = (slots ?? [])
        .map((s, i) => {
            if (s.state === 'none') return null;
            const frac = (s.dueMs - cycleStartMs) / (cycleEndMs - cycleStartMs);
            if (frac < 0 || frac > 1) return null;
            const mid = frac * 360;
            return { i, d: sector(mid - slotHalf, mid + slotHalf, INNER_R0, INNER_R1), paint: SLOT[s.state] };
        })
        .filter(Boolean) as { i: number; d: string; paint: Paint }[];

    const handDeg = Math.min(1, Math.max(0, fraction)) * 360;
    const [hx0, hy0] = polar(HAND_R0, handDeg);
    const [hx1, hy1] = polar(HAND_R1, handDeg);

    // Glyph centred on the dose segment's middle.
    const glyphSize = Math.min(14, (2 * Math.PI * 117 * (step - 2 * GAP_DEG)) / 360 - 4);
    const [gx, gy] = polar((OUTER_R0 + OUTER_R1) / 2, step / 2);

    return (
        <div className="relative h-[280px] w-[294px] flex-none self-center xl:h-[400px] xl:w-[420px]">
            <svg
                viewBox="-7.5 0 315 300"
                className="block h-full w-full"
                role="img"
                aria-label={ariaLabel}
            >
                <g>
                    {segments.map(s => (
                        <path key={s.i} d={s.d} style={paintStyle(s.paint)} />
                    ))}
                </g>
                {slotPaths.length > 0 && (
                    <g>
                        {slotPaths.map(s => (
                            <path key={s.i} d={s.d} style={paintStyle(s.paint)} />
                        ))}
                    </g>
                )}
                {/* Next-dose tick at the top, in the gap before day 1 comes round again */}
                {hasDose && (
                    <path d={`M${CX} 50 L${CX} 14`} style={{ stroke: 'var(--c-accent)', fill: 'none' }} strokeWidth={2.5} strokeLinecap="round" />
                )}
                {hasDose && Glyph && glyphSize >= 8 && (
                    <Glyph
                        size={glyphSize}
                        x={f(gx - glyphSize / 2)}
                        y={f(gy - glyphSize / 2)}
                        style={{ color: 'var(--c-paper)' }}
                    />
                )}
                <g>
                    {labels.map(l => (
                        <text
                            key={l.i}
                            x={f(l.x)}
                            y={f(l.y)}
                            textAnchor="middle"
                            className="text-[14px] xl:text-[10.5px]"
                            style={{
                                fill: l.isToday ? 'var(--c-ink)' : 'var(--c-muted)',
                                fontWeight: l.isToday ? 700 : 500,
                            }}
                        >
                            {l.text}
                        </text>
                    ))}
                </g>
                <circle cx={CX} cy={CY} r={72} style={{ fill: 'var(--c-surface)', stroke: 'var(--c-hairline)' }} strokeWidth={1} />
                <path
                    d={`M${f(hx0)} ${f(hy0)} L${f(hx1)} ${f(hy1)}`}
                    style={{ stroke: 'var(--c-ink)', fill: 'none' }}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                />
            </svg>
            {onCentreClick ? (
                <button
                    type="button"
                    onClick={onCentreClick}
                    aria-label={centreAriaLabel}
                    className="absolute left-1/2 top-1/2 flex h-[134px] w-[134px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full text-[var(--c-ink)] focus-visible:outline-[3px] focus-visible:outline-[var(--c-ink)] xl:h-[192px] xl:w-[192px]"
                >
                    {children}
                </button>
            ) : (
                <div className="absolute left-1/2 top-1/2 flex h-[134px] w-[134px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-full text-center text-[var(--c-ink)] xl:h-[192px] xl:w-[192px]">
                    {children}
                </div>
            )}
        </div>
    );
};

export default RhythmDial;
