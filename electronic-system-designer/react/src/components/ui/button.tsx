// The one button vocabulary of the app — chamfered corners (the brand cut),
// four intents, two sizes. Every clickable in the chrome goes through this so
// the surface stays consistent.

import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const VARIANT = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',
    ghost: 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
    // chamfer-frame, not `border`: a rectangular border loses its corners under
    // the chamfer clip — the frame overlay follows the cut.
    outline: 'chamfer-frame text-foreground hover:bg-accent',
    danger: 'text-destructive hover:bg-destructive/10',
} as const;

const SIZE = {
    sm: 'h-8 px-3',
    // Smaller cut on icon-only buttons so the chamfer stays proportional.
    icon: 'size-8 [--chamfer:7px]',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: keyof typeof VARIANT;
  readonly size?: keyof typeof SIZE;
}

export function Button({ variant = 'ghost', size = 'sm', className, type, ...props }: ButtonProps) {
    return (
        <button
            type={type ?? 'button'}
            className={cn(
                'chamfer inline-flex select-none items-center justify-center gap-1.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-45',
                VARIANT[variant],
                SIZE[size],
                className,
            )}
            {...props}
        />
    );
}
