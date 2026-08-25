// The ERD table element: an HTMLBox card showing a table's name (header) and its
// columns (one magnet row each), with a footer that reports the column count and
// offers a quiet "add column" affordance.
//
// The card is MODEL-SIZED (`useModelGeometry`): the graph element's size drives
// the card. A SELECTED table mounts a FreeTransform (same affordance as groups and
// notes), so a table drawn at a custom size can be resized later too. Adding a
// column still auto-GROWS the card to fit (grow-only, so it never shrinks under a
// manual size), and the columns area scrolls if the content exceeds the height.

import { useState } from 'react';
import {
    FreeTransform,
    HTMLBox,
    selectElementData,
    useCell,
    useCellId,
    useGraph,
    useIsCellSelected,
    type ElementRecord,
} from '@joint/react-plus';
import { Columns3, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { isTableCell, type ElementCellData, type TableCellData } from '@/model/cell-data';
import { surfaceClass } from '@/appearance/swatches';
import { TABLE_WIDTH, estimateTableHeight } from '@/model/layout';
import { newId } from '@/schema/id';
import type { Column, Table } from '@/schema/types';
import { TableHeader } from '@/canvas/table-header';
import { TableColumnRow } from '@/canvas/table-column-row';

interface TableCardProps {
  readonly table: Table;
}

// Strip the default jj-box chrome (padding / border / background) so the inner
// card div owns every visual — otherwise the box border would double our own and
// its clip would swallow the node-elevation shadow.
const HOST_STYLE: React.CSSProperties = {
    padding: 0,
    border: 'none',
    background: 'transparent',
    borderRadius: 0,
    overflow: 'visible',
};

function newColumn(): Column {
    return {
        id: newId('col'),
        name: 'new_column',
        type: { kind: 'text' },
        nullable: true,
        primaryKey: false,
        unique: false,
    };
}

export function TableCard({ table }: TableCardProps) {
    const id = useCellId();
    const graph = useGraph<ElementRecord<TableCellData>>();
    const selected = useIsCellSelected();
    // Presentation-only background tint (chosen in the inspector's Appearance).
    const data = useCell(selectElementData<ElementCellData>);
    const fill = isTableCell(data) ? data.fill : undefined;

    // Column ids that participate in any index — drives the per-row "indexed" dot.
    const indexedIds = new Set(table.indexes.flatMap((index) => index.columnIds));
    const count = table.columns.length;

    // The just-added column opens straight into name-edit mode, so the user can type the
    // name immediately (its row seeds its edit draft from this on mount).
    const [editColumnId, setEditColumnId] = useState<string | null>(null);

    // Add a column AND grow the model-sized card to fit it — in ONE setCell so the
    // two changes don't race (two separate setCell calls on the same id conflict, and
    // the size one was being dropped). Grow-only via Math.max, so it never shrinks.
    function addColumn(): void {
        const column = newColumn();
        graph.setCell(id, (previous) => {
            if (!graph.isElement(previous) || !isTableCell(previous.data)) return previous;
            const columns = [...previous.data.table.columns, column];
            const height = Math.max(previous.size?.height ?? 0, estimateTableHeight(columns.length));
            return {
                ...previous,
                size: { width: previous.size?.width ?? TABLE_WIDTH, height },
                data: { ...previous.data, table: { ...previous.data.table, columns }},
            };
        });
        setEditColumnId(column.id);
    }

    return (
        <>
            {/* Resize handles while selected — the same affordance groups and notes have.
          Width never drops under the seed width (rows stay readable); height can
          shrink to roughly a one-column card, the columns area scrolls below that. */}
            {selected ? (
                <FreeTransform
                    allowRotation={false}
                    minWidth={TABLE_WIDTH}
                    minHeight={estimateTableHeight(1)}
                />
            ) : null}
            <HTMLBox style={HOST_STYLE} useModelGeometry>
                <div
                    // Stable hook for the group-membership ring (scoped by [model-id]).
                    data-node-card
                    // A diagram node: `role="application"` puts AT into pass-through mode so the
                    // card's own keys (arrow-nudge, Enter/Delete) reach it, and the roledescription
                    // has the screen reader announce "diagram node" instead of a generic group.
                    role="application"
                    aria-roledescription="diagram node"
                    aria-label={`Table ${table.name}`}
                    // Drives the "you are here" ring in index.css. An attribute (not a class)
                    // so the rule can out-specify the card's other utilities — as a utility it
                    // silently lost to node-elevation and never painted.
                    data-selected={selected || undefined}
                    className={cn(
                        'flex h-full w-full flex-col overflow-hidden rounded-xl border text-card-foreground node-elevation',
                        surfaceClass(fill),
                    )}
                >
                    <TableHeader id={id} name={table.name} comment={table.comment} graph={graph} />
                    {/* Columns fill the middle and scroll if the content exceeds the card height
            (the card is model-sized and auto-grows on add-column). An empty table
            shows a centered call-to-action instead of a blank void. */}
                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                        {count === 0 ? (
                            <button
                                type="button"
                                aria-label="This table has no columns. Add the first column."
                                onClick={addColumn}
                                onPointerDown={(event) => event.stopPropagation()}
                                className="group/empty m-auto flex cursor-pointer flex-col items-center gap-2.5 px-6 py-8 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <Columns3 className="size-6 text-muted-foreground/40 transition-colors group-hover/empty:text-muted-foreground/70" aria-hidden />
                                <span className="text-xs text-muted-foreground">No columns yet</span>
                                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-card-foreground transition-colors group-hover/empty:border-primary/50 group-hover/empty:text-foreground">
                                    <Plus className="size-3" /> Add column
                                </span>
                            </button>
                        ) : (
                            table.columns.map((column) => (
                                <TableColumnRow
                                    key={column.id}
                                    id={id}
                                    column={column}
                                    indexed={indexedIds.has(column.id)}
                                    graph={graph}
                                    autoEdit={column.id === editColumnId}
                                />
                            ))
                        )}
                    </div>
                    <footer className="flex items-center justify-between border-t border-border/60 px-5 py-1.5 text-[10px] text-muted-foreground">
                        <span>{`${count} ${count === 1 ? 'column' : 'columns'}`}</span>
                        <button
                            type="button"
                            aria-label="Add column"
                            onClick={addColumn}
                            onPointerDown={(event) => event.stopPropagation()}
                            className="flex items-center gap-1 rounded-sm px-1 py-0.5 outline-none hover:text-card-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <Plus className="size-3" />
            Add column
                        </button>
                    </footer>
                </div>
            </HTMLBox>
        </>
    );
}
