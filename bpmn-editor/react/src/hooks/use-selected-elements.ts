import { useCells, useGraph, useSelectionCollection } from '@joint/react-plus';
import type { AppElement } from '../shapes/shapes-typing';

/**
 * The selected shapes that can be edited together, and how many cells are
 * selected in total — the difference is what lets the inspector say it is
 * acting on two of three.
 *
 * Every element qualifies, pools and lanes included: a pool wears its colour
 * on its header, since its lanes cover its body (see `poolAppearanceConfig`).
 * Links stay out, having a line where an element has a fill, and are still
 * edited on their own.
 *
 * Separate from `useSelectedCell()`, which several widgets rely on returning
 * `null` for anything but a single cell.
 */
export function useSelectedElements(): { elements: AppElement[], selected: number } {

    const { graph } = useGraph();
    const { collection } = useSelectionCollection();

    // Membership only: the default comparator is array-aware, so this stays
    // stable while the same cells are selected and re-renders when that
    // changes — not on every drag of a selected shape. What the shapes are
    // *painted* with is subscribed where it is shown (`BulkAppearanceForm`).
    const ids = useCells(collection, (cells) => cells.map((cell) => cell.id));

    const elements = ids
        .map((id) => graph.getCell(id))
        // A cell can be removed while it is still in the selection.
        .filter((cell): cell is AppElement => !!cell && cell.isElement());

    return { elements, selected: ids.length };
}
