import { useGraph, usePaperScroller, useSelectionCollection, useStencil } from '@joint/react-plus';
import { stencilPaletteItems, type StencilPaletteItem } from '../../configs/stencil-config';
import { dropPoolAt } from '../../dnd/pools';
import { insertSwimlaneIntoPool } from '../../dnd/swimlanes';
import { isPool, isSwimlane } from '../../utils';
import { Tip } from '../tooltip/tooltip';

import type { KeyboardEvent, PointerEvent } from 'react';

/**
 * One palette button rendering the shape icon (icon font).
 */
function PaletteItem({ type, icon }: StencilPaletteItem) {
    const { graph } = useGraph();
    const { startCellDrag } = useStencil();
    const { paperScroller } = usePaperScroller();
    const { collection: selectionCollection } = useSelectionCollection();

    const shapeConstructor = graph.getTypeConstructor(type)!;
    const label = (shapeConstructor as unknown as { label?: string }).label ?? type;

    const onPointerDown = (evt: PointerEvent) => {
        startCellDrag(new shapeConstructor(), evt);
    };

    // Keyboard alternative to the pointer drag (WCAG 2.1.1): Enter/Space
    // places the shape at the center of the visible paper area and selects
    // it, so it can be styled and moved right away. Pools and swimlanes go
    // through the same semantics as a pointer drop (a pool always gets its
    // first lane and wraps the content; a lane only exists inside a pool).
    const onKeyDown = (evt: KeyboardEvent) => {
        if (evt.key !== 'Enter' && evt.key !== ' ') return;
        evt.preventDefault();
        // A held key auto-repeats keydown — one shape per press.
        if (evt.repeat) return;

        const shape = new shapeConstructor();
        if (!shape.isElement()) return;

        // Placing a pool or a lane touches several cells — the pool, its
        // mandatory first lane, the content it wraps, the lanes the pool
        // lays out again — so it goes in one batch and undoes in one step,
        // as the pointer drop already does (the stencil batches that one).
        const batchName = 'stencil-keyboard-drop';

        if (isSwimlane(shape)) {
            const pool = graph.getElements().find(isPool);
            if (!pool) return;

            graph.startBatch(batchName);
            const swimlane = insertSwimlaneIntoPool(pool);
            graph.stopBatch(batchName);

            selectionCollection.reset([swimlane]);
            return;
        }

        const center = paperScroller?.getVisibleArea().center();
        const { width, height } = shape.size();
        const x = (center?.x ?? width / 2) - width / 2;
        const y = (center?.y ?? height / 2) - height / 2;

        graph.startBatch(batchName);
        if (isPool(shape)) {
            dropPoolAt(graph, shape, x, y);
        } else {
            shape.position(x, y);
            graph.addCell(shape);
        }
        graph.stopBatch(batchName);

        selectionCollection.reset([shape]);
    };

    return (
        <Tip label={label} side="right">
            <button
                type="button"
                className="stencil-item"
                aria-label={label}
                onPointerDown={onPointerDown}
                onKeyDown={onKeyDown}
            >
                <span className="stencil-item-icon" aria-hidden="true">{icon}</span>
            </button>
        </Tip>
    );
}

/**
 * The stencil buttons — pointer-down starts a stencil drag with a freshly
 * constructed shape.
 */
export function BpmnPalette() {
    return (
        <div className="stencil-palette">
            {stencilPaletteItems.map((item) => (
                <PaletteItem key={item.type} {...item} />
            ))}
        </div>
    );
}
