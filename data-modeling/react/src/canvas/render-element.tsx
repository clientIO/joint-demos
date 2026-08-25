// The element dispatcher: <Paper renderElement> hands us a cell's typed `data`,
// and we pick the card by its `kind` discriminant. Each branch is a thin
// component owned by a sibling file. TableCard is prop-driven; GroupElement and
// NoteCard read their own cell from context, so they take no props here.

import type { RenderElement } from '@joint/react-plus';
import { isGroupCell, isNoteCell, isTableCell, type ElementCellData } from '../model/cell-data';
import { TableCard } from './table-card';
import { GroupElement } from './group-element';
import { NoteCard } from './note-card';

export const renderElement: RenderElement<ElementCellData> = (data) => {
    // Dispatch by the data's `kind` discriminant. Every branch is matched EXPLICITLY (no
    // "else = note" fallthrough): during a controlled-cells teardown the paper can re-render
    // a removed cell's portal with stale/empty data — unrecognized data renders nothing.
    // No error boundary needed: `useCell` holds the last value it resolved for a cell
    // being removed under controlled cells (the library covers that removal window with
    // its own regression test), so mounted cards never throw during a replace/Clear.
    if (isTableCell(data)) return <TableCard table={data.table} />;
    if (isGroupCell(data)) return <GroupElement />;
    if (isNoteCell(data)) return <NoteCard />;
    return null;
};
