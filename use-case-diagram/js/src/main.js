import { shapes as defaultShapes, connectors, dia, util, linkTools } from '@joint/core';
import './styles.css';

const paperContainer = document.getElementById('paper-container');

const FONT_FAMILY = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

// Actor accents, each a light->deep pair of the same hue. A single flat tone
// is used directly on the actor's own stick-figure stroke (see createActor);
// the pair itself only comes into play on the use-case ellipse it connects
// to, which blends the accents of every actor that uses it (see
// getAccentColor) - a two-stop gradient there instead of a flat fill. Kept as
// literal hex (not theme CSS variables): these need real color values, both
// for the gradient stops and to blend across actors.
//
// Hues are spread far apart on purpose (blue/rose/emerald/violet/amber, not
// e.g. indigo+violet+sky which all cluster in the same blue-purple range) so
// that when 2-3 of these appear as adjacent bands in a use case's blended
// background (see getAccentColor), every band boundary stays clearly visible
// - a middle band never gets lost between two neighbors of a similar hue.
const ACTOR_ACCENTS = [
    { from: '#3b82f6', to: '#1d4ed8' }, // blue
    { from: '#f43f5e', to: '#be123c' }, // rose
    { from: '#10b981', to: '#047857' }, // emerald
    { from: '#8b5cf6', to: '#6d28d9' }, // violet
    { from: '#f59e0b', to: '#b45309' } // amber
];

function makeGradient(from, to, attrs) {
    return {
        type: 'linearGradient',
        stops: [
            { color: from, offset: 0 },
            { color: to, offset: 1 }
        ],
        attrs
    };
}

// Everything else theme-dependent (card fill/border, ink, line, grid, badge
// colors) is driven by CSS custom properties defined in styles.css and
// consumed either as a `class` on the shape (for colors the app never
// recomputes) or read live via getCSSVar (for the accent colors that
// fillUseCaseColors() does recompute).
function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

// Card elevation, at rest and while hovered. Unlike the flat colors, this
// can't ride on a CSS class: a JointJS filter bakes its color and strength in
// when it is built, so each theme needs its own pair. The light values darken
// an already-light canvas and read as depth straight away; on the dark canvas
// (#0d1220) that same near-black at 12% changes nothing, so dark mode uses
// pure black at several times the opacity, spread over a wider blur - enough
// to actually sink the page around a card. getTheme() is read per call, and
// applyNodeShadows() re-applies the resting one when the theme is toggled.
const NODE_SHADOWS = {
    light: {
        rest: { dx: 0, dy: 3, blur: 8, color: '#0f172a', opacity: 0.12 },
        hover: { dx: 0, dy: 6, blur: 16, color: '#0f172a', opacity: 0.2 }
    },
    dark: {
        rest: { dx: 0, dy: 4, blur: 12, color: '#000000', opacity: 0.5 },
        hover: { dx: 0, dy: 8, blur: 22, color: '#000000', opacity: 0.85 }
    }
};

function nodeShadow(state) {
    return {
        name: 'dropShadow',
        args: NODE_SHADOWS[getTheme()][state]
    };
}

function gridOptions() {
    return { name: 'dot', args: { color: getCSSVar('--uc-grid-dot'), thickness: 1 }};
}

// A tiny 2x2 grid glyph (a "frame/group" icon) drawn as four small squares,
// used as the boundary's corner mark. Fixed pixel coordinates - it sits at a
// constant offset from the card's top-left corner regardless of card size.
function squarePath(x, y, size) {
    return `M ${x} ${y} h ${size} v ${size} h ${-size} Z`;
}

const BOUNDARY_ICON_X = 26;
const BOUNDARY_ICON_Y = 24;
const BOUNDARY_ICON_SIZE = 14;
const BOUNDARY_ICON_GAP = 3;
const BOUNDARY_LABEL_GAP = 12;
const boundaryIconSquare = (BOUNDARY_ICON_SIZE - BOUNDARY_ICON_GAP) / 2;
const BOUNDARY_ICON_D = [
    squarePath(BOUNDARY_ICON_X, BOUNDARY_ICON_Y, boundaryIconSquare),
    squarePath(BOUNDARY_ICON_X + boundaryIconSquare + BOUNDARY_ICON_GAP, BOUNDARY_ICON_Y, boundaryIconSquare),
    squarePath(BOUNDARY_ICON_X, BOUNDARY_ICON_Y + boundaryIconSquare + BOUNDARY_ICON_GAP, boundaryIconSquare),
    squarePath(BOUNDARY_ICON_X + boundaryIconSquare + BOUNDARY_ICON_GAP, BOUNDARY_ICON_Y + boundaryIconSquare + BOUNDARY_ICON_GAP, boundaryIconSquare)
].join(' ');

