import React from 'react';

export interface SwitchProps
    extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'role' | 'aria-checked' | 'children'> {
    checked: boolean;
    onChange: (checked: boolean) => void;
}

/** Flat 52×32 switch (.switch in index.css). Label it with aria-labelledby
 *  pointing at the row's title, or with aria-label. */
export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
    { checked, onChange, onClick, disabled, className, type = 'button', ...rest },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            className={className ? `switch ${className}` : 'switch'}
            onClick={(e) => {
                onClick?.(e);
                if (!e.defaultPrevented) onChange(!checked);
            }}
            {...rest}
        >
            <span className="switch-thumb" aria-hidden="true" />
        </button>
    );
});

export default Switch;
