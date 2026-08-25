// One column of a table card. The whole row is a per-column FK magnet (links bind
// to `columnMagnet(column.id)`); inside it are a role dot/icon, the inline-editable
// column name, an editable type, nullable/unique markers, and a remove control.
//
// All edits are immutable `updateTable` writes on `data.table.columns` keyed by
// column id. Inline name editing uses the same `string | null` draft pattern as
// the header (null == not editing) — seeded and cleared in event handlers, never
// in an effect.

import { memo, useRef, useState } from 'react';
import { Hash, KeyRound, Trash2 } from 'lucide-react';
import { useMarkup, type CellId } from '@joint/react-plus';
import { columnMagnet } from '@/model/cell-data';
import { cn } from '@/utils/cn';
import { DIALECT_KINDS, type CanonicalKind } from '@/schema/sql-types';
import type { Column } from '@/schema/types';
import { updateTable, type TableGraph } from '@/canvas/table-edit';
import { useCommitOnOutside } from '@/canvas/use-commit-on-outside';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FlagChip } from '@/canvas/flag-chip';
import { typeOfKind, typeLabel } from '@/canvas/column-type-format';
import { useDialect } from '@/context/dialect-context';
import { useLinkDraft } from '@/context/link-draft-context';
import { useHover, useIsColumnRelated } from '@/context/hover-context';

interface TableColumnRowProps {
  readonly id: CellId;
  readonly column: Column;
  // True when the column participates in any of the table's indexes.
  readonly indexed: boolean;
  readonly graph: TableGraph;
  // True for a column that was JUST added — the row mounts straight into name-edit mode
  // so the user can type the name. Only the initial (mount) value is used.
  readonly autoEdit?: boolean;
}

function stopPointer(event: React.PointerEvent): void {
    event.stopPropagation();
}

