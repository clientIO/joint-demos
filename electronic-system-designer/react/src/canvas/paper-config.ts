// Static <Paper> configuration shared by both canvas views: routing,
// connection rules, drag feedback, and the draft-link factories. Pure values,
// kept out of the components so canvas.tsx stays a wiring file.

import type { DefaultLink, PaperProps } from '@joint/react-plus';
import { newId } from '@/model/design';

/**
 * Schematic routing:
 * - route GEOMETRY comes from libavoid (`use-avoid-routing` writes each
 *   wire's vertices), so the paper router is `normal` — straight segments
 *   through the vertices the service computed; anything smarter here would
 *   re-bend libavoid's already-orthogonal runs;
 * - the `jumpover` connector arcs where wires cross — the drawing convention
 *   that separates crossings from junctions (junction DOTS are drawn at pins);
 * - ends sit on native ports (the stub tips, or the router's anchors), so
 *   the connection point is simply "the anchor".
 */
export const SCH_LINK_ROUTING: NonNullable<PaperProps['linkRouting']> = {
    defaultRouter: { name: 'normal' },
    defaultConnector: { name: 'jumpover', args: { size: 6 }},
    // Ends without an explicit anchor (a wire being drawn, a wire libavoid has
    // not routed yet) sit on the port magnet's center: the stub tip.
    defaultAnchor: { name: 'center' },
    defaultConnectionPoint: { name: 'anchor' },
};

/**
 * Architecture routing: same conventions, but the `manhattan` router — it
 * routes AROUND elements, so bundles never run under a subsystem block no
 * matter where the user drags one. (The schematic keeps the lighter
 * `orthogonal` router: its board outlines are elements too, and an obstacle
 * router would treat the whole board as a wall.)
 */
export const ARCH_LINK_ROUTING: NonNullable<PaperProps['linkRouting']> = {
    defaultRouter: { name: 'manhattan', args: { padding: 20, step: 4 }},
    defaultConnector: { name: 'jumpover', args: { size: 6 }},
    defaultAnchor: { name: 'center' },
    defaultConnectionPoint: { name: 'anchor' },
};

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

/**
 * The draft link minted when the user drags a wire out of a pin. It carries
 * no `data.kind` the renderers know, so — unlike the derived wires, whose
 * native line hides behind renderLink — its native line IS the preview the
 * user follows: dashed, theme-colored, visibly not-yet-copper. The `style`
 * shorthand lands as inline CSS, so the CSS variable themes correctly. On
 * connect, the write-back reads its end ids + ports and mints the REAL wire
 * (or expands an interface bundle), and the draft disappears on the next
 * derive.
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
