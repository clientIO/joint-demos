import { useCells, useGraph, useSelectionCollection } from '@joint/react-plus';

import type { dia } from '@joint/plus';

// The single selected cell, or `null` when nothing or multiple cells are
// selected.
export function useSelectedCell(): dia.Cell | null {
    const { graph } = useGraph();
    const { collection } = useSelectionCollection();

    return useCells(collection, (cells) =>
        cells.length !== 1 ? null : graph.getCell(cells[0].id) ?? null
    );
}
