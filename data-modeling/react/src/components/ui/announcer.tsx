// Screen-reader narration + a matching visible toast for canvas actions: every
// `announce` speaks through a polite live region (opaque to assistive tech) AND
// surfaces a brief pill so sighted users see the same feedback. Wrap once with
// <AnnouncerProvider>, then call `useAnnounce` anywhere below it.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnnouncerContext, type Announce } from './announcer-context';

// How long a toast stays before it fades out.
const TOAST_MS = 3200;

interface Toast {
  readonly message: string;
  // Bumped per announcement so the same text re-toasts and the enter animation replays.
  readonly id: number;
}

export function AnnouncerProvider({ children }: { readonly children: ReactNode }) {
    // Two alternating live regions. Each announcement writes into the idle region
    // (its text goes ""→message, which a live region speaks) and clears the other,
    // so even the SAME message twice is re-announced — without deferring the set.
    const [regions, setRegions] = useState<readonly [string, string]>(['', '']);
    const slotRef = useRef<0 | 1>(0);
    const [toast, setToast] = useState<Toast | null>(null);
    const toastIdRef = useRef(0);

    const announce = useCallback<Announce>((next) => {
        const slot = slotRef.current;
        slotRef.current = slot === 0 ? 1 : 0;
        setRegions(slot === 0 ? [next, ''] : ['', next]);
        toastIdRef.current += 1;
        setToast({ message: next, id: toastIdRef.current });
    }, []);

    // Auto-dismiss: the timer restarts whenever a new toast replaces the current one
    // (effect re-runs on the changed `toast`), and clears on unmount — no leak.
    useEffect(() => {
        if (!toast) return;
        const timer = window.setTimeout(() => setToast(null), TOAST_MS);
        return () => clearTimeout(timer);
    }, [toast]);

    return (
        <AnnouncerContext.Provider value={announce}>
            {children}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {regions[0]}
            </div>
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {regions[1]}
            </div>
            {/* Visible echo of the announcement. aria-hidden — the live regions above own a11y.
          Top-center, just under the toolbar. pointer-events-none so it never intercepts
          canvas clicks; sits below modals (z-40). */}
            {toast ? (
                <div
                    aria-hidden
                    className="pointer-events-none fixed inset-x-0 top-14 z-40 flex justify-center px-4"
                >
                    <div
                        key={toast.id}
                        className="flex max-w-sm items-center gap-2.5 text-balance rounded-full border border-border bg-popover px-4 py-2 text-sm font-medium text-popover-foreground node-elevation animate-toast-in motion-reduce:animate-none"
                    >
                        <span className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--color-primary)_22%,transparent)]" />
                        {toast.message}
                    </div>
                </div>
            ) : null}
        </AnnouncerContext.Provider>
    );
}
