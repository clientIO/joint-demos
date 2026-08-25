// Responsive frame shared by the table + group inspectors.
//
// Desktop: the right-docked side panel, always visible while a node is selected.
//
// Mobile: selecting a node must NOT swallow the canvas or block moving the node, so the
// panel does not auto-open. Instead a small "Edit <name>" pill floats above the zoom bar;
// tapping it slides the panel up as a BOTTOM SHEET (capped at ~68vh, canvas still visible
// above). The sheet's close collapses back to the pill. Non-modal throughout: the diagram
// stays pannable, and selecting another node just refreshes the sheet/pill.

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function InspectorShell({
    label,
    title,
    children,
}: {
  readonly label: string;
  // Short node name shown on the mobile "Edit" pill.
  readonly title: string;
  readonly children: ReactNode;
}) {
    // Mobile-only: whether the sheet is expanded. Ignored on desktop (the side panel is
    // always up). Local state — resets when the selection clears and this unmounts.
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Mobile pill — the deliberate "open the panel" affordance. Sits above the zoom bar
          so the node stays draggable underneath. Hidden on desktop and while the sheet is open. */}
            {!open ? (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-label={`Edit ${title}`}
                    className="fixed bottom-20 left-1/2 z-50 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
                >
                    <SlidersHorizontal className="size-4" />
                    <span className="max-w-[50vw] truncate">Edit {title}</span>
                </button>
            ) : null}

            <aside
                aria-label={label}
                className={cn(
                    'flex-col overflow-hidden border-border bg-background',
                    // Desktop: an ABSOLUTE overlay docked to the right edge, floating ON TOP of the
                    // canvas (opaque + a soft left shadow) rather than a flex sibling. Selecting a
                    // cell then opens the panel WITHOUT resizing the canvas, so the diagram never
                    // shifts/jumps under the cursor. It covers the right strip of the canvas by
                    // design — the schema stays put.
                    'lg:absolute lg:inset-y-0 lg:right-0 lg:z-30 lg:flex lg:w-80 lg:max-w-[80vw] lg:border-l',
                    'lg:max-h-none lg:rounded-none lg:border-t-0 lg:animate-none lg:shadow-[-10px_0_30px_-15px_rgb(0_0_0/0.5)]',
                    // Mobile: a bottom sheet, only mounted-visible while expanded.
                    open
                        ? 'fixed inset-x-0 bottom-0 z-50 flex max-h-[68vh] rounded-t-2xl border-t shadow-[0_-8px_30px_-12px] shadow-black/40 motion-safe:animate-[sheet-up_0.22s_cubic-bezier(0.22,1,0.36,1)]'
                        : 'hidden lg:flex',
                )}
            >
                {/* Mobile grab handle. */}
                <span aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border lg:hidden" />
                {/* Collapse the sheet back to the pill (44px target). */}
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close inspector"
                    className="absolute right-2 top-2 z-10 grid size-11 place-items-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
                >
                    <X className="size-5" />
                </button>
                {children}
            </aside>
        </>
    );
}