// --- UseCase: the UML notation for a use case is an ellipse containing only
// its name - no icon or chip, just the centered title.
const CARD_WIDTH = 220;
const CARD_HEIGHT = 90;
// Use-case body gradients (see getAccentColor) need this card's own real
// pixel coordinates rather than 0-1 fractional (objectBoundingBox) ones: on
// this ~2.4:1 (220x90) card, a fractional tilt gets stretched far more on the
// short axis than the long one, so each band's boundary lands at a noticeably
// different x between the card's top and bottom edge. Real pixel coordinates
// don't have that distortion, so a "slight" y2 tilt here stays genuinely
// slight and every band stays the same width top-to-bottom.
const CARD_GRADIENT_ATTRS = { gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: CARD_WIDTH, y2: 20 };
const NEUTRAL_GRADIENT = makeGradient('#64748b', '#475569', CARD_GRADIENT_ATTRS);
// Plain centered text, no icon - the canonical UML use-case notation. How
// wide the title can wrap before crowding the ellipse's own curve: checked
// against the ellipse equation ((dx/rx)^2 + (dy/ry)^2 <= 1) for the
// worst-case corner - the outer edge of a full 3-line title - with rx=110,
// ry=45, half-title-height for 3 lines of a 14px/1.4em font (~19.6px each) =
// 29.4: (80/110)^2 + (29.4/45)^2 =~ 0.96, safely (if snugly) inside.
const UC_TITLE_WRAP_WIDTH = 160;

// --- Actor: the UML notation for an actor is a stick figure standing free on
// the canvas, name centered below it - no card, no icon chip. `ACTOR_WIDTH`
// is wider than the figure itself only so a long actor name still has room to
// wrap across two lines beneath it; the figure and the ports both stay
// centered on/near the figure's own narrower footprint (see ACTOR_PORTS),
// not spread out to this wider box's edges.
const ACTOR_WIDTH = 160;
const ACTOR_HEIGHT = 120;
const ACTOR_CX = ACTOR_WIDTH / 2;

// How tall a reserved label area to center the figure+name block around - the
// actual wrapped line count isn't known until render time, so callers with a
// short one-line name (e.g. "Community") pass ACTOR_LABEL_ONE_LINE instead of
// letting the two-line default push the block off-true-center (see
// computeActorGeometry / createActor's `lines` argument).
const ACTOR_LABEL_TWO_LINES = 40;
const ACTOR_LABEL_ONE_LINE = 20;

function centerY(offset) {
    const rounded = Math.round(offset * 100) / 100;
    return `calc(0.5 * h ${rounded < 0 ? '-' : '+'} ${Math.abs(rounded)})`;
}

// Stick figure proportions: a head circle, a vertical body line, a horizontal
// arms line crossing it, and two legs splaying out from its foot - the
// classic UML actor glyph, stroked in the actor's own accent color rather
// than plain black (see createActor).
const FIGURE_STROKE_WIDTH = 2.25;
const FIGURE_HEAD_R = 9;
const FIGURE_ARM_HALF = 14;
const FIGURE_ARM_DROP = 7; // arms sit this far below the head
const FIGURE_BODY_LEN = 20; // head-bottom to where the legs start
const FIGURE_LEG_HALF = 11;
const FIGURE_LEG_LEN = 18;
const FIGURE_HEIGHT = FIGURE_HEAD_R * 2 + FIGURE_BODY_LEN + FIGURE_LEG_LEN;
const FIGURE_GAP = 10; // figure-to-label gap

function computeActorGeometry(labelAllowance) {
    const blockHalf = (FIGURE_HEIGHT + FIGURE_GAP + labelAllowance) / 2;
    const bodyTopExpr = centerY(-blockHalf + FIGURE_HEAD_R * 2);
    const armYExpr = centerY(-blockHalf + FIGURE_HEAD_R * 2 + FIGURE_ARM_DROP);
    const bodyBottomExpr = centerY(-blockHalf + FIGURE_HEAD_R * 2 + FIGURE_BODY_LEN);
    const legBottomExpr = centerY(-blockHalf + FIGURE_HEIGHT);
    return {
        headCyExpr: centerY(-blockHalf + FIGURE_HEAD_R),
        // Where the ports (see ACTOR_PORTS) attach - the figure's own arm
        // height, a natural "shoulder" point to connect to, rather than the
        // bounding box's generic vertical center (which sits well below the
        // arms, down near the legs).
        armYExpr,
        labelTopExpr: centerY(-blockHalf + FIGURE_HEIGHT + FIGURE_GAP),
        figureD: `M ${ACTOR_CX} ${bodyTopExpr} L ${ACTOR_CX} ${bodyBottomExpr} `
            + `M ${ACTOR_CX - FIGURE_ARM_HALF} ${armYExpr} L ${ACTOR_CX + FIGURE_ARM_HALF} ${armYExpr} `
            + `M ${ACTOR_CX} ${bodyBottomExpr} L ${ACTOR_CX - FIGURE_LEG_HALF} ${legBottomExpr} `
            + `M ${ACTOR_CX} ${bodyBottomExpr} L ${ACTOR_CX + FIGURE_LEG_HALF} ${legBottomExpr}`
    };
}

const ACTOR_GEOMETRY_DEFAULT = computeActorGeometry(ACTOR_LABEL_TWO_LINES);

