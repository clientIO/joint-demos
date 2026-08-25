// The single immutable write path for a table card. Every header/row edit funnels
// through here: guard that the cell is an element carrying table data, map the
// Table, and write it back on `data.table` via the React `setCell` updater form.
//
// WHY centralize: each edit is otherwise the same three-line guard + spread. One
// place keeps the discriminated-union narrowing correct (no `as`, no `!`) and
// lets header / column-row stay lean.

import type { CellId, ElementRecord, GraphApi } from '@joint/react-plus';
import { isTableCell, type SwatchKey, type TableCellData } from '@/model/cell-data';
import type { Table } from '@/schema/types';

// The `useGraph` api specialised to table cells — pass it down from TableCard so
// header and rows don't each re-open the hook.
export type TableGraph = GraphApi<ElementRecord<TableCellData>>;

export function updateTable(api: TableGraph, id: CellId, map: (table: Table) => Table): void {
    api.setCell(id, (previous) => {
        if (!api.isElement(previous)) return previous;
        const { data } = previous;
        if (!isTableCell(data)) return previous;
        return { ...previous, data: { ...data, table: map(data.table) }};
    });
}

// Set the presentation-only background tint on a table cell (leaves the domain
// Table untouched — colors aren't part of the SQL model).
export function setTableFill(api: TableGraph, id: CellId, fill: SwatchKey): void {
    api.setCell(id, (previous) => {
        if (!api.isElement(previous)) return previous;
        const { data } = previous;
        if (!isTableCell(data)) return previous;
        return { ...previous, data: { ...data, fill }};
    });
}
