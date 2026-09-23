import React, { forwardRef } from 'react';

/**
 * Props for every Cadence icon. The shape matches lucide-react closely enough that
 * existing call sites keep compiling: `strokeWidth`, `absoluteStrokeWidth` and `color`
 * are accepted. The stroke weight is never taken from props; it always comes from
 * optical sizing (see design/cadence/icons/grammar.md).
 */
export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref' | 'color' | 'strokeWidth'> {
    /** Rendered size in px (width and height). Default 24. */
    size?: number | string;
    /** Accessible name. When given, the icon is exposed as an image instead of being hidden. */
    title?: string;
    /** Accepted for lucide compatibility and ignored: weight follows optical sizing. */
    strokeWidth?: number | string;
    /** Accepted for lucide compatibility and ignored. */
    absoluteStrokeWidth?: boolean;
    /** Sets the CSS colour (the icon draws in currentColor). */
    color?: string;
}

export type IconComponent = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

/** Optical sizing: the geometry never changes, only the stroke weight. */
export const opticalStrokeWidth = (px: number): number => (px >= 22 ? 1.75 : px >= 18 ? 2 : 2.25);

const toPx = (size: number | string): number => {
    if (typeof size === 'number') return size;
    const n = parseFloat(size);
    return Number.isFinite(n) && /^\s*[\d.]+\s*(px)?\s*$/.test(size) ? n : 24;
};

export function createIcon(name: string, children: React.ReactNode): IconComponent {
    const Icon = forwardRef<SVGSVGElement, IconProps>(function CadenceIcon(
        {
            size = 24,
            className,
            style,
            title,
            color,
            strokeWidth: _strokeWidth,
            absoluteStrokeWidth: _absoluteStrokeWidth,
            ...rest
        },
        ref,
    ) {
        const labelled = Boolean(title) || rest['aria-label'] != null || rest['aria-labelledby'] != null;
        return (
            <svg
                ref={ref}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width={size}
                height={size}
                fill="none"
                stroke="currentColor"
                strokeWidth={opticalStrokeWidth(toPx(size))}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className ? `cadence-icon cadence-icon-${name} ${className}` : `cadence-icon cadence-icon-${name}`}
                style={color ? { ...style, color } : style}
                aria-hidden={labelled ? undefined : true}
                role={labelled ? 'img' : undefined}
                focusable="false"
                {...rest}
            >
                {title ? <title>{title}</title> : null}
                {children}
            </svg>
        );
    });
    Icon.displayName = name
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('');
    return Icon;
}
