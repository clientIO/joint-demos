import { useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';

import type { ReactNode } from 'react';
import './tooltip.css';

/**
 * App-wide tooltip provider (mount once at the root).
 */
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

/**
 * Tooltip wrapper: `children` must be a single focusable element.
 *
 * The content is portaled next to the trigger (not to `<body>`), so an open
 * tooltip stays inside the trigger's landmark — content portaled to the body
 * sits outside all landmarks (axe `region`, e.g. while a focused control
 * shows its tooltip). Positioning is unaffected: the popper wrapper is
 * `position: fixed`, so ancestor overflow does not clip it — unless an
 * ancestor with a `transform` (e.g. the stencil's translateY) also gets an
 * overflow clip, which would make it the wrapper's containing block; none
 * of the current containers clip.
 */
export function Tip({ label, side = 'top', children }: TipProps) {
    const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);

    return (
        <Tooltip.Root>
            <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
            <span ref={setAnchor} hidden />
            <Tooltip.Portal container={anchor?.parentElement}>
                <Tooltip.Content className="tooltip" side={side} sideOffset={6}>
                    {label}
                    <Tooltip.Arrow className="tooltip-arrow" width={12} height={6} />
                </Tooltip.Content>
            </Tooltip.Portal>
        </Tooltip.Root>
    );
}
