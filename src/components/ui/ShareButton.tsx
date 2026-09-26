import React from 'react';
import { Button } from './Button';
import { Share } from '../icons';

/** Quiet header action with a 36px capsule and a 44px touch target. */
export function ShareButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return <Button
        {...props}
        variant="secondary"
        compact
        className="relative my-1 min-h-[36px] px-4 text-sm before:absolute before:inset-x-0 before:top-1/2 before:h-[44px] before:-translate-y-1/2 before:content-['']"
    ><Share size={17} /><span>{children}</span></Button>;
}
