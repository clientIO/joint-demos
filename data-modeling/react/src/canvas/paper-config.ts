// Static <Paper> configuration for the ERD canvas: link routing, link-drag
// highlight, the magnet veto, the seed-cell style pass, and the factory that
// mints a fresh relationship when the user drags a new connection.
//
// WHY here and not in canvas.tsx: these are pure, render-independent values.
// Keeping them out of the component keeps the composition file focused on
// wiring and under the size budget, and lets the style pass be unit-reasoned in
// isolation.

import {
    linkRoutingSmooth,
    type DefaultLink,
    type LinkRecord,
    type PaperProps,
} from '@joint/react-plus';
import type { Cardinality } from '../schema/types';
import { newId } from '../schema/id';
import { isRelationLink, type Cell } from '../model/cell-data';
import { Z_LINK } from '../model/z-order';
import { cardinalityToLinkStyle } from './relationship-style';

// ERD wires: right-angle (orthogonal) segments with rounded corners — the
// drawSQL / dbdiagram look. We reuse the smooth preset's HORIZONTAL column
// anchors + connection points (links leave/enter a column on the left/right),
// but swap the router to the PLAIN `orthogonal` router and a `rounded` connector.
//
// ponytail: NOT `linkRoutingOrthogonal` (rightAngle router) — that one avoids
// every element as an obstacle, and our tables sit inside big group containers it
// then detours around (huge rectangular paths). The plain `orthogonal` router does
// simple right angles between the two anchors with NO obstacle avoidance, so it
// crosses group boundaries cleanly.

// `straightWhenDisconnected: false` is what keeps a DRAGGED (not-yet-connected)
// link anchored to the LEFT/RIGHT of a column row instead of wrapping around it:
// with the default `true`, the disconnected end falls back to a centre anchor +
// element-boundary connection point, so the drag preview curves around the whole
// row. `false` keeps the horizontal mid-side anchor on both ends at all times —
// matching the markup-selectors / markup-selectors-html stories.
export const LINK_ROUTING = linkRoutingSmooth({
    mode: 'horizontal',
    straightWhenDisconnected: false,
});
// A dragged-out relation defaults to many-children-to-one-parent — the shape of
// almost every foreign key. The user can retype it later.
const DEFAULT_CARDINALITY: Cardinality = 'N:1';

// The group drop-target highlight is NOT a joint highlighter — it's drawn by
// useContainmentEmbedding (which owns embedding) via a `data-embed-target` attribute
// styled in index.css. joint's `embeddingMode` highlight was dropped because it fought
// that hook: the table is already embedded (centre-containment) before joint's
// processEmbedding runs, so joint never highlighted the destination group.

// Link-drag feedback consumed by the Paper's `highlighting` prop. Two states,
// both `stroke` highlighters keyed by `data-jj-highlight` so index.css can paint
// each differently:
//   - `magnetAvailability`: every column magnet a link COULD land on — a quiet
//     dashed accent hint while dragging (data-jj-highlight="available").
//   - `connecting`: the magnet the link is currently snapping to — a stronger
//     success/green outline + faint fill (data-jj-highlight="valid").
// `stroke` falls back to a rect around the node when a magnet has no path data,
// so it works on the HTML column-row magnets. Colour is owned by CSS. Passed to the
// Paper's `highlighting` prop directly (it's the only joint highlighter now).
export const CONNECT_HIGHLIGHTING = {
    magnetAvailability: {
        name: 'stroke',
        options: {
            // padding/rx 0: each column-row highlight is a tight rect, so ADJACENT rows
            // share the exact same edge (no gap) — one dashed line between rows instead
            // of the doubled line a positive padding produced.
            padding: 0,
            rx: 0,
            ry: 0,
            attrs: {
                'stroke-width': 1.5,
                'stroke-dasharray': '4 3',
                'data-jj-highlight': 'available',
            },
        },
    },
    connecting: {
        name: 'stroke',
        options: {
            padding: 3,
            rx: 6,
            ry: 6,
            attrs: {
                'stroke-width': 2,
                'data-jj-highlight': 'valid',
            },
        },
    },
} satisfies NonNullable<PaperProps['highlighting']>;

// The whole column row is an FK magnet, and a DRAG from anywhere on it — every control
// included — draws a wire; a CLICK fires the control's own action (the row's travel guard
// splits the two). This is deliberate: joint-core's form-control gate no longer blocks a
// magnet-drag over a <button>, so if we DIDN'T start a link here, a drag on a control would
// fall through to element-dragging and yank the whole table (which felt wrong). Starting
// the link keeps every row-drag doing one predictable thing — drawing a relationship — and
// the table is repositioned from its HEADER instead. The one exception is a live text
// editor: while the inline rename <input> is up, a drag must select text, not start a link.
// (`clickThreshold: 10` — the tap-vs-drag slop, see clientIO/joint #3438 — moved
// to its DEDICATED `<Paper clickThreshold>` prop in canvas.tsx; the escape hatch
// carries only what has no prop of its own.)
export const PAPER_OPTIONS: NonNullable<PaperProps['options']> = {
    // Params typed with global DOM types (matches joint's
    // `(cellView, magnet: SVGElement, evt: Event) => boolean`) so no raw `dia` type
    // import is needed; `_cellView` is unused. (Passed through Paper's `options` escape
    // hatch — validateMagnet has no dedicated react-plus prop.)
    validateMagnet(_cellView: unknown, magnet: SVGElement, evt: Event): boolean {
        const target = evt.target;
        // A press inside a text editor selects text — never starts a link.
        if (target instanceof Element && target.closest('input, textarea')) {
            return false;
        }
        // Preserve joint's default: any non-passive magnet may start a link.
        return magnet.getAttribute('magnet') !== 'passive';
    },
};

// A fresh relation link (its own relation id, which doubles as the cell id so the
// reverse projection stays stable). Used both as the Paper's drag-created default
// link and by the keyboard link-draft path — so it's a plain callable, not the
// `DefaultLink` union (which isn't directly callable).
export function newRelationLink(): Partial<LinkRecord> {
    const relationId = newId('rel');
    return {
        id: relationId,
        type: 'link',
        // Canonical link tier (above groups + notes, below tables) — matches the seed
        // and the runtime z-order normalizer, so a fresh wire never flashes at the wrong
        // depth before the normalizer runs.
        z: Z_LINK,
        data: { kind: 'relation', relationId, cardinality: DEFAULT_CARDINALITY },
        style: cardinalityToLinkStyle(DEFAULT_CARDINALITY),
    };
}

// The link the Paper mints when the user drags out a new connection.
export const createDefaultLink: DefaultLink = newRelationLink;

// Seed pass: relation link cells carry only `data` (the model layer stays free
// of presentation). Here we resolve each relation's cardinality into its marker
// style before the cells reach <Diagram>. Non-relation cells pass through
// untouched. `style` lives only on link members of the Cell union, so adding it
// to a relation cell is type-safe (it is never excess against that union).
export function withRelationStyle(cell: Cell): Cell {
    return isRelationLink(cell.data)
        ? { ...cell, style: cardinalityToLinkStyle(cell.data.cardinality) }
        : cell;
}
