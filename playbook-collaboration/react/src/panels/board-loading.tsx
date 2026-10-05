import { SYNC_MODE, useStore } from '@/state/store';

/**
 * Between opening a board and the room's document arriving there is nothing
 * to draw yet. Say so, rather than show an empty canvas: the wait is the
 * connection plus the storage download, a few seconds on a cold room.
 */
export function BoardLoading() {
    const board = useStore((state) => state.board);
    const status = useStore((state) => state.liveblocks.status);
    const isStorageLoading = useStore((state) => state.liveblocks.isStorageLoading);
    if (board === null || SYNC_MODE !== 'liveblocks') return null;
    // Only the first arrival covers the board; a reconnect later on keeps the
    // canvas in view.
    const isArriving = status === 'initial' || status === 'connecting' || isStorageLoading;
    if (!isArriving) return null;
    return (
        <div
            className="absolute inset-0 z-20 flex items-center justify-center"
            style={{ background: 'color-mix(in oklch, var(--paper) 78%, transparent)' }}
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-3 rounded-xl border border-edge bg-panel px-4 py-3 text-[13px] font-semibold text-ink shadow-plate">
                <span
                    className="size-5 animate-spin rounded-full border-2 border-edge border-t-accent motion-reduce:animate-none"
                    aria-hidden
                />
        Joining the board…
            </div>
        </div>
    );
}
