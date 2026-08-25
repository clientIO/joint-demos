// Keep the paint order correct in the DATA at all times, no matter the creation
// order or embedding: group + note CONTAINERS at the BACK, tables in FRONT, links
// FRONTMOST. Without this a group drawn (or resized) over a table paints on top of
// it. Enforced on the raw graph (`element.set('z')`); the change flows back to the
// controlled cells via onCellsChange, so `z` ends up in the cell data as intended.
//
// Recomputed whenever a node is added or embedding changes — subscribed through
// `useOnGraphEvents`, so the wiring (and its cleanup) is the library's.
// joint's embed() only requires child z > parent z, which Z_TABLE(10) > Z_BACK(0)
// satisfies, so setting z here never fights embedding.
// ponytail: raw graph is deliberate (same rationale as use-containment-embedding);
// @todo good candidate for a joint-react-plus feature.

import { useEffect } from 'react';
import { useGraph, useOnGraphEvents, type GraphApi } from '@joint/react-plus';
import { isGroupCell, isNoteCell } from '@/model/cell-data';
// Canonical tiers (bottom → top: group, note, link, table) shared with the seed.
import { Z_GROUP, Z_GROUP_SELECTED, Z_LINK, Z_NOTE, Z_TABLE } from '@/model/z-order';

function normalizeZ(graph: GraphApi['graph']): void {
    for (const element of graph.getElements()) {
        const data = element.get('data');
        // A group pins to Z_GROUP — EXCEPT when group-element has raised it to
        // Z_GROUP_SELECTED for the selected group; leave that alone so the two don't
        // fight (both are valid group z's, and only one group is selected at a time).
        const z = isGroupCell(data)
            ? element.get('z') === Z_GROUP_SELECTED
                ? Z_GROUP_SELECTED
                : Z_GROUP
            : isNoteCell(data)
                ? Z_NOTE
                : Z_TABLE;
        if (element.get('z') !== z) element.set('z', z);
    }
    for (const link of graph.getLinks()) {
        if (link.get('z') !== Z_LINK) link.set('z', Z_LINK);
    }
}

export function useZOrder(): void {
    const { graph } = useGraph();

    // Also normalise on change:z so a group can NEVER stay in front: any interaction
    // that bumps z (joint's drag-to-front, an import) is re-corrected. Idempotent —
    // normalizeZ only set()s when z differs, so after the one correcting pass z is
    // canonical and the change:z it fires is a no-op. No loop.
    useOnGraphEvents({
        add: () => normalizeZ(graph),
        'change:embeds': () => normalizeZ(graph),
        'change:z': () => normalizeZ(graph),
    });

    // One correcting pass for the seeded cells.
    useEffect(() => {
        normalizeZ(graph);
    }, [graph]);
}
