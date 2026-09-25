import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { Back } from '../icons';

/* Page and section headings from the Cadence boards. Sentence case always: these
   components never transform text. Colours come from the --c-* tokens, which
   flip in .dark, so no dark: variants are needed here. */

export interface PageHeaderProps {
    /** Large page title (32/38, 700), like an iOS large title. */
    title: React.ReactNode;
    /** Muted line under the title, e.g. "Feminizing HRT". */
    subtitle?: React.ReactNode;
    /** Actions on the right: icon buttons or a compact secondary button. */
    trailing?: React.ReactNode;
    className?: string;
}

/** Header for a top-level tab (Today, Timeline, Tests, You). */
export function PageHeader({ title, subtitle, trailing, className }: PageHeaderProps) {
    return (
        <header className={`flex items-start justify-between gap-3 pt-4 pb-3 ${className ?? ''}`}>
            <div className="min-w-0">
                <h1 className="m-0 text-3xl font-bold text-[var(--c-ink)]">{title}</h1>
                {subtitle != null && <p className="m-0 mt-0.5 text-sm text-[var(--c-muted)]">{subtitle}</p>}
            </div>
            {trailing != null && <div className="flex shrink-0 items-center gap-1">{trailing}</div>}
        </header>
    );
}

export interface BackHeaderProps {
    /** Name of the screen the back button returns to, e.g. "You". */
    parentLabel: React.ReactNode;
    onBack: () => void;
    /** This page's title, shown large on its own line under the back button. */
    title: React.ReactNode;
    trailing?: React.ReactNode;
    className?: string;
}

/** Header for a sub-page: a back button naming its parent, then the page title. */
export function BackHeader({ parentLabel, onBack, title, trailing, className }: BackHeaderProps) {
    return (
        <header className={`pt-2 pb-3 ${className ?? ''}`}>
            <div className="flex min-h-14 items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="-ml-3 inline-flex h-11 items-center gap-1 rounded-full pl-3 pr-4 text-base font-medium text-[var(--c-ink)] hover:bg-[var(--c-plate)]"
                >
                    <Back size={20} />
                    <span>{parentLabel}</span>
                </button>
                {trailing != null && <div className="flex shrink-0 items-center gap-1">{trailing}</div>}
            </div>
            <h1 className="m-0 text-3xl font-bold text-[var(--c-ink)]">{title}</h1>
        </header>
    );
}

export interface LeadProps {
    /** One summary sentence (17/26, 600). */
    children: React.ReactNode;
    /** At most one short muted line under it. Never repeat a fact from the
     *  sentence ("Taken Tue Sep 15, 3 days after your shot." is one line). */
    detail?: React.ReactNode;
    className?: string;
}

/** Opening text of a page (format_rules 10). Not a 22px heading. */
export function Lead({ children, detail, className }: LeadProps) {
    return (
        <div className={`flex flex-col gap-1 ${className ?? ''}`}>
            <p className="m-0 text-base font-semibold text-[var(--c-ink)]">{children}</p>
            {detail != null && <p className="m-0 text-sm text-[var(--c-muted)]">{detail}</p>}
        </div>
    );
}

export interface SectionProps {
    /** Section heading (22/28, 600). Only for content regions on Today,
     *  Timeline and Blood tests ("Coming up", "Your results"). Settings-style
     *  pages use a ListGroup `header` instead (format_rules 8). */
    title: React.ReactNode;
    /** Optional plain text action on the right, e.g. "Reminders". */
    action?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
}

