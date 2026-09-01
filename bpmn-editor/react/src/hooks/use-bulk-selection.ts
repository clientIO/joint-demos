import { useCells, useGraph, useSelectionCollection } from '@joint/react-plus';

import type { BpmnElement, BpmnLink } from '../shapes/shapes-typing';

/**
 * The selected cells, split into the two kinds that can be edited as a group:
 * shapes and connectors.
 *
 * They are kept apart rather than merged because the same role means a
 * different thing on each — a shape's `fill` is its body, where a connector has
 * only a line — so the inspector offers a section per kind, and a colour picked
 * in one leaves the other alone.
 *
 * Separate from `useSelectedCell()`, which several widgets rely on returning
 * `null` for anything but a single cell.
 */
export function useBulkSelection(): { elements: BpmnElement[], links: BpmnLink[] } {

    const { graph } = useGraph();
    const { collection } = useSelectionCollection();

    // Membership only: the default comparator is array-aware, so this stays
    // stable while the same cells are selected and re-renders when that
    // changes — not on every drag of a selected shape. What the cells are
    // *painted* with is subscribed where it is shown (`BulkAppearanceForm`).
    const ids = useCells(collection, (cells) => cells.map((cell) => cell.id));

    // A cell can be removed while it is still in the selection.
    const cells = ids.map((id) => graph.getCell(id)).filter(Boolean);

    return {
        elements: cells.filter((cell) => cell.isElement()) as BpmnElement[],
        links: cells.filter((cell) => cell.isLink()) as BpmnLink[]
    };
}
