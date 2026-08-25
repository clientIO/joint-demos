// Owns the keyboard link-draft state and performs the actual FK creation. Sits
// inside <Diagram> so it can reach the graph, selection, and announcer. A first L
// on a focused column arms the source; a second L on a different column creates the
// relationship (unless one already joins that column pair, matching the drag path's
// one-per-pair rule); L on the same column cancels.
import { useCallback, useState, type ReactNode } from 'react';
import { useCells, useGraph, useSelectionCollection, type CellRecord, type Computed } from '@joint/react-plus';
import { LinkDraftContext, type ColumnRef } from './link-draft-context';
import { useAnnounce } from '@/components/ui/announcer-context';
import { newRelationLink } from '@/canvas/paper-config';
import { columnMagnet, isRelationLink, parseColumnMagnet } from '@/model/cell-data';

// Unordered key for a column pair, so A→B and B→A collapse to one entry.
function pairKey(a: string, b: string): string {
    return a < b ? `${a}__${b}` : `${b}__${a}`;
}

// The set of column pairs that already have a relation, kept structurally stable so
// this provider only re-renders when relations change (not on every drag frame).
function selectPairs(cells: ReadonlyArray<Computed<CellRecord>>): ReadonlySet<string> {
    const pairs = new Set<string>();
    for (const cell of cells) {
    // `type === 'link'` narrows the record union; `source`/`target` are then
    // typed link ends — no reflection needed.
        if (cell.type !== 'link' || !isRelationLink(cell.data)) continue;
        const source = parseColumnMagnet(cell.source.magnet ?? '');
        const target = parseColumnMagnet(cell.target.magnet ?? '');
        if (source && target) pairs.add(pairKey(source, target));
    }
    return pairs;
}

function pairsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
    if (a.size !== b.size) return false;
    for (const key of a) if (!b.has(key)) return false;
    return true;
}

export function LinkDraftProvider({ children }: { readonly children: ReactNode }) {
    const [pending, setPending] = useState<ColumnRef | null>(null);
    const { setCell } = useGraph();
    const { selectCells } = useSelectionCollection();
    const announce = useAnnounce();
    const pairs = useCells(selectPairs, pairsEqual);

    // Side effects live OUTSIDE setPending: a functional-updater must be pure (React
    // StrictMode double-invokes it, which would create the link twice). `pending` is a
    // dependency, so this closure always sees the latest armed source.
    const toggle = useCallback(
        (column: ColumnRef) => {
            if (!pending) {
                setPending(column);
                announce(`Linking from ${column.columnId}. Focus another column and press L to connect, or L again to cancel.`);
                return;
            }
            if (pending.tableId === column.tableId && pending.columnId === column.columnId) {
                setPending(null);
                announce('Link cancelled.');
                return;
            }
            if (pairs.has(pairKey(pending.columnId, column.columnId))) {
                setPending(null);
                announce('These columns are already related.');
                return;
            }
            const link = newRelationLink();
            setCell({
                ...link,
                type: 'link',
                source: { id: pending.tableId, magnet: columnMagnet(pending.columnId) },
                target: { id: column.tableId, magnet: columnMagnet(column.columnId) },
            });
            if (link.id !== undefined) selectCells([link.id]);
            setPending(null);
            announce('Relationship created. Use the relationship menu to set its cardinality.');
        },
        [announce, pairs, pending, selectCells, setCell],
    );

    return <LinkDraftContext.Provider value={{ pending, toggle }}>{children}</LinkDraftContext.Provider>;
}
