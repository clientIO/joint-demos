// Radix tooltip, themed. Icon-only controls MUST wrap in one (the visible
// label a sighted user is otherwise missing).

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

export function TooltipProvider({ children }: { readonly children: ReactNode }) {
    return <TooltipPrimitive.Provider delayDuration={350}>{children}</TooltipPrimitive.Provider>;
}

export function Tooltip({ label, children }: { readonly label: string; readonly children: ReactNode }) {
    return (
        <TooltipPrimitive.Root>
            <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                    sideOffset={6}
                    className="chamfer-panel chamfer-frame [--frame-chamfer:var(--chamfer-panel)] z-50 bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md"
                >
                    {label}
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    );
}