const shapes = { ...defaultShapes };
const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    el: document.getElementById('paper'),
    width: '100%',
    height: '100%',
    model: graph,
    async: true,
    multiLinks: false,
    linkPinning: false,
    // Ports are the only magnets (every element root sets `magnet: false`), so
    // an arrowhead has to find one to connect. This keeps that easy: it snaps
    // to the nearest valid port within the radius, rather than asking anyone to
    // hit the port itself. A radius of 125 covers a whole use-case ellipse -
    // its own two ports sit exactly at its left/right tips, so the farthest
    // any point on its outline (top or bottom center) ever gets from its
    // nearer port is sqrt(rx^2 + ry^2) = sqrt(110^2 + 45^2) =~ 119.
    snapLinks: { radius: 125 },
    // Light up every port the dragged end could legally land on, so the valid
    // targets read before the pointer is anywhere near them. It marks them
    // with the `available-magnet` class (styles.css picks it up) - only ports
    // carry it, since the element roots are `magnet: false`.
    markAvailable: true,
    cellViewNamespace: shapes,
    // Explicit rather than relying on the (already-transparent) default - the
    // canvas's own radial-glow background (#paper-container in styles.css)
    // shows through the paper itself, rather than the paper painting a solid
    // color over it.
    background: { color: 'transparent' },
    // The same grid @joint/react's Paper preset draws by default: a 1px dot on
    // every 10px step. Denser and in a tone with some contrast against the
    // canvas (see --uc-grid-dot), so the canvas reads as a work surface
    // instead of near-blank paper. In plain @joint/core, `gridSize` drives
    // both the grid's visual spacing and its (currently unused - nothing in
    // this demo snaps to it) snap-to-grid step; there's no separate option to
    // set them independently the way some wrapper packages offer.
    gridSize: 10,
    // Hoisted function declaration - the grid color has to be re-read whenever
    // the theme changes, so it is built in one place both this and the theme
    // toggle's setGrid() call use, rather than spelled out twice.
    drawGrid: gridOptions(),
    // Every link end sits on a port (see PORTS below and endPorts()), so the
    // line stops at the port's own dot rather than being pushed out to an
    // element boundary it no longer starts from.
    defaultAnchor: {
        name: 'center',
        args: {
            useModelGeometry: true
        }
    },
    defaultConnectionPoint: {
        name: 'anchor'
    },
    // Hoisted function declaration - see smoothConnector further down.
    defaultConnector: smoothConnector,
    // `Use` isn't defined yet at this point in the file, but this factory only
    // runs later (when a user actually drags a new link), by which time the
    // class exists - so newly-drawn links get the same styling/markers as the
    // ones built at load time, not a bare default `dia.Link`.
    defaultLink: () => new Use(),
    highlighting: {
        connecting: {
            name: 'mask',
            options: {
                attrs: {
                    stroke: '#6366f1',
                    'stroke-width': 3
                }
            }
        },
        // `highlighting` replaces JointJS's own defaults wholesale rather than
        // merging into them, so these two have to be restated - without them
        // markAvailable above has no highlighter to mark anything with.
        magnetAvailability: {
            name: 'addClass',
            options: { className: 'available-magnet' }
        },
        elementAvailability: {
            name: 'addClass',
            options: { className: 'available-cell' }
        }
    },
    restrictTranslate: function(elementView) {
        const parent = elementView.model.getParentCell();
        if (parent) {
            // use cases movement is constrained by the parent area
            return parent.getBBox().inflate(-6);
        }
        return null;
    },
    validateConnection: function(cellViewS, _, cellViewT) {
        if (cellViewT.model instanceof UseCase) return true;
        return false;
    }
});

paperContainer.appendChild(paper.el);

class Boundary extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'Boundary',
            attrs: {
                root: {
                    cursor: 'move',
                    // Only ports connect - see the port section below.
                    magnet: false
                },
                // No drop-shadow filter here on purpose: applied to this shape
                // (800x1150, the one genuinely large element in the diagram)
                // it silently clips the rect's own fill part-way down - a
                // browser filter-region/texture-size limit for large filtered
                // shapes, not anything about this element's declared size.
                // Small nodes (Actor/UseCase) are well under that ceiling and
                // keep their own shadow via `nodeShadow()`.
                // The UML system boundary is a plain rectangle - a small
                // corner radius keeps it from looking harshly blunt, but
                // nowhere near the fully-rounded "card" look the other
                // shapes had before.
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    strokeWidth: 1.5,
                    rx: 6,
                    ry: 6
                },
                icon: {
                    d: BOUNDARY_ICON_D
                },
                label: {
                    x: BOUNDARY_ICON_X + BOUNDARY_ICON_SIZE + BOUNDARY_LABEL_GAP,
                    y: BOUNDARY_ICON_Y + BOUNDARY_ICON_SIZE / 2,
                    textAnchor: 'start',
                    textVerticalAnchor: 'middle',
                    fontSize: 14.5,
                    fontFamily: FONT_FAMILY,
                    fontWeight: 600,
                    letterSpacing: '0.02em'
                }
            }
        };
    }

    preinitialize(...args) {
        super.preinitialize(...args);
        // Title reads like a canvas frame/group label (small icon + caption in
        // the top-left corner) rather than a centered UML caption banner.
        this.markup = util.svg`
            <rect @selector="body" class="uc-boundary-card" />
            <path @selector="icon" class="uc-muted-fill" />
            <text @selector="label" class="uc-muted-text" />
        `;
    }
}

