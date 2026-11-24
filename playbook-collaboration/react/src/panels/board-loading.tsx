/**
 * Shown while the room connects and its storage downloads, so nobody stares at
 * an empty canvas for the few seconds a cold room takes.
 */

/** The "joining the board" overlay. */
export function BoardLoading() {
    return (
        <div className="flex flex-1 items-center justify-center" role="status" aria-live="polite">
            <div className="flex items-center gap-3 rounded-xl border border-edge bg-panel px-4 py-3 text-[13px] font-semibold text-ink shadow-plate">
                <span
                    className="size-5 animate-spin rounded-full border-2 border-edge border-t-accent motion-reduce:animate-none"
                    aria-hidden
                />
                Joining the board...
            </div>
        </div>
    );
}
