import { useGraph, usePaperScroller, useSelectionCollection, useStencil } from '@joint/react-plus';
import { stencilPaletteItems, type StencilPaletteItem } from '../../configs/stencil-config';
import { dropPoolAt } from '../../dnd/pools';
import { insertSwimlaneIntoPool } from '../../dnd/swimlanes';
import { addElementToSwimlane } from '../../dnd/elements';
import { createShape, getShapeMeta } from '../../shapes/create-shape';
import { isPool, isSwimlane } from '../../utils';
import { useTargetAim, isAimKey, type AimKind } from '../../hooks/use-target-aim';
import { Tip } from '../tooltip/tooltip';

import type { KeyboardEvent, PointerEvent, FocusEvent } from 'react';
import type { dia } from '@joint/plus';
import type { BpmnElement, BpmnShape } from '../../shapes/shapes-typing';

// How far one arrow key pans while a pool item has the focus — a pool lands
// on blank paper, so there is nothing to step through.
const SCROLL_STEP = 100;
const PAN_KEYS: Record<string, { x: number, y: number }> = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 }
};

/**
 * Whether this shape has anywhere to aim. A pool lands on blank paper, and
 * a group is never embedded — it is an artifact and may span pools by
 * design — so neither points at a lane.
 */
function aimsAtSomething(graph: dia.Graph, shape: BpmnShape) {
    if (!shape.isElement() || isPool(shape)) return false;
    if (isSwimlane(shape)) return true;

    const lane = graph.getElements().find(isSwimlane);
    return !lane || (shape as BpmnElement).validateEmbedding?.(lane) !== false;
}

/**
 * The shape palette. Besides the pointer drag it is operable from the
 * keyboard: the arrows aim at a pool or a lane — highlighted on the canvas
 * with the same effects a drag shows — and Enter drops the shape there.
 *
 * The aiming itself is `useTargetAim()`; this wires it to the buttons.
 */
export function BpmnPalette() {

    const { graph } = useGraph();
    const { collection: selectionCollection } = useSelectionCollection();
    const aim = useTargetAim();

    // Aims at where the shape would land. Nothing to do where the shape has
    // nowhere to aim — a pool lands on blank paper.
    const beginAim = (type: string) => {
        const shape = createShape(graph, type);

        if (!aimsAtSomething(graph, shape)) {
            aim.end();
            return;
        }

        const kind: AimKind = isSwimlane(shape) ? 'insert' : 'lane';
        aim.begin(kind);
    };

    const onFocus = (evt: FocusEvent<HTMLDivElement>) => {
        const type = evt.target.dataset.shapeType;
        if (!type) return;

        // Only for a keyboard focus. A click leaves no focus ring, so aiming
        // from one would highlight a lane with nothing to say why — and the
        // pointer has the drag for this, with its own highlighting. The
        // keyboard path picks the aim up on the first key instead (`onKeyDown`
        // below), so clicking then pressing an arrow still works.
        if (!evt.target.matches(':focus-visible')) return;

        beginAim(type);
    };

    const onBlur = (evt: FocusEvent<HTMLDivElement>) => {
        // Tabbing between the palette's own buttons keeps the aim.
        if (evt.currentTarget.contains(evt.relatedTarget)) return;
        aim.end();
    };

    const target = aim.target;

    return (
        <div className="stencil-palette" onFocus={onFocus} onBlur={onBlur}>
            {stencilPaletteItems.map((item) => (
                <PaletteItem
                    key={item.type}
                    {...item}
                    target={target}
                    targetName={aim.name}
                    onStep={aim.step}
                    onBeginAim={beginAim}
                    selection={selectionCollection}
                />
            ))}
        </div>
    );
}

interface PaletteItemProps extends StencilPaletteItem {
    target: ReturnType<typeof useTargetAim>['target'];
    targetName: string | null;
    onStep: (key: string) => boolean;
    onBeginAim: (type: string) => void;
    selection: ReturnType<typeof useSelectionCollection>['collection'];
}

/**
 * One palette button rendering the shape icon (icon font).
 */