// Small magnet dots on the left/right side of Actor and UseCase, both via
// JointJS's own ports API (`dia.Element` port groups) instead of splicing
// custom circles into each shape's own markup - the 'left'/'right' port
// layouts already center a single port vertically and reposition it on
// resize, so no hand-written `calc(w)` position math is needed here. The two
// shapes don't share one ports config, though (see PORTS vs ACTOR_PORTS
// below): they do share this same dot/hit-circle markup and styling. Each
// port's own markup carries two elements: a small visible dot (PORT_RADIUS)
// plus a larger circle (PORT_HIT_RADIUS) stacked on top, so the area you can
// grab is bigger than what's drawn - invisible until hovered, when it shows as
// a faint tinted disc. `magnet: true`
// sits on the port's own root (covering both circles), with magnetSelector /
// highlighterSelector pointing back at the dot - the link attaches to the dot
// and the connecting highlight lands on it, however wide the grab area is.
// These ports are the only magnets in the diagram: every element's root sets
// `magnet: false`, so a link can't attach to a bare card, only to a dot.
// Ports render inside their own `<g class="joint-port">` container
// automatically, which CSS below uses to scope the dot's hover feedback to
// the side actually being hovered.
const PORT_RADIUS = 5;
// Wide enough to press without aiming, but no wider: the ports sit halfway up
// a card that is only 90 tall, so a hit circle much bigger than this owns most
// of the card's left and right edge and the card gets hard to pick up by its
// side. Dropping a link doesn't depend on this at all - snapLinks (see the
// paper options) catches an arrowhead released anywhere on the card.
const PORT_HIT_RADIUS = 10;

const PORT_MARKUP = [
    { tagName: 'circle', selector: 'portDot' },
    { tagName: 'circle', selector: 'portHit' }
];

const PORT_ATTRS = {
    portRoot: { magnetSelector: 'portDot', highlighterSelector: 'portDot', magnet: true },
    portDot: { cx: 0, cy: 0, r: PORT_RADIUS, class: 'uc-link-dot uc-port' },
    // No `fill` here - styles.css owns it, so the hover tint can transition in
    // from the same place (a CSS rule wins over a presentation attribute
    // anyway, so setting it here too would just be dead weight).
    portHit: { cx: 0, cy: 0, r: PORT_HIT_RADIUS, class: 'uc-port-hit' }
};

const PORT_GROUPS = {
    left: { position: 'left', markup: PORT_MARKUP, attrs: PORT_ATTRS },
    right: { position: 'right', markup: PORT_MARKUP, attrs: PORT_ATTRS }
};

// Fixed port ids (rather than the generated ones a port without an `id` gets)
// so a link can name the side it attaches to - see endPorts().
const PORTS = {
    groups: PORT_GROUPS,
    items: [
        { id: 'left', group: 'left' },
        { id: 'right', group: 'right' }
    ]
};

// The actor's own ports: same dot/hit markup and styling as PORTS above, but
// repositioned in both directions rather than sitting at the box's default
// left/right-edge-at-vertical-center spot:
// - x is pulled in to sit just past the stick figure's own arm-span - the
//   figure is much narrower than the box reserved for its (possibly
//   two-line) name, so the box edges the way UseCase's ports use would leave
//   the dots floating in empty space, far from the figure a connecting line
//   is actually supposed to read as touching.
// - y is raised to the figure's own arm height (see computeActorGeometry's
//   armYExpr) instead of the box's generic vertical center, which sits well
//   below the arms, down near the legs - the "shoulder" height a connecting
//   line would naturally touch, not a point with no relation to the figure.
//   This uses the two-line-name default for every actor (ports are one
//   static config, not per-instance like the figure/label itself), so it's
//   a few pixels off for the one one-line actor (see createActor's `lines`
//   argument) - unnoticeable next to fixing the actual, much larger mismatch.
const ACTOR_PORT_GAP = 14;
const ACTOR_PORT_LEFT_X = ACTOR_CX - FIGURE_ARM_HALF - ACTOR_PORT_GAP;
const ACTOR_PORT_RIGHT_X = ACTOR_CX + FIGURE_ARM_HALF + ACTOR_PORT_GAP;
const ACTOR_PORT_Y = ACTOR_GEOMETRY_DEFAULT.armYExpr;

const ACTOR_PORTS = {
    groups: {
        left: { position: { name: 'left', args: { x: ACTOR_PORT_LEFT_X, y: ACTOR_PORT_Y }}, markup: PORT_MARKUP, attrs: PORT_ATTRS },
        right: { position: { name: 'right', args: { x: ACTOR_PORT_RIGHT_X, y: ACTOR_PORT_Y }}, markup: PORT_MARKUP, attrs: PORT_ATTRS }
    },
    items: [
        { id: 'left', group: 'left' },
        { id: 'right', group: 'right' }
    ]
};

