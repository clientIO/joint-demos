/**
 * The rectangle being dragged, as an element.
 *
 * It is drawn by the same renderer as a placed rectangle, so the preview and
 * the thing it becomes cannot drift apart — but it is not an edit, and it must
 * not reach the undo stack. Sixty adds and moves per second of dragging would
 * bury the placement they lead to.
 *
 * `{ skipHistory: true }` on the write is what keeps it off: the graph and the
 * papers see it, the `dia.CommandManager` behind `<Diagram history>` does not.
 */
import { useEffect, useRef } from 'react';
import { useGraph } from '@joint/react-plus';
import type { Rect } from '@/puzzle/types';
import { buildRegionCell, PENDING_ID, type BoardElement } from './cells';

/** Keeps the write off the undo stack. */
const SKIP_HISTORY = { skipHistory: true };

/**
 * The rectangle currently being dragged out.
 *
 * `color` is the palette index it would be given, already resolved against its
 * neighbors, or `null` when the rectangle cannot be placed — so what the player
 * sees during the drag is exactly what commits, and a rejected drag is red.
 */
export interface PendingRect {
    readonly rect: Rect;
    readonly color: number | null;
}

/** Everything about the preview a redraw would have to notice. */
function signature(pending: PendingRect | null): string {
    if (!pending) return '';
    const { rect, color } = pending;
    return `${rect.x}|${rect.y}|${rect.w}|${rect.h}|${color}`;
}

export function usePendingCell(pending: PendingRect | null): void {
    const { setCell, removeCells } = useGraph<BoardElement>();
    const drawn = useRef('');

    useEffect(() => {
        const stamp = signature(pending);
        if (stamp === drawn.current) return;
        drawn.current = stamp;

        if (!pending) {
            removeCells([PENDING_ID], SKIP_HISTORY);
            return;
        }
        const rejected = pending.color === null;
        setCell(
            buildRegionCell({
                id: PENDING_ID,
                rect: pending.rect,
                color: pending.color ?? 0,
                pending: true,
                rejected,
            }),
            SKIP_HISTORY
        );
    }, [pending, setCell, removeCells]);
}
