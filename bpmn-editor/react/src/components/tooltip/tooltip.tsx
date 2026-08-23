import * as Tooltip from '@radix-ui/react-tooltip';

import type { ReactNode } from 'react';
import './tooltip.css';

// App-wide tooltip provider (mount once at the root).
export function TipProvider({ children }: { children: ReactNode }) {
    return (
        <Tooltip.Provider delayDuration={250} skipDelayDuration={300}>
            {children}
        </Tooltip.Provider>
    );
}

interface TipProps {
    label: string;
    side?: 'top' | 'bottom' | 'left' | 'right';
    children: ReactNode;
}

// Tooltip wrapper: `children` must be a single focusable element.
export function Tip({ label, side = 'top', children }: TipProps) {
    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
            <Tooltip.Portal>
                <Tooltip.Content className="tooltip" side={side} sideOffset={6}>
                    {label}
                    <Tooltip.Arrow className="tooltip-arrow" width={12} height={6} />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}