class Actor extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'Actor',
            size: { width: ACTOR_WIDTH, height: ACTOR_HEIGHT },
            ports: ACTOR_PORTS,
            attrs: {
                root: {
                    cursor: 'move',
                    // Only ports connect - see PORT_ATTRS.
                    magnet: false
                },
                // A plain, invisible full-size rect purely so the actor stays
                // easy to grab and drag anywhere in its bounding box - with no
                // card body, only the thin figure lines and the label text
                // would otherwise be clickable.
                hitArea: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: 'transparent'
                },
                // Stick figure: stroked in the actor's own accent (set
                // per-instance in createActor), no fill - the UML actor glyph,
                // not a filled icon.
                iconHead: {
                    cx: ACTOR_CX,
                    cy: ACTOR_GEOMETRY_DEFAULT.headCyExpr,
                    r: FIGURE_HEAD_R,
                    fill: 'none',
                    strokeWidth: FIGURE_STROKE_WIDTH,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round'
                },
                icon: {
                    d: ACTOR_GEOMETRY_DEFAULT.figureD,
                    fill: 'none',
                    strokeWidth: FIGURE_STROKE_WIDTH,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round'
                },
                label: {
                    x: 'calc(0.5 * w)',
                    y: ACTOR_GEOMETRY_DEFAULT.labelTopExpr,
                    textAnchor: 'middle',
                    textVerticalAnchor: 'top',
                    fontSize: 14,
                    lineHeight: '1.4em',
                    fontFamily: FONT_FAMILY,
                    fontWeight: 600,
                    textWrap: {
                        width: 'calc(w - 20)',
                        height: 'calc(0.5 * h - 8)',
                        ellipsis: true
                    }
                }
            }
        };
    }

    preinitialize(...args) {
        super.preinitialize(...args);
        this.markup = util.svg`
            <rect @selector="hitArea" />
            <path @selector="icon" />
            <circle @selector="iconHead" />
            <text @selector="label" class="uc-ink-text" />
        `;
    }
}

class UseCase extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'UseCase',
            size: { width: CARD_WIDTH, height: CARD_HEIGHT },
            ports: PORTS,
            attrs: {
                root: {
                    highlighterSelector: 'body',
                    cursor: 'move',
                    // Only ports connect - see PORT_ATTRS.
                    magnet: false
                },
                // Like the original demo, the "which actor(s) use this" accent
                // is the whole ellipse's background (see fillUseCaseColors),
                // so it stays unmistakable at a glance. The outline is a
                // constant ink tone (theme-reactive, not per-instance) so the
                // border still reads against any accent color/gradient.
                body: {
                    cx: 'calc(0.5 * w)',
                    cy: 'calc(0.5 * h)',
                    rx: 'calc(0.5 * w)',
                    ry: 'calc(0.5 * h)',
                    strokeWidth: 1.5,
                    filter: nodeShadow('rest')
                },
                label: {
                    x: 'calc(0.5 * w)',
                    y: 'calc(0.5 * h)',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    fontSize: 14,
                    lineHeight: '1.4em',
                    fontFamily: FONT_FAMILY,
                    fontWeight: 600,
                    fill: '#ffffff',
                    textWrap: {
                        width: UC_TITLE_WRAP_WIDTH,
                        height: 'calc(h - 12)',
                        ellipsis: true
                    }
                }
            }
        };
    }

    preinitialize(...args) {
        super.preinitialize(...args);
        this.markup = util.svg`
            <ellipse @selector="body" class="uc-node-stroke" />
            <text @selector="label" />
        `;
    }
}

// Smooth link routing in the spirit of @joint/react's smoothLinkRouting():
// JointJS's own `curve` connector draws the line, this wrapper only tells it
// which way to leave each end. Left to itself, `curve` works that out from the
// end's magnet - and here every magnet is a port dot, a small circle the link
// ends in the middle of, so "which side of it are we on" has no answer. The
// port id does have one, and 'left'/'right' happen to be exactly the tangent
// directions `curve` accepts.
//
// The two coefficients pull its tangents in from the defaults (0.6 and 80).
// The second one only bites where the curve leaves sideways but has to travel
// straight up or down - two cards in the same column - and at its default that
// bow swings out far enough to crowd the next column.
const CURVE_ARGS = {
    distanceCoefficient: 0.45,
    angleTangentCoefficient: 10
};

function smoothConnector(sourcePoint, targetPoint, route, opt, linkView) {
    const link = linkView.model;
    return connectors.curve.call(linkView, sourcePoint, targetPoint, route, {
        ...opt,
        ...CURVE_ARGS,
        sourceDirection: portDirection(link.source(), sourcePoint, targetPoint),
        targetDirection: portDirection(link.target(), targetPoint, sourcePoint)
    }, linkView);
}

