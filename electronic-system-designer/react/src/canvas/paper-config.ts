// Static <Paper> configuration: routing, connection rules, embedding, drag
// feedback, and the draft-link factory. Pure values,
// kept out of the components so canvas.tsx stays a wiring file.

import { linkRoutingStraight, type DefaultLink, type PaperProps } from '@joint/react-plus';
import { newId } from '@/model/design';
import { isBoardFrameCell, isComponentCell } from '@/views/cell-data';
import { PIN_STUB, PORT_STUB } from '@/symbols/port-markup';

/**
 * Link routing for a view whose pins have stubs of the given length.
 * libavoid (`use-avoid-routing`) writes each link's bends and end anchors,
 * so the paper only draws straight segments through them: the library's
 * straight preset. Two swaps:
 * - the connector is `jumpover`, which arcs where wires cross (the drawing
 *   convention that separates crossings from junctions);
 * - the link ends at its anchor (the pin on the body edge, where libavoid
 *   ends the route) moved back along the route by the stub length: on the
 *   stub tip. The preset's `boundary` point would clip at the round hit zone
 *   instead, short of the tip and past the route's last bend.
 */
function linkRoutingForStub(stub: number): NonNullable<PaperProps['linkRouting']> {
    return {
        ...linkRoutingStraight(),
        defaultConnector: { name: 'jumpover', args: { size: 6 }},
        defaultConnectionPoint: { name: 'anchor', args: { offset: stub }},
    };
}

export const SCH_LINK_ROUTING = linkRoutingForStub(PIN_STUB);
export const ARCH_LINK_ROUTING = linkRoutingForStub(PORT_STUB);

/**
 * Connection rules: wires attach to PINS, never to a symbol's body — exactly
 * like real schematic capture. The full options form is used on purpose: a
 * bare predicate would still run the library's DEFAULTS first (self-loop
 * block, one-per-direction link limit), silently re-enabling limits this
 * paper must not have.
 * - `validate` requires the DRAGGED end to sit on a native port (every
 *   pin/interface stub is one) — that is what rejects
 *   element-body drops. Only the dragged end is checked: the far end of a
 *   DERIVED wire is anchor-only (no resolvable magnet), so a far-end check
 *   would misfire while reconnecting existing wires.
 * - `linkLimit: 'none'` — the duplicate check compares ports, but derived
 *   wires carry anchors, so it misfires; redundant copper is legal in
 *   schematic capture anyway (the nets merge it).
 * - `allowSelfLoops: true` — strapping two pins of the SAME part (SCK to
 *   MISO loopback, a jumper) is ordinary schematic practice.
 * - `allowRootConnection: true` — the root case is already excluded by
 *   `validate`; leaving the built-in check on would double-reject anchor-only
 *   far ends.
 */
export const VALIDATE_CONNECTION: NonNullable<PaperProps['validateConnection']> = {
    linkLimit: 'none',
    allowSelfLoops: true,
    allowRootConnection: true,
    validate: ({ source, target, endType }) => {
        const dragged = endType === 'source' ? source : target;
        if (dragged.port === null) return false;
        // Back on the pin it started from: a zero-length wire, not a loopback.
        return !(source.id === target.id && source.port === target.port);
    },
};

/**
 * Link-drag feedback as CSS classes on the port hit zones (round, centered on
 * each stub tip), so index.css owns the look: every pin a wire COULD land on
 * gets a faint ring, the one it is snapping to a solid one. Classes rather
 * than stroke highlighters: a stroked square around every pin of the sheet
 * buried the drawing in dashed boxes.
 */
export const CONNECT_HIGHLIGHTING: NonNullable<PaperProps['highlighting']> = {
    magnetAvailability: { name: 'addClass', options: { className: 'esd-port-available' }},
    connecting: { name: 'addClass', options: { className: 'esd-port-snap' }},
};

/** Parts embed only into board outlines (the connectivity sheet). */
export const VALIDATE_EMBEDDING: NonNullable<PaperProps['validateEmbedding']> = ({ child, parent }) =>
    isComponentCell(child.model.get('data')) && isBoardFrameCell(parent.model.get('data'));

/** A part never leaves its board: dropped outside every board, it goes back. */
export const VALIDATE_UNEMBEDDING: NonNullable<PaperProps['validateUnembedding']> = () => false;

/**
 * The draft link minted when the user drags a wire out of a pin: a dashed,
 * theme-colored rubber band, visibly not-yet-copper. The `style` shorthand
 * lands as inline CSS, so the CSS variable themes correctly. On connect, the
 * store reads its end ids + ports and mints the REAL wire (or expands an
 * interface bundle), and the draft is replaced.
 */
export const createDraftLink: DefaultLink = () => ({
    id: newId('draft'),
    type: 'link',
    z: 10,
    // A rubber band, not a route: the straight line is the classic "drawing a
    // wire" affordance — orthogonal routing belongs to COMMITTED wires only.
    // The link's own router/connector override the paper-level defaults.
    router: { name: 'normal' },
    connector: { name: 'normal' },
    style: {
        color: 'var(--primary)',
        width: 1.6,
        dasharray: '6,4',
        linecap: 'round',
        className: 'esd-draft-line',
        wrapperWidth: 16,
    },
    data: { kind: 'draft' },
});
