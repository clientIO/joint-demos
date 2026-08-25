// Owns the hovered column/relation and derives the related sets. Column
// highlights flow through the HoverStore (each row subscribes to just its own
// boolean); the related LINKS are painted through the library itself — the
// effect writes `rel-hover` into each link's `LinkStyle.className` via
// `setCell(..., { skipHistory: true })`, so the presentation write never lands
// on the undo stack and index.css owns the look. Hovering the WIRE is wired
// through the typed paper events (`onLinkMouseEnter`/`Leave`), the same
// highlight from the other end.
//
// The hovering row reports its OWNING TABLE's cell id along with the column,
// so the owner is a direct `graph.getCell` lookup — no element scan. The
// context VALUE stays stable (store + setters), so consuming it never
// re-renders; hovering re-renders only this provider plus the columns whose
// membership changed (see hover-context.ts).

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useGraph, useOnPaperEvents, type CellId } from '@joint/react-plus';
import { columnMagnet, parseColumnMagnet } from '@/model/cell-data';
import { HoverContext, HoverStore, type HoverApi } from './hover-context';

interface HoveredColumn {
  readonly columnId: string;
  readonly tableId: CellId | undefined;
}

export function HoverProvider({ children }: { readonly children: ReactNode }) {
    const { graph, setCell } = useGraph();
    const [hoveredColumn, setHoveredColumnState] = useState<HoveredColumn | null>(null);
    const [hoveredRelation, setHoveredRelation] = useState<string | null>(null);
    // Created once; stable for the provider's lifetime.
    const [store] = useState(() => new HoverStore());

    const setHoveredColumn = useCallback((columnId: string | null, tableId?: CellId) => {
        setHoveredColumnState(columnId === null ? null : { columnId, tableId });
    }, []);

    // Hovering a relationship WIRE lights it up too — typed paper events, bound
    // to the paper once it mounts (the hook tolerates a not-yet-mounted paper).
    useOnPaperEvents({
        onLinkMouseEnter: ({ id }) => setHoveredRelation(String(id)),
        onLinkMouseLeave: () => setHoveredRelation(null),
    });

    // Links currently carrying the hover class, so the next run can clear them.
    const litLinksRef = useRef<ReadonlySet<CellId>>(new Set());

    // Derive the highlighted sets from the graph when the hovered id changes.
    // Reading the raw graph on demand (the sanctioned event-time escape the
    // sibling hooks use) keeps this off the per-frame path; the column sets go to
    // the external store (not setState), so only subscribers whose slice changed
    // re-render.
    useEffect(() => {
        const relatedColumnIds = new Set<string>();
        const relatedRelationIds = new Set<CellId>();

        // Add every column endpoint a link touches, plus the link (relation) itself.
        const addLink = (link: { readonly id: string | number; source(): { magnet?: string }; target(): { magnet?: string } }): void => {
            relatedRelationIds.add(String(link.id));
            for (const end of [link.source(), link.target()]) {
                const columnId = end.magnet ? parseColumnMagnet(end.magnet) : null;
                if (columnId) relatedColumnIds.add(columnId);
            }
        };

        if (hoveredColumn !== null) {
            const { columnId, tableId } = hoveredColumn;
            relatedColumnIds.add(columnId);
            // The owner is known (the row told us), so ask the graph for just ITS links.
            // `getConnectedLinks` has no per-magnet filter option, so keep the ones whose
            // endpoint sits on this column's magnet.
            const magnet = columnMagnet(columnId);
            const owner = tableId === undefined ? undefined : graph.getCell(tableId);
            if (owner !== undefined && owner.isElement()) {
                for (const link of graph.getConnectedLinks(owner)) {
                    const ends = [link.source(), link.target()];
                    if (ends.some((end) => end.magnet === magnet)) addLink(link);
                }
            }
        }

        if (hoveredRelation !== null) {
            // The link cell id === the relation id, so the hovered relation IS a graph link.
            const link = graph.getCell(hoveredRelation);
            if (link && link.isLink()) addLink(link);
        }

        store.set({ relatedColumnIds });

        // Paint the related wires: diff against the previously lit set and write
        // the class through LinkStyle.className (skipHistory keeps it off undo).
        const previous = litLinksRef.current;
        const paint = (id: CellId, className: string): void => {
            if (!graph.getCell(id)) return; // the link vanished mid-hover
            setCell(
                id,
                (link) => (link.type === 'link' ? { ...link, style: { ...link.style, className }} : link),
                { skipHistory: true },
            );
        };
        for (const id of previous) if (!relatedRelationIds.has(id)) paint(id, '');
        for (const id of relatedRelationIds) if (!previous.has(id)) paint(id, 'rel-hover');
        litLinksRef.current = relatedRelationIds;
    }, [graph, setCell, hoveredColumn, hoveredRelation, store]);

    // Stable value (store + setters never change), so consuming the context never re-renders.
    const value = useMemo<HoverApi>(
        () => ({ store, setHoveredColumn, setHoveredRelation }),
        [store, setHoveredColumn],
    );

    return <HoverContext.Provider value={value}>{children}</HoverContext.Provider>;
}
