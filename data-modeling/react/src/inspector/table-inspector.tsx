// Right-docked inspector for a single selected TABLE. Reads the live selection
// (useSelection.collection -> reactive useCells); when EXACTLY one table is
// selected it derives that table during render (no setState-in-effect) and shows
// name, generated CREATE TABLE, a collapsible index manager, and appearance. Any
// other selection renders nothing.

import { memo, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
    useCells,
    useGraph,
    useSelectionCollection,
    type CellId,
    type ElementRecord,
} from '@joint/react-plus';
import { InspectorShell } from '@/inspector/inspector-shell';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible } from '@/components/ui/collapsible';
import { SqlEditor } from '@/panels/sql-editor/sql-editor';
import { SwatchRow } from '@/appearance/swatch-row';
import { AddIndexForm } from '@/inspector/add-index-form';
import { isTableCell, type SwatchKey, type TableCellData } from '@/model/cell-data';
import { useSchema } from '@/model/use-schema';
import { generateCreateTable } from '@/schema/generate-ddl';
import { formatSql } from '@/schema/format-sql';
import { setTableFill, updateTable, type TableGraph } from '@/canvas/table-edit';
import { useDialect } from '@/context/dialect-context';
import type { Index, Table } from '@/schema/types';

// memo'd so the controlled-cells cascade (setCells ~60×/sec during a drag) doesn't
// re-run this panel every frame; it re-renders only when its own selection/useCells
// subscription actually changes.
export const TableInspector = memo(function TableInspector() {
    const { collection } = useSelectionCollection();
    // Track only the single selected cell, and re-render when its DATA changes — not
    // on the position-only commits every drag frame (the cell's `data` ref is stable
    // across a move), so dragging a selected table doesn't reconcile this whole panel
    // (including the lazy CodeMirror SQL section).
    const only = useCells(
        collection,
        (cells) => (cells.length === 1 ? cells[0] : undefined),
        (a, b) => a?.id === b?.id && a?.data === b?.data,
    );
    const graph = useGraph<ElementRecord<TableCellData>>();

    // The single selection must be a table element.
    if (!only || !isTableCell(only.data)) return null;
    const table = only.data.table;
    const fill = only.data.fill ?? 'default';

    return (
        <InspectorShell
            label={`Inspector for table ${table.name}`}
            title={table.name || 'table'}
        >
            <header className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3 pr-14 lg:pr-4">
                <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                <h2 className="truncate font-mono text-sm font-semibold text-foreground">{table.name}</h2>
                <span className="ml-auto text-[11px] text-muted-foreground">
                    {table.columns.length} {table.columns.length === 1 ? 'col' : 'cols'}
                </span>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
                <NameSection name={table.name} tableId={only.id} graph={graph} />
                <SqlSection table={table} />
                <IndexesSection key={only.id} table={table} tableId={only.id} />
                {/* Appearance last — a presentation concern, below the structural sections. */}
                <AppearanceSection fill={fill} tableId={only.id} graph={graph} />
            </div>
        </InspectorShell>
    );
});

// --- Name + Appearance ------------------------------------------------------

function NameSection({
    name,
    tableId,
    graph,
}: {
  readonly name: string;
  readonly tableId: CellId;
  readonly graph: TableGraph;
}) {
    return (
        <section className="flex flex-col gap-2">
            <Label htmlFor="table-name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Name
            </Label>
            <Input
                id="table-name"
                value={name}
                onChange={(event) => {
                    const next = event.target.value;
                    updateTable(graph, tableId, (table) => ({ ...table, name: next }));
                }}
                placeholder="table_name"
                className="h-9 font-mono"
            />
        </section>
    );
}

function AppearanceSection({
    fill,
    tableId,
    graph,
}: {
  readonly fill: SwatchKey;
  readonly tableId: CellId;
  readonly graph: TableGraph;
}) {
    return (
        <section className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Color</h3>
            <SwatchRow label="Color" value={fill} onChange={(value) => setTableFill(graph, tableId, value)} />
        </section>
    );
}

// --- SQL --------------------------------------------------------------------

function SqlSection({ table }: { readonly table: Table }) {
    // Structurally-stable schema so the per-table DDL doesn't regenerate on every
    // position-drag commit (it only depends on structure, not positions).
    const schema = useSchema();
    const { dialect } = useDialect();

    // Pretty-print so the single-line kysely output wraps to multiple lines; the
    // editor is then capped at ~150px and scrolls (vertically + horizontally).
    const sql = useMemo(() => {
        try {
            return formatSql(generateCreateTable(table, schema, dialect), dialect);
        } catch {
            return '-- Unable to generate SQL for this table';
        }
    }, [table, schema, dialect]);

    return (
        <section className="flex flex-col gap-2">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">SQL</h3>
            <SqlEditor
                value={sql}
                readOnly
                className="[&_.cm-scroller]:max-h-[150px] [&_.cm-scroller]:overflow-auto"
            />
        </section>
    );
}

// --- Indexes ----------------------------------------------------------------

function IndexesSection({ table, tableId }: { readonly table: Table; readonly tableId: CellId }) {
    const graph = useGraph<ElementRecord<TableCellData>>();
    const [open, setOpen] = useState(true);

    const remove = (index: Index) =>
        updateTable(graph, tableId, (current) => ({
            ...current,
            indexes: current.indexes.filter((existing) => existing.id !== index.id),
        }));

    const add = (index: Index) =>
        updateTable(graph, tableId, (current) => ({
            ...current,
            indexes: [...current.indexes, index],
        }));

    const columnName = (columnId: string) =>
        table.columns.find((column) => column.id === columnId)?.name ?? columnId;

    return (
        <section>
            <Collapsible
                open={open}
                onToggle={() => setOpen((value) => !value)}
                title={
                    <span className="text-xs font-medium uppercase tracking-wide">
            Indexes
                        <span className="ml-1.5 text-muted-foreground">{table.indexes.length}</span>
                    </span>
                }
                contentClassName="flex flex-col gap-2 pt-2"
            >
                {table.indexes.length === 0 ? (
                    <p className="px-1 text-xs text-muted-foreground">No indexes yet.</p>
                ) : (
                    <ul className="flex flex-col gap-1.5">
                        {table.indexes.map((index) => (
                            <li
                                key={index.id}
                                className="group flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5"
                            >
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="flex items-center gap-1.5 font-mono text-xs text-card-foreground">
                                        <span className="truncate">{index.name}</span>
                                        {index.unique && (
                                            <span className="shrink-0 rounded-sm bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                        UNIQUE
                                            </span>
                                        )}
                                    </span>
                                    <span className="truncate text-[11px] text-muted-foreground">
                                        {index.columnIds.map(columnName).join(', ')}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    aria-label={`Remove index ${index.name}`}
                                    onClick={() => remove(index)}
                                    className="shrink-0 rounded-sm p-1 text-muted-foreground [@media(hover:hover)]:opacity-0 outline-none transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                                >
                                    <Trash2 className="size-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <AddIndexForm table={table} onAdd={add} />
            </Collapsible>
        </section>
    );
}
