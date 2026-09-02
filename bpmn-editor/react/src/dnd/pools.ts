import { sizePoolToContent } from '../utils';
import { movePoolPreview, removePoolPreview, showPoolPreview } from '../effects/pool-preview';
import { placeDroppedPool } from '../actions/place-pool';

import type { dia } from '@joint/plus';
import type { BpmnPool } from '../shapes/pool/pool-shapes';
import type { EditorEvent } from '../utils';

/**
 * Replaces the dragged pool clone with a preview of where the pool would
 * land. The first pool has to contain the whole diagram, so it is sized to
 * the content before the drag begins; a pool that wraps nothing keeps the
 * clone and drags at its own size.
 */
export function onPoolDragStart(paper: dia.Paper, poolView: dia.ElementView, evt: EditorEvent, _x: number, _y: number) {

    const pool = poolView.model as BpmnPool;

    const content = sizePoolToContent(paper.model, pool);
    if (!content) return;

    evt.data.poolPreview = showPoolPreview(paper, pool, content, evt);

    // The preview stands in for the clone from here on.
    pool.remove();
}

/**
 * Moves the preview with the pointer and remembers where it would drop.
 */
export function onPoolDrag(paper: dia.Paper, _poolView: dia.ElementView, evt: EditorEvent, _x: number, _y: number) {

    const { poolPreview } = evt.data;
    if (!poolPreview) return;

    const at = movePoolPreview(paper, poolPreview, evt);
    if (at) evt.data.poolDropCoordinates = at;
}

/**
 * Removes the pool preview.
 */
export function onPoolDragEnd(_paper: dia.Paper, _poolView: dia.ElementView, evt: EditorEvent, _x: number, _y: number) {
    removePoolPreview(evt.data.poolPreview);
}

/**
 * Places the dropped pool where the preview settled and embeds the diagram
 * content into it.
 */
export function onPoolDrop(paper: dia.Paper, poolView: dia.ElementView, evt: EditorEvent, _x: number, _y: number) {
    placeDroppedPool(paper.model, poolView.model as BpmnPool, evt.data.poolDropCoordinates ?? null);
}