// memo'd: a table card re-renders on selection / fill / any column change, but immutable
// updates keep UNCHANGED column objects referentially stable — so a memo'd row skips the
// re-render unless ITS own props change. On a dense board that turns an O(all rows) cascade
// into O(the rows that actually changed).
export const TableColumnRow = memo(function TableColumnRow({
    id,
    column,
    indexed,
    graph,
    autoEdit = false,
}: TableColumnRowProps) {
    // Seed the edit draft on mount for a freshly-added column (the input autofocuses + selects
    // its text), so "Add column" drops the caret straight into the name.
    const [nameDraft, setNameDraft] = useState<string | null>(
        autoEdit ? column.name : null,
    );
    const [typeOpen, setTypeOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    // Leave the rename when clicking anywhere else (selecting another table by its body
    // doesn't blur the input on its own — one active edit at a time).
    useCommitOnOutside(nameDraft !== null, inputRef, commitName);
    const { dialect } = useDialect();
    const linkDraft = useLinkDraft();
    const isLinkSource = linkDraft.pending?.columnId === column.id;
    // Relationship hover-highlight: hovering this column lights up its relations + the
    // columns on the other end; `isRelated` means THIS column is part of what's lit. The
    // store subscription is a boolean, so this row re-renders ONLY when its own highlight
    // flips — not on every hover elsewhere on the board.
    const { store: hoverStore, setHoveredColumn } = useHover();
    const isRelated = useIsColumnRelated(hoverStore, column.id);

    // Types on offer follow the selected engine. If the column already holds a kind
    // this dialect doesn't list (e.g. a `uuid` left over after switching to MySQL),
    // keep it first so the select still shows the real type instead of blanking.
    const offered = DIALECT_KINDS[dialect];
    const typeKinds =
    column.type.kind === 'raw' || offered.includes(column.type.kind)
        ? offered
        : [column.type.kind, ...offered];

    // Per-column FK magnet: the whole row is an active magnet for `columnMagnet(id)`, so a
    // DRAG from anywhere on the row draws an FK wire and any column is a valid drop target.
    // The controls just call their action on click — joint-core withholds the native click
    // once the pointer travels past the paper's `clickThreshold` (see paper-config), so a drag
    // that draws a wire never also fires a control, on mouse OR touch, with no guard here. A
    // drag OUT of the row draws the wire (`magnetThreshold="onleave"`); the table is
    // repositioned from its HEADER, not the rows.
    //
    // Cursors are purely a HINT: the clickable controls show a `pointer`, while the row surface
    // + connect edges keep the `crosshair` that says "drag here to draw a relationship".
    const { magnetRef } = useMarkup();

    function commitName(): void {
        if (nameDraft !== null) {
            const next = nameDraft.trim();
            if (next && next !== column.name) {
                updateTable(graph, id, (table) => ({
                    ...table,
                    columns: table.columns.map((col) =>
                        col.id === column.id ? { ...col, name: next } : col,
                    ),
                }));
            }
        }
        setNameDraft(null);
    }

    function changeType(kind: CanonicalKind): void {
        updateTable(graph, id, (table) => ({
            ...table,
            columns: table.columns.map((col) =>
                col.id === column.id ? { ...col, type: typeOfKind(kind) } : col,
            ),
        }));
    }

    function removeColumn(): void {
    // Relations anchored to this column would DANGLE on the table body once its
    // magnet row is gone — remove them with the column (either direction).
    // `graph.graph` (the GraphApi escape hatch) is read at event time only, so
    // this hot memo'd row carries no extra paper-store subscription.
        const model = graph.graph;
        const cell = model.getCell(id);
        if (cell?.isElement()) {
            const magnet = columnMagnet(column.id);
            const stale = model
                .getConnectedLinks(cell)
                .filter(
                    (link) =>
                        link.source().magnet === magnet || link.target().magnet === magnet,
                )
                .map((link) => link.id);
            if (stale.length > 0) graph.removeCells(stale);
        }
        updateTable(graph, id, (table) => ({
            ...table,
            columns: table.columns.filter((col) => col.id !== column.id),
            // Prune the column from any index too (and drop indexes left empty) — a
            // deleted column must not linger as a dead reference in IFK_* indexes.
            indexes: table.indexes
                .map((index) => ({
                    ...index,
                    columnIds: index.columnIds.filter((cid) => cid !== column.id),
                }))
                .filter((index) => index.columnIds.length > 0),
        }));
    }

    // Primary key implies NOT NULL, so setting PK also clears nullable.
    function togglePrimaryKey(): void {
        updateTable(graph, id, (table) => ({
            ...table,
            columns: table.columns.map((col) =>
                col.id === column.id
                    ? {
                        ...col,
                        primaryKey: !col.primaryKey,
                        nullable: col.primaryKey ? col.nullable : false,
                    }
                    : col,
            ),
        }));
    }

    function toggleNullable(): void {
        updateTable(graph, id, (table) => ({
            ...table,
            columns: table.columns.map((col) =>
                col.id === column.id ? { ...col, nullable: !col.nullable } : col,
            ),
        }));
    }

    function toggleUnique(): void {
        updateTable(graph, id, (table) => ({
            ...table,
            columns: table.columns.map((col) =>
                col.id === column.id ? { ...col, unique: !col.unique } : col,
            ),
        }));
    }

    return (
        <div
            ref={magnetRef(columnMagnet(column.id))}
            // The whole row is a per-column link MAGNET (a valid drop TARGET for any wire), but
            // a wire only STARTS from the coral connect edges below (they carry
            // `data-link-draggable`; the paper's `validateMagnet` rejects a start anywhere else).
            // The row BODY drags the table (cursor-move); the controls click. `magnetThreshold=
            // "onleave"` means a plain press never leaves the row, so clicks always fire.
            onPointerEnter={() => setHoveredColumn(column.id, id)}
            onPointerLeave={() => setHoveredColumn(null)}
            className={cn(
                // `cursor-pointer`: the row reads as interactive (its controls click); the CROSSHAIR
                // that signals "draw a relationship" lives only on the connect edges below. A drag
                // still starts a wire from anywhere on the row — the cursor just guides you to the edges.
                'group/row relative flex items-center gap-2 border-b border-border/60 px-5 py-1.5 text-xs transition-colors last:border-b-0 hover:bg-accent/40 cursor-pointer',
                // A column on the far end of the hovered column's relationship(s).
                isRelated && 'bg-primary/10',
            )}
        >
            {/* Connect edges — the crosshair zone JUST OUTSIDE the row content where a relationship
          wire attaches. A wider transparent hit strip (cursor-crosshair) wraps the thin coral
          bar that fades in on hover; the span is the magnet's press target so a drag here draws
          the wire. Keyboard users press L on the column name. */}
            <span
                aria-hidden
                className="absolute inset-y-0 left-0 z-10 flex w-2.5 cursor-crosshair items-stretch"
            >
                <span className="w-[3px] rounded-r-sm bg-primary opacity-0 transition-opacity group-hover/row:opacity-100" />
            </span>
            <span
                aria-hidden
                className="absolute inset-y-0 right-0 z-10 flex w-2.5 cursor-crosshair items-stretch justify-end"
            >
                <span className="w-[3px] rounded-l-sm bg-primary opacity-0 transition-opacity group-hover/row:opacity-100" />
            </span>
            {/* Leading key icon — THREE states, each with a self-explaining tooltip:
          • gold key  = PRIMARY KEY
          • hash (#)  = a plain column that's part of an INDEX (indexed, not a key)
          • faint key = a plain, un-keyed column (click to make it the primary key)
          Clicking always toggles PRIMARY KEY. */}
            <button
                type="button"
                aria-label={
                    column.primaryKey
                        ? `Unset primary key on ${column.name}`
                        : `Set ${column.name} as primary key`
                }
                aria-pressed={column.primaryKey}
                title={
                    column.primaryKey
                        ? 'Primary key — click to unset'
                        : indexed
                            ? 'Indexed column — click to set as primary key'
                            : 'Click to set as primary key'
                }
                onClick={togglePrimaryKey}
                className="shrink-0 cursor-pointer rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {column.primaryKey ? (
                    <KeyRound className="size-3.5 text-type-pk" aria-hidden />
                ) : indexed ? (
                    <Hash className="size-3.5 text-type-index" aria-hidden />
                ) : (
                    <KeyRound className="size-3.5 text-muted-foreground/25" aria-hidden />
                )}
            </button>
            {nameDraft === null ? (
                <span
                    // DRAG the name to draw an FK wire, CLICK it to rename. The travel guard skips
                    // this click when the press moved, so a drag that drew a wire never also opens the
                    // rename input (focus must not jump to a drag target). role="button" keeps it in
                    // the a11y tree. Enter / F2 rename for keyboard users; L starts / completes a
                    // keyboard FK link — both operable without a mouse.
                    role="button"
                    tabIndex={0}
                    title="Click to rename · drag to link"
                    aria-label={`Column name ${column.name || '(unnamed)'}. Click or press Enter to rename, drag or press L to start a relationship.`}
                    aria-pressed={isLinkSource}
                    onClick={() => setNameDraft(column.name)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === 'F2') {
                            event.preventDefault();
                            setNameDraft(column.name);
                        } else if (event.key === 'l' || event.key === 'L') {
                            event.preventDefault();
                            linkDraft.toggle({ tableId: String(id), columnId: column.id });
                        }
                    }}
                    className={cn(
                        'min-w-0 flex-1 cursor-pointer select-none truncate rounded-sm px-1 py-0.5 text-left font-mono text-card-foreground outline-none transition-colors hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring',
                        isLinkSource && 'ring-2 ring-inset ring-primary',
                    )}
                >
                    {column.name || (
                        <span className="italic text-muted-foreground">unnamed</span>
                    )}
                </span>
            ) : (
                <input
                    ref={inputRef}
                    autoFocus
                    aria-label="Column name"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    onFocus={(event) => event.target.select()}
                    onBlur={commitName}
                    onPointerDown={stopPointer}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') commitName();
                        else if (event.key === 'Escape') setNameDraft(null);
                    }}
                    className="min-w-0 flex-1 cursor-text rounded-sm bg-background px-1 py-0.5 font-mono text-card-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
            )}

            {column.type.kind === 'raw' ? (
                <span className="shrink-0 font-mono text-muted-foreground">
                    {typeLabel(column.type)}
                </span>
            ) : (
            // Type picker: a CLICK-to-open Radix menu that ALSO drags out a link. Radix opens on
            // pointer-DOWN by default, which would pop the menu the instant a wire-drag began —
            // a CAPTURE-phase stopPropagation blocks Radix's own pointerdown-open (it doesn't
            // touch joint's native mousedown, so the magnet drag still arms), and the menu opens
            // from a real click instead. The travel guard skips that open when the press was a drag.
                <DropdownMenu open={typeOpen} onOpenChange={setTypeOpen}>
                    <DropdownMenuTrigger
                        title="Click to change type · drag to link"
                        aria-label={`Type of column ${column.name}: ${column.type.kind}. Click to change type, drag to link.`}
                        onPointerDownCapture={(event) => event.stopPropagation()}
                        onClick={() => setTypeOpen((open) => !open)}
                        className="shrink-0 cursor-pointer select-none font-mono text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {/* Text wrapped in a SPAN so the pointerdown target is a non-form-node: joint-core's
                form-control gate blocks a magnet drag started on the <button> itself, so this
                makes a drag from the type label draw an FK wire (click still opens the menu). */}
                        <span className="block">{column.type.kind}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-h-64">
                        {typeKinds.map((kind) => (
                            <DropdownMenuItem
                                key={kind}
                                onSelect={() => changeType(kind)}
                                className={cn(
                                    'font-mono text-xs',
                                    kind === column.type.kind && 'bg-accent/60',
                                )}
                            >
                                {kind}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            {/* Fixed-width flags slot: two always-present toggle chips keep the type to
          their left at the same right edge on every row (types stay aligned), and
          make UNIQUE / NOT NULL editable inline. */}
            <div className="flex w-16 shrink-0 items-center justify-end gap-1">
                <FlagChip
                    label="UQ"
                    title="UNIQUE"
                    columnName={column.name}
                    active={column.unique}
                    onToggle={toggleUnique}
                />
                <FlagChip
                    label="NN"
                    title="NOT NULL"
                    columnName={column.name}
                    active={!column.nullable}
                    onToggle={toggleNullable}
                />
            </div>

            <button
                type="button"
                aria-label={`Remove column ${column.name}`}
                onClick={removeColumn}
                className="shrink-0 cursor-pointer rounded-sm p-0.5 text-muted-foreground [@media(hover:hover)]:opacity-0 outline-none hover:text-destructive focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/row:opacity-100"
            >
                <Trash2 className="size-3.5" />
            </button>
        </div>
    );
});
