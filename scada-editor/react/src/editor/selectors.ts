import type { CellId, CellRecord, Computed } from '@joint/react-plus';

/** Whether two id lists hold the same ids in the same order. */
export const isSameIds = (a: readonly CellId[], b: readonly CellId[]): boolean =>
    a.length === b.length && a.every((id, index) => id === b[index]);

/** Selects a cell's `data`. */
export const selectData = (cell: Computed<CellRecord>): unknown => cell.data;
