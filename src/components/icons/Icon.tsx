import React, { forwardRef } from 'react';

/**
 * Props for every Cadence icon. The shape matches lucide-react closely enough that
 * existing call sites keep compiling: `strokeWidth`, `absoluteStrokeWidth` and `color`
 * are accepted. The stroke weight is never taken from props: every icon renders at
 * the owner's drawn weight (see design/cadence/icons/grammar.md).
 */
export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref' | 'color' | 'strokeWidth'> {
    /** Rendered size in px (width and height). Default 24. */
    size?: number | string;
    /** Accessible name. When given, the icon is exposed as an image instead of being hidden. */
    title?: string;
    /** Accepted for lucide compatibility and ignored: every icon keeps its drawn weight. */
    strokeWidth?: number | string;
    /** Accepted for lucide compatibility and ignored. */
    absoluteStrokeWidth?: boolean;
    /** Sets the CSS colour (the icon draws in currentColor). */
    color?: string;
}

export type IconComponent = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>>;

/** The stroke every icon is drawn with, in the 24-unit view box. Icons render
 *  exactly as drawn, at every size. */
export const ICON_STROKE_WIDTH = 1.7;

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
                strokeWidth={ICON_STROKE_WIDTH}
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