/** A titled region of a page, 12px between heading and content. */
export function Section({ title, action, children, className }: SectionProps) {
    return (
        <section className={className}>
            <div className="mb-3 flex min-h-11 items-center justify-between gap-3">
                <h2 className="m-0 text-xl font-semibold text-[var(--c-ink)]">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

export interface SegmentedOption<T extends string> {
    value: T;
    label: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
    options: SegmentedOption<T>[];
    value: T;
    onChange: (value: T) => void;
    'aria-label': string;
    /** 'sm' has a 36px track with a 44px tap area. */
    size?: 'md' | 'sm';
    /** A quiet 30px unit selector inside a 44px-tall interaction area. */
    variant?: 'default' | 'inline';
    className?: string;
}

/** Capsule track and segments for 2 to 4 short choices (chart ranges, units).
 *  Longer choices belong in a ListGroup. */
export function SegmentedControl<T extends string>({ options, value, onChange, size = 'md', variant = 'default', className, ...rest }: SegmentedControlProps<T>) {
    const inline = variant === 'inline';
    const trackRef = useRef<HTMLDivElement>(null);
    const indicatorRef = useRef<HTMLSpanElement>(null);
    const buttonRefs = useRef(new Map<T, HTMLButtonElement>());
    const previousValue = useRef(value);
    const geometry = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

    const positionIndicator = useCallback((animate: boolean) => {
        const track = trackRef.current;
        const indicator = indicatorRef.current;
        const button = buttonRefs.current.get(value);
        if (!track || !indicator) return;
        if (!button || !button.getClientRects().length) {
            indicator.dataset.positioned = 'false';
            geometry.current = null;
            return;
        }

        const trackRect = track.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const next = {
            x: buttonRect.left - trackRect.left - track.clientLeft + track.scrollLeft,
            y: buttonRect.top - trackRect.top - track.clientTop + track.scrollTop,
            width: buttonRect.width,
            height: buttonRect.height,
        };
        const previous = geometry.current;
        if (previous && previous.x === next.x && previous.y === next.y
            && previous.width === next.width && previous.height === next.height) return;

        // The first measurement and layout changes settle immediately. Only a
        // changed selection moves the same pill, including during rapid taps.
        indicator.dataset.animated = String(animate && previous !== null);
        indicator.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
        indicator.style.width = `${next.width}px`;
        indicator.style.height = `${next.height}px`;
        indicator.dataset.positioned = 'true';
        geometry.current = next;
    }, [value]);

    useLayoutEffect(() => {
        positionIndicator(previousValue.current !== value);
        previousValue.current = value;
    });

    useLayoutEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        const resize = () => positionIndicator(false);
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', resize);
            return () => window.removeEventListener('resize', resize);
        }
        const observer = new ResizeObserver(resize);
        observer.observe(track);
        for (const button of buttonRefs.current.values()) observer.observe(button);
        return () => observer.disconnect();
    }, [positionIndicator, options]);

    const control = (
        <div
            ref={trackRef}
            role="radiogroup"
            aria-label={rest['aria-label']}
            className={`segmented-control relative isolate flex rounded-full ${inline ? 'h-[30px] w-full gap-0.5 p-0.5 bg-transparent' : `${size === 'sm' ? 'h-9 gap-0.5 p-0.5' : 'h-11 gap-1 p-1'} bg-[var(--c-plate)]`} ${inline ? '' : className ?? ''}`}
        >
            <span
                ref={indicatorRef}
                aria-hidden="true"
                className="segmented-indicator"
                style={inline ? { borderWidth: 0, backgroundColor: 'var(--c-plate)' } : undefined}
            />
            {options.map(opt => {
                const selected = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        ref={button => {
                            if (button) buttonRefs.current.set(opt.value, button);
                            else buttonRefs.current.delete(opt.value);
                        }}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(opt.value)}
                        className={`relative z-[1] flex-1 rounded-full bg-transparent text-sm ${inline
                            ? "border-0 px-2 font-normal before:absolute before:inset-x-0 before:top-1/2 before:h-[44px] before:-translate-y-1/2 before:content-['']"
                            : `border border-transparent ${size === 'sm' ? "px-2 before:absolute before:inset-x-0 before:top-1/2 before:h-[44px] before:-translate-y-1/2 before:content-['']" : 'px-3'} font-semibold`} ${selected
                            ? 'text-[var(--c-ink)]'
                            : 'text-[var(--c-muted)] hover:text-[var(--c-ink)]'}`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );

    return inline ? <div className={`flex h-11 items-center ${className ?? ''}`}>{control}</div> : control;
}