// The side an end's port sits on, which is also the way the curve leaves it.
// An arrowhead being dragged isn't on a port yet, so it just faces the other
// end.
function portDirection(end, point, otherPoint) {
    if (end.port === 'left' || end.port === 'right') return end.port;
    return otherPoint.x < point.x ? 'left' : 'right';
}

class Use extends shapes.standard.Link {
    defaults() {
        return util.defaultsDeep(
            {
                type: 'Use',
                attrs: {
                    // No end markers: both ends land exactly on a port, whose
                    // own dot already terminates the line. A marker drawn there
                    // sits right on top of that dot and only thickens it - see
                    // the note on lineAttrs below. `targetMarker: null` is
                    // needed rather than just leaving it out, to suppress the
                    // arrowhead standard.Link brings with it.
                    line: {
                        class: 'uc-link-line',
                        strokeWidth: 1.75,
                        targetMarker: null
                    }
                }
            },
            super.defaults
        );
    }
}

// Shared by Include and Extend. Only the target keeps a marker, and it carries
// meaning - the open arrow that says which way the relationship reads. The
// source end has no marker for the same reason Use has none: it finishes on a
// port dot, and a circle drawn over that dot just makes the port look heavier
// than it is (the connection point is the port's center, not a point offset
// off the card's edge as it was before ports).
const lineAttrs = {
    class: 'uc-link-line',
    strokeWidth: 1.75,
    strokeDasharray: '5,4',
    targetMarker: {
        type: 'path',
        class: 'uc-link-line',
        fill: 'none',
        strokeWidth: 1.75,
        d: 'M 8 -4 0 0 8 4'
    }
};

function createStereotypeLabel(text, kind) {
    return {
        position: 0.5,
        markup: util.svg`
            <rect @selector="labelBody" class="uc-${kind}-badge-fill" />
            <text @selector="labelText" class="uc-${kind}-badge-text" />
        `,
        attrs: {
            labelText: {
                text,
                fontSize: 11,
                fontFamily: FONT_FAMILY,
                fontWeight: 600,
                letterSpacing: '0.01em',
                textAnchor: 'middle',
                textVerticalAnchor: 'middle'
            },
            labelBody: {
                ref: 'labelText',
                x: 'calc(x - 7)',
                y: 'calc(y - 3)',
                width: 'calc(w + 14)',
                height: 'calc(h + 6)',
                rx: 9,
                ry: 9,
                strokeWidth: 1
            }
        }
    };
}

class Include extends shapes.standard.Link {
    defaults() {
        return util.defaultsDeep(
            {
                type: 'Include',
                attrs: {
                    line: lineAttrs
                },
                labels: [createStereotypeLabel('«include»', 'include')]
            },
            super.defaults
        );
    }
}

class Extend extends shapes.standard.Link {
    defaults() {
        return util.defaultsDeep(
            {
                type: 'Extend',
                attrs: {
                    line: lineAttrs
                },
                labels: [createStereotypeLabel('«extend»', 'extend')]
            },
            super.defaults
        );
    }
}

Object.assign(shapes, {
    Boundary,
    Actor,
    UseCase,
    Use,
    Include,
    Extend
});

function createActor(name, x, y, accent, lines = 2) {
    // A one-line name (e.g. "Community") gets its own geometry so the
    // icon+name block centers on that shorter block, not the two-line
    // default - otherwise it'd sit visibly above true-center, with the
    // reserved second line's space left empty below it.
    const geometry = lines === 1
        ? computeActorGeometry(ACTOR_LABEL_ONE_LINE)
        : ACTOR_GEOMETRY_DEFAULT;
    const actor = new Actor({
        position: {
            x,
            y
        },
        attrs: {
            iconHead: {
                stroke: accent.to,
                cy: geometry.headCyExpr
            },
            icon: {
                stroke: accent.to,
                d: geometry.figureD
            },
            label: {
                text: name,
                y: geometry.labelTopExpr
            }
        }
    });
    // Stashed as plain model data (not under `attrs`) so fillUseCaseColors()
    // can read back the actor's own {from, to} pair - not just a flat color -
    // when it recomputes a connected use case's gradient.
    actor.prop('accent', accent);
    return actor;
}

function createUseCase(useCase, x, y) {
    return new UseCase({
        position: {
            x,
            y
        },
        attrs: {
            label: {
                text: useCase
            }
        }
    });
}

// Which port each end of a link attaches to. A left-right pair uses the two
// facing sides; a pair in the same column uses the same side on both - the one
// facing the frame's middle, which keeps the connector clear of the outer lane
// where the actor links run.
function endPorts(source, target) {
    const sourceX = source.getBBox().center().x;
    const targetX = target.getBBox().center().x;
    if (sourceX < targetX) return ['right', 'left'];
    if (sourceX > targetX) return ['left', 'right'];
    // `boundary` is declared further down, but this only ever runs from the
    // graph.addCells() call at the end of the file, by which time it exists.
    const inner = sourceX > boundary.getBBox().center().x ? 'left' : 'right';
    return [inner, inner];
}