function PaletteItem({ type, icon, target, targetName, onStep, onBeginAim, selection: selectionCollection }: PaletteItemProps) {

    const { graph } = useGraph();
    const { startCellDrag } = useStencil();
    const { paperScroller } = usePaperScroller();

    const { label } = getShapeMeta(graph, type);

    const onPointerDown = (evt: PointerEvent) => {
        startCellDrag(createShape(graph, type), evt);
    };

    // Keyboard alternative to the pointer drag (WCAG 2.1.1): the arrows aim
    // at a pool or a lane and Enter/Space drops the shape into it, so the
    // result matches what a pointer drop on that lane would have produced.
    const onKeyDown = (evt: KeyboardEvent) => {

        const shape = createShape(graph, type);
        if (!shape.isElement()) return;

        // `cmd+arrow` adds a neighbour on the canvas — the palette's plain
        // arrows are a different thing and should not answer to it.
        const modified = evt.metaKey || evt.ctrlKey || evt.altKey;

        // Focus alone no longer starts the aim, since a click gives no ring to
        // explain it. The first key does: whether the button was reached by
        // `tab` or by clicking it, this is where the keyboard takes over.
        if (!modified && (isAimKey(evt.key) || evt.key === 'Enter' || evt.key === ' ')) {
            if (!target) onBeginAim(type);
        }

        if (!modified && isAimKey(evt.key)) {
            evt.preventDefault();

            // A pool has no target to step through, so the arrows pan.
            if (!isPool(shape)) {
                onStep(evt.key);
                return;
            }

            const center = paperScroller?.getVisibleArea().center();
            if (!paperScroller || !center) return;

            const distance = SCROLL_STEP / paperScroller.zoom();
            const towards = PAN_KEYS[evt.key];
            paperScroller.scroll(center.x + towards.x * distance, center.y + towards.y * distance);
            return;
        }

        if (evt.key !== 'Enter' && evt.key !== ' ') return;
        evt.preventDefault();
        // A held key auto-repeats keydown — one shape per press.
        if (evt.repeat) return;

        // Placing a pool or a lane touches several cells — the pool, its
        // mandatory first lane, the content it wraps, the lanes the pool
        // lays out again — so it goes in one batch and undoes in one step,
        // as the pointer drop already does (the stencil batches that one).
        const batchName = 'stencil-keyboard-drop';

        const pool = target?.pool ?? null;
        const lane = target?.kind === 'lane' ? target.lane : null;

        if (isSwimlane(shape)) {
            if (!pool || target?.kind !== 'insert' || target.index === null) return;

            graph.startBatch(batchName);
            // At the aimed position, which is what the preview line showed.
            const swimlane = insertSwimlaneIntoPool(pool, target.index);
            graph.stopBatch(batchName);

            selectionCollection.reset([swimlane]);
            return;
        }

        // Everything below places the shape relative to what is on screen.
        const visible = paperScroller?.getVisibleArea();
        if (!visible) return;

        const { width, height } = shape.size();
        const center = visible.center();

        graph.startBatch(batchName);

        if (isPool(shape)) {
            dropPoolAt(graph, shape, center.x - width / 2, center.y - height / 2);
        } else if (lane && isSwimlane(lane)) {
            // Into the part of the aimed-at lane that is on screen, so the
            // shape lands where the user is looking. The helper decides
            // whether it is embedded — a group never is.
            const laneBBox = lane.getBBox();
            const point = (laneBBox.intersect(visible) ?? laneBBox).center();

            addElementToSwimlane(graph, lane, shape, point);
        } else {
            // No lanes in the diagram at all — the shape goes on blank paper.
            shape.position(center.x - width / 2, center.y - height / 2);
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
                data-shape-type={type}
                aria-label={label}
                // The highlight is visual only; the target is named here so
                // it is announced with the button on focus.
                aria-describedby={targetName ? `stencil-target-${type}` : undefined}
                onPointerDown={onPointerDown}
                onKeyDown={onKeyDown}
            >
                <span className="stencil-item-icon" aria-hidden="true">{icon}</span>
                {targetName && (
                    <span id={`stencil-target-${type}`} className="sr-only">
                        Adds to {targetName}
                    </span>
                )}
            </button>
        </Tip>
    );
}
