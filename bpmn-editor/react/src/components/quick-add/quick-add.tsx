import { useEffect, useState } from 'react';
import { useGraph, usePaper, usePaperScroller, useSelectionCollection, useOnKeyboardEvents } from '@joint/react-plus';
import { stencilPaletteItems } from '../../configs/stencil-config';
import { addElementToSwimlane, findFreeSpotBeside, type Direction } from '../../dnd/elements';
import { ShapePicker, PickerOverlay, type PickerItem } from '../shape-picker/shape-picker';
import { insertSwimlaneIntoPool } from '../../dnd/swimlanes';
import { createShape, getShapeMeta } from '../../shapes/create-shape';
import { Sequence } from '../../shapes/flow/flow-shapes';
import { getPoolParent, getSwimlaneParent, isPool, isSwimlane, prepareLinkReplacement } from '../../utils';

import type { dia, g } from '@joint/plus';
import type { HaloHandle } from '@joint/react-plus';
import type { AppElement, AppLink } from '../../shapes/shapes-typing';

// The gap left between a shape and the one it was added from.
const CONNECT_GAP = 60;

// A stand-in for the shape about to be added, so the list opens clear of
// where it will appear rather than on top of it.
const DROP_HINT_SIZE = { width: 120, height: 80 };

type Rectish = { top: number, left: number, right: number, bottom: number };

// Adding into a lane: the palette's shapes, minus the containers, which
// have their own rules (a pool lands on blank paper, a lane in a pool).
function getPlaceableTypes(graph: dia.Graph): PickerItem[] {
    return stencilPaletteItems
        .filter(({ type }) => {
            const shape = createShape(graph, type);
            return shape.isElement() && !isPool(shape) && !isSwimlane(shape);
        })
        .map(({ type, icon }) => ({
            value: type,
            label: getShapeMeta(graph, type).label,
            icon: <span className="stencil-item-icon" aria-hidden="true">{icon}</span>
        }));
}

// Adding from an element: exactly what the halo offers it. The shapes
// curate these per type — an end event connects to nothing, so it offers
// nothing — which is the same list `validateConnection` would accept.
function getConnectableTypes(graph: dia.Graph, element: AppElement): PickerItem[] {
    const handles: HaloHandle[] = element.getHaloHandles?.() ?? [];

    return handles
        .map((handle) => ({ handle, type: handle.data?.elementType as string | undefined }))
        .filter((entry): entry is { handle: HaloHandle, type: string } => !!entry.type)
        .map(({ handle, type }) => ({
            value: type,
            label: getShapeMeta(graph, type).label,
            icon: handle.content
        }));
}

/**
 * The keyboard counterpart of dragging a shape out of the halo: `cmd+enter`
 * offers what can be added next to the selection and adds it, connected.
 *
 * Renders nothing until it is opened.
 */
