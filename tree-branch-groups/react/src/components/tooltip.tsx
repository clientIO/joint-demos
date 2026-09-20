import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { useTooltip } from './use-tooltip';

interface TipButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** The tooltip, and the accessible name. */
    tip: string;
    children: ReactNode;
}

/** A button with a tooltip. */
export function TipButton({ tip, children, ...props }: TipButtonProps): ReactNode {
    const ref = useTooltip<HTMLButtonElement>(tip);
    return (
        <button ref={ref} type="button" aria-label={tip} {...props}>
            {children}
        </button>
    );
}