// Both ends name a port, so every link in the diagram starts and finishes on
// one of the dots the user can grab - the same anchoring a link drawn by hand
// gets, since ports are the only magnets on a card.
function createLink(Constructor, source, target) {
    const [sourcePort, targetPort] = endPorts(source, target);
    return new Constructor({
        source: { id: source.id, port: sourcePort },
        target: { id: target.id, port: targetPort }
    });
}

function createUse(source, target) {
    return createLink(Use, source, target);
}

function createInclude(source, target) {
    return createLink(Include, source, target);
}

function createExtend(source, target) {
    return createLink(Extend, source, target);
}

const boundary = new Boundary({
    size: {
        width: 800,
        // Extra height beyond the lowest embedded use case (bottom row ends
        // at y=1010) gives a clear, generous margin so the last row reads as
        // unmistakably inside the frame, not hugging its edge.
        height: 1150
    },
    position: {
        x: 260,
        y: 100
    },
    attrs: {
        label: {
            text: 'JointJS Support System'
        }
    }
});

// Actor Y positions are chosen to center each column on the boundary's own
// vertical span (y:100-1250) rather than clustering low - techSupport, which
// fans out to nearly every use case, sits near the middle; the others land
// close to the row(s) they actually connect to.
const packageHolder = createActor(
    'JointJS+ Support Package Subscriber',
    20,
    350,
    ACTOR_ACCENTS[0]
);
const jointJSPlusUser = createActor(
    'JointJS+ User\n(Commercial)',
    20,
    650,
    ACTOR_ACCENTS[1]
);
const jointJSUser = createActor(
    'JointJS User\n(Open Source)',
    20,
    900,
    ACTOR_ACCENTS[2]
);
const techSupport = createActor(
    'JointJS Technical Support',
    1120,
    480,
    ACTOR_ACCENTS[3]
);
const community = createActor('JointJS Community', 1120, 900, ACTOR_ACCENTS[4], 1);

// Y positions are shifted +95 from a naive top-packed layout so the use-case
// block (150-1010 originally) centers within the boundary's own vertical
// span (100-1250) instead of leaving nearly all the slack at the bottom.
const requestCodeReview = createUseCase('Request Code Review', 420, 245);
const reviewCode = createUseCase('Review Code', 720, 245);
const giveFeedback = createUseCase('Give Feedback', 720, 385);
const proposeChanges = createUseCase('Propose Changes', 720, 520);
const requestConferenceCall = createUseCase('Request Conference Call', 420, 445);
const proposeTimeAndDateOfCall = createUseCase('Propose Time and Date of Call', 420, 620);
const attendConferenceCall = createUseCase('Attend Conference Call', 420, 795);
const contactViaTicketingSystem = createUseCase('Contact via Ticketing System', 420, 920);
const respondToTicket = createUseCase('Respond to Ticket', 720, 920);
const askGithubDiscussion = createUseCase('Ask on GitHub Discussion', 420, 1045);
const respondToDiscussion = createUseCase('Respond to Discussion', 720, 1045);

boundary.embed([
    requestCodeReview,
    reviewCode,
    giveFeedback,
    proposeChanges,
    requestConferenceCall,
    proposeTimeAndDateOfCall,
    attendConferenceCall,
    contactViaTicketingSystem,
    respondToTicket,
    askGithubDiscussion,
    respondToDiscussion
]);

graph.addCells([
    boundary,
    packageHolder,
    jointJSPlusUser,
    jointJSUser,
    techSupport,
    community,
    requestCodeReview,
    reviewCode,
    giveFeedback,
    proposeChanges,
    requestConferenceCall,
    proposeTimeAndDateOfCall,
    attendConferenceCall,
    contactViaTicketingSystem,
    respondToTicket,
    askGithubDiscussion,
    respondToDiscussion,
    createUse(packageHolder, requestCodeReview),
    createUse(packageHolder, requestConferenceCall),
    createUse(packageHolder, attendConferenceCall),
    createUse(packageHolder, contactViaTicketingSystem),
    createUse(packageHolder, askGithubDiscussion),
    createUse(jointJSPlusUser, contactViaTicketingSystem),
    createUse(jointJSPlusUser, askGithubDiscussion),
    createUse(jointJSUser, askGithubDiscussion),
    createUse(techSupport, reviewCode),
    createUse(techSupport, giveFeedback),
    createUse(techSupport, proposeChanges),
    createUse(techSupport, proposeTimeAndDateOfCall),
    createUse(techSupport, attendConferenceCall),
    createUse(techSupport, respondToTicket),
    createUse(techSupport, respondToDiscussion),
    createUse(community, respondToDiscussion),
    createExtend(proposeChanges, giveFeedback),
    createInclude(reviewCode, requestCodeReview),
    createInclude(giveFeedback, reviewCode),
    createInclude(proposeTimeAndDateOfCall, requestConferenceCall),
    createInclude(attendConferenceCall, proposeTimeAndDateOfCall),
    createInclude(respondToTicket, contactViaTicketingSystem),
    createInclude(respondToDiscussion, askGithubDiscussion)
]);