export function QuickAdd() {

    const { graph } = useGraph();
    const { paper } = usePaper();
    const { paperScroller } = usePaperScroller();
    const selection = useSelectionCollection();

    const [picker, setPicker] = useState<{
        cell: dia.Cell,
        items: PickerItem[],
        direction: Direction,
        anchor: DOMRect | Rectish,
        // Where a lane drop will land, fixed when the list opens.
        point?: g.PlainPoint
    } | null>(null);

    // Where a shape dropped into the lane goes: the middle of the part of
    // the lane that is on screen.
    const laneDropPoint = (lane: dia.Element) => {
        const laneBBox = lane.getBBox();
        const visible = paperScroller?.getVisibleArea();
        return (visible ? laneBBox.intersect(visible) ?? laneBBox : laneBBox).center();
    };

    // A shape is anchored on its own rect. A lane is not: its rect spans the
    // whole pool, so anchoring there would open the list at the pool's far
    // edge, nowhere near where the shape lands. It anchors to the drop point
    // instead, over a shape-sized box, so the list sits beside the spot.
    const anchorOf = (cell: dia.Cell): DOMRect | Rectish | null => {
        if (!paper) return null;

        if (!isSwimlane(cell)) {
            return paper.findViewByModel(cell)?.el.getBoundingClientRect() ?? null;
        }

        const point = laneDropPoint(cell as dia.Element);
        const { x, y } = paper.localToClientPoint(point.x, point.y);
        const half = { width: DROP_HINT_SIZE.width / 2, height: DROP_HINT_SIZE.height / 2 };

        return { left: x - half.width, right: x + half.width, top: y - half.height, bottom: y + half.height };
    };

    const selected = () => {
        const cells = selection.collection.toArray();
        return cells.length === 1 ? cells[0] : null;
    };

    useOnKeyboardEvents({
        'command+enter ctrl+enter': (evt: dia.Event) => {
            const cell = selected();
            if (!cell || !cell.isElement()) return;

            // A pool's own action is adding a lane — it has no shapes of its
            // own to hold.
            if (isPool(cell)) {
                evt.preventDefault();

                const batchName = 'quick-add-lane';
                graph.startBatch(batchName);
                const swimlane = insertSwimlaneIntoPool(cell);
                graph.stopBatch(batchName);

                selection.collection.reset([swimlane]);
                return;
            }

            const items = isSwimlane(cell)
                ? getPlaceableTypes(graph)
                : getConnectableTypes(graph, cell as AppElement);

            if (items.length === 0) return;

            const anchor = anchorOf(cell);
            if (!anchor) return;

            evt.preventDefault();
            setPicker({
                cell,
                items,
                direction: 'right',
                anchor,
                point: isSwimlane(cell) ? laneDropPoint(cell as dia.Element) : undefined
            });
        },
        // The same, with the side chosen up front — a flow usually runs
        // right, but a branch off a gateway wants down.
        'command+right ctrl+right': (evt: dia.Event) => openTowards(evt, 'right'),
        'command+left ctrl+left': (evt: dia.Event) => openTowards(evt, 'left'),
        'command+down ctrl+down': (evt: dia.Event) => openTowards(evt, 'down'),
        'command+up ctrl+up': (evt: dia.Event) => openTowards(evt, 'up'),
        // Only a lane: for anything else this key draws a link (see
        // `QuickLink`), and a lane cannot be linked.
        'shift+command+enter shift+ctrl+enter': (evt: dia.Event) => {
            const cell = selected();
            if (!cell || !isSwimlane(cell)) return;

            const pool = getPoolParent(cell);
            if (!pool) return;

            evt.preventDefault();

            const lanes = pool.getSwimlanes();
            const index = isSwimlane(cell) ? lanes.indexOf(cell) + 1 : lanes.length;

            const batchName = 'quick-add-lane';
            graph.startBatch(batchName);
            const swimlane = insertSwimlaneIntoPool(pool, index);
            graph.stopBatch(batchName);

            selection.collection.reset([swimlane]);
        }
    });

    // A neighbour towards `direction`. Only shapes have sides worth
    // choosing — a lane holds its shapes wherever they fit, and a pool's
    // action is adding a lane.
    const openTowards = (evt: dia.Event, direction: Direction) => {
        const cell = selected();
        if (!cell || !cell.isElement() || isPool(cell) || isSwimlane(cell)) return;

        const items = getConnectableTypes(graph, cell as AppElement);
        if (items.length === 0) return;

        const anchor = anchorOf(cell);
        if (!anchor) return;

        evt.preventDefault();
        setPicker({ cell, items, direction, anchor });
    };

    // The list is about one cell and one moment: anything else the user
    // starts — a stencil drag, a click on the canvas, a change of selection,
    // or the cell being removed — drops it rather than leaving it hanging.
    useEffect(() => {
        if (!picker) return;

        const close = () => setPicker(null);

        const onPointerDown = (evt: Event) => {
            const target = evt.target as Element | null;
            if (target?.closest?.('.shape-picker')) return;
            close();
        };

        const onSelectionChange = () => {
            const cells = selection.collection.toArray();
            if (cells.length !== 1 || cells[0] !== picker.cell) close();
        };

        const onRemove = (cell: dia.Cell) => {
            if (cell === picker.cell) close();
        };

        document.addEventListener('pointerdown', onPointerDown, true);
        selection.collection.on('add remove reset', onSelectionChange);
        graph.on('remove', onRemove);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            selection.collection.off('add remove reset', onSelectionChange);
            graph.off('remove', onRemove);
        };
    }, [picker, graph, selection]);

    const add = (type: string) => {
        const source = picker?.cell;
        const direction = picker?.direction ?? 'right';
        const point = picker?.point;
        setPicker(null);
        if (!source || !source.isElement()) return;

        const shape = createShape<AppElement>(graph, type);
        const batchName = 'quick-add';

        graph.startBatch(batchName);

        if (isSwimlane(source)) {
            // Exactly where the list said it would go.
            addElementToSwimlane(graph, source, shape, point ?? laneDropPoint(source));
        } else {
            const point = findFreeSpotBeside(graph, source, shape.size(), CONNECT_GAP, direction);
            const lane = getSwimlaneParent(source);

            if (lane) {
                // Not clamped: the spot beside the source is deliberate, and
                // the pool grows if it falls past the lane's edge.
                addElementToSwimlane(graph, lane, shape, point, { clampToLane: false });
            } else {
                shape.position(point.x - shape.size().width / 2, point.y - shape.size().height / 2);
                graph.addCell(shape);
            }

            // Connect it, then let the app resolve the flow type from the
            // endpoints — a sequence flow within a pool, a message flow
            // across two, and so on.
            const link = new Sequence({ source: { id: source.id }, target: { id: shape.id }});
            graph.addCell(link);

            const resolved = prepareLinkReplacement(link as AppLink);
            if (resolved !== link) graph.syncCells([resolved], { async: false });
        }

        graph.stopBatch(batchName);

        selection.collection.reset([shape]);
    };

    if (!picker || !paper) return null;

    // Opened on the side the new shape will appear, so the list points the
    // way the choice goes.
    return (
        <PickerOverlay anchor={picker.anchor} placement={picker.direction}>
            <ShapePicker
                label="Add a shape"
                items={picker.items}
                onPick={add}
                onCancel={() => {
                    setPicker(null);
                    // Back to the shape the list was opened from.
                    const view = paper.findViewByModel(picker.cell);
                    (view?.el as SVGElement | undefined)?.focus?.();
                }}
            />
        </PickerOverlay>
    );
}
