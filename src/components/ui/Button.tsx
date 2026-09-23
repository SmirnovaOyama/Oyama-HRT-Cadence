import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'plain' | 'destructive' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** primary: filled, one per region. secondary: tinted, no border.
     *  plain / destructive: text only. icon: 44×44, give it an aria-label. */
    variant?: ButtonVariant;
    /** 44px tall instead of 50px, for cards, sidebars and inline pairs. */
    compact?: boolean;
    /** Full width. Only for the single main action of a screen or sheet. */
    block?: boolean;
    /** Secondary on a tinted surface (plate, the desktop rail): white fill. */
    onTint?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    plain: 'btn-plain',
    destructive: 'btn-destructive',
    icon: 'btn-icon',
};

/** Apple-style button over the .btn-* classes in index.css. Pass icons as
 *  children (20px beside a primary label, 22px alone in an icon button). */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    { variant = 'primary', compact = false, block = false, onTint = false, type = 'button', className, ...rest },
    ref,
) {
    const classes = [
        VARIANT_CLASS[variant],
        compact && 'btn-compact',
        block && 'btn-block',
        onTint && variant === 'secondary' && 'btn-on-tint',
        className,
    ].filter(Boolean).join(' ');

    return <button ref={ref} type={type} className={classes} {...rest} />;
});

export default Button;