// `accents` is a list of the connected actors' own {from, to} pairs. One
// actor -> that actor's own smooth two-stop gradient. Several actors -> each
// actor gets its own equal-width band (from -> to, a gentle gradient), with a
// hard break at every band boundary - so it stays obvious at a glance how
// many distinct actors use this and where one's color ends and the next
// begins, while no single band is a flat, dated-looking solid.
function getAccentColor(accents) {
    if (accents.length === 0) return NEUTRAL_GRADIENT;
    if (accents.length === 1) return makeGradient(accents[0].from, accents[0].to, CARD_GRADIENT_ATTRS);

    const step = 1 / accents.length;
    const stops = accents.flatMap((accent, index) => [
        { color: accent.from, offset: index * step },
        { color: accent.to, offset: (index + 1) * step }
    ]);

    return {
        type: 'linearGradient',
        stops,
        attrs: CARD_GRADIENT_ATTRS
    };
}

// Same "half-color" use case as the original demo: `body/fill` (the whole
// card) takes the connected actors' blended color/gradient directly - one
// actor's color solid, several actors' colors as a smooth multi-stop gradient
// - so it's unmistakable at a glance.
function recolorUseCase(useCase) {
    const useCaseActors = graph
        .getNeighbors(useCase, { inbound: true })
        .filter((el) => el instanceof Actor);
    const accent = getAccentColor(useCaseActors.map((actor) => actor.prop('accent')));
    useCase.attr('body/fill', accent, { rewrite: true });
}

function fillUseCaseColors() {
    graph.getElements().forEach((element) => {
        if (element instanceof UseCase) recolorUseCase(element);
    });
}

// The filter each card was built with holds the colors of the theme that was
// active at the time, so a theme change has to hand every card the other
// theme's shadow (see NODE_SHADOWS). A card hovered at that exact moment drops
// back to its resting shadow until the pointer leaves and re-enters. Actors
// have no card body to shadow - a bare stick figure - so only UseCase needs
// this.
function applyNodeShadows() {
    graph.getElements().forEach((element) => {
        if (element instanceof UseCase) {
            element.attr('body/filter', nodeShadow('rest'), { rewrite: true });
        }
    });
}

fillUseCaseColors();

// A connect/disconnect only ever changes the coloring of the one use case at
// the end that actually changed (the `elementView*` argument the event
// itself carries - not necessarily the link's current target: dragging an
// *existing* link's target arrowhead elsewhere, which the hover `TargetArrowhead`
// tool below allows, fires `link:disconnect` for the use case it left and
// `link:connect` for the one it landed on, and both need to be recolored, not
// just the new one). Any other change to the graph's connectivity (a link,
// actor, or use case being removed, cascading embeds, and so on) can affect
// more than one use case in ways that aren't safe to pinpoint from the
// removed cell alone, so that case still recomputes every use case.
function recolorConnectedEnd(elementView) {
    const cell = elementView && elementView.model;
    if (cell instanceof UseCase) {
        recolorUseCase(cell);
    } else {
        fillUseCaseColors();
    }
}

paper.on('link:connect', (linkView, evt, elementViewConnected) => recolorConnectedEnd(elementViewConnected));
paper.on('link:disconnect', (linkView, evt, elementViewDisconnected) => recolorConnectedEnd(elementViewDisconnected));
graph.on('remove', () => fillUseCaseColors());

paper.on('link:mouseenter', (linkView) => {
    if (!(linkView.model instanceof Use)) return;
    const toolsView = new dia.ToolsView({
        tools: [
            new linkTools.TargetArrowhead({ scale: 1.2 }),
            new linkTools.Remove({ scale: 1.2 })
        ]
    });
    linkView.addTools(toolsView);
});

paper.on('link:mouseleave', (linkView) => {
    linkView.removeTools();
});

// Lift a use-case card slightly on hover for a bit of interactive feedback -
// actors have no card body to lift, just the bare stick figure.
paper.on('element:mouseenter', (elementView) => {
    if (!(elementView.model instanceof UseCase)) return;
    elementView.model.attr('body/filter', nodeShadow('hover'), { rewrite: true });
});

paper.on('element:mouseleave', (elementView) => {
    if (!(elementView.model instanceof UseCase)) return;
    elementView.model.attr('body/filter', nodeShadow('rest'), { rewrite: true });
});

const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    const next = getTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
        localStorage.setItem('uc-theme', next);
    } catch {
        // localStorage unavailable (e.g. private mode) - theme just won't persist.
    }
    paper.setGrid(gridOptions());
    fillUseCaseColors();
    applyNodeShadows();
});

function scaleToFit() {
    const graphBBox = graph.getBBox();
    paper.scaleContentToFit({
        padding: 50,
        contentArea: graphBBox
    });
    const { sy } = paper.scale();
    const area = paper.getArea();
    const yTop = area.height / 2 - graphBBox.y - graphBBox.height / 2;
    const xLeft = area.width / 2 - graphBBox.x - graphBBox.width / 2;
    paper.translate(xLeft * sy, yTop * sy);
}

scaleToFit();
