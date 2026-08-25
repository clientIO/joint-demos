// Cardinality -> crow's-foot marker pair. Pure: given a Relation's Cardinality,
// return the LinkStyle that themes the relationship wire.
//
// CONTRACT (source = FK/child side, target = referenced/PK side):
//   '1:1' -> one  | one
//   '1:N' -> one  | many
//   'N:1' -> many | one
//
// The base wire color and width are owned by CSS (`--link-line-rest/-active`,
// `--jj-link-width`) and the markers inherit the line's stroke. So we set ONLY
// the marker pair and leave `color`/`width` unset — the theme paints the line,
// selection recolors it via `--jj-selection-selected-link-color`.

import { linkMarkerMany, linkMarkerOne, type LinkStyle } from '@joint/react-plus';
import type { Cardinality } from '@/schema/types';

// Crow's-foot markers were too small to read the cardinality at a glance. Scale
// them up (geometry is scale-driven: many = 6×3·scale, one = 4·scale, and the
// marker `length` recomputes so the wire still meets the marker cleanly).
// `context-stroke`/`context-fill` make the arrowheads follow the LINE's stroke — so
// selection recolor AND the hover-highlight (which overrides the line stroke) tint
// the arrowheads too, instead of leaving them a stale grey.
const MARKER = { scale: 1.7, strokeWidth: 2.5, stroke: 'context-stroke', fill: 'context-stroke' } as const;

export function cardinalityToLinkStyle(cardinality: Cardinality): LinkStyle {
    switch (cardinality) {
        case '1:1':
            return { sourceMarker: linkMarkerOne(MARKER), targetMarker: linkMarkerOne(MARKER) };
        case '1:N':
            return { sourceMarker: linkMarkerOne(MARKER), targetMarker: linkMarkerMany(MARKER) };
        case 'N:1':
            return { sourceMarker: linkMarkerMany(MARKER), targetMarker: linkMarkerOne(MARKER) };
    }
}
