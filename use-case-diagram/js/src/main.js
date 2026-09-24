import { shapes as defaultShapes, dia, util, linkTools, elementTools } from '@joint/core';
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

// JointJS brand mark - part of the boundary's own content (bottom-right
// corner of the system frame), not paper chrome, so it lives in the
// Boundary's own markup/attrs and moves with it rather than sitting fixed
// over the canvas. `calc(w)`/`calc(h)` position it off the boundary's own
// size, so it stays in the corner regardless of the boundary's size.
const BOUNDARY_LOGO_WIDTH = 250;
const BOUNDARY_LOGO_HEIGHT = BOUNDARY_LOGO_WIDTH * (280 / 1000);
const BOUNDARY_LOGO_PAD = 20;

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
// wrap across two lines beneath it; the figure stays centered on the box's
// own (narrower) center rather than stretching to fill it.
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
    // No ports: an element's own root is left with no explicit `magnet`
    // attribute at all (see Actor/UseCase below), which - per dia.CellView's
    // own magnet resolution - makes the *whole shape* a valid connection
    // point (source or target) without that alone making the shape draggable
    // into a new link (that still needs a deliberate gesture - see the
    // `elementTools.Connect` button added on hover further down). So a
    // dropped arrowhead can land anywhere on a use-case ellipse or actor
    // figure - no snapping radius needed to help it find a small dot.
    // Light up every element the dragged end could legally land on, so the
    // valid targets read before the pointer is anywhere near them. It marks
    // them with the `available-cell`/`available-magnet` classes (styles.css
    // picks them up).
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
    // Aim each end at the other element's center...
    defaultAnchor: {
        name: 'center',
        args: {
            useModelGeometry: true
        }
    },
    // ...but stop the rendered line at the actual shape outline (the ellipse
    // or the figure's own bounding box) rather than drawing all the way to
    // that center point.
    defaultConnectionPoint: {
        name: 'boundary'
    },
    // Plain straight line between the two connection points - no router.
    defaultConnector: { name: 'normal' },
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
                    // Unlike Actor/UseCase, explicitly not a valid connection
                    // point at all - the boundary is just a frame, never a
                    // link's source or target.
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
                },
                logo: {
                    x: `calc(w - ${BOUNDARY_LOGO_WIDTH + BOUNDARY_LOGO_PAD})`,
                    y: `calc(h - ${BOUNDARY_LOGO_HEIGHT + BOUNDARY_LOGO_PAD})`,
                    width: BOUNDARY_LOGO_WIDTH,
                    height: BOUNDARY_LOGO_HEIGHT
                }
            }
        };
    }

    preinitialize(...args) {
        super.preinitialize(...args);
        // Title reads like a canvas frame/group label (small icon + caption in
        // the top-left corner) rather than a centered UML caption banner. The
        // JointJS brand mark gets the same corner treatment, bottom-right.
        this.markup = util.svg`
            <rect @selector="body" class="uc-boundary-card" />
            <path @selector="icon" class="uc-muted-fill" />
            <text @selector="label" class="uc-muted-text" />
            <svg @selector="logo" viewBox="0 0 1000 280">
                <path fill="#DA3D40" d="m130.71 225.71l-27.28-27.27q0-0.01 0-0.01h76.41v-103.68h27.28c0 0 0 59.4 0 98.19l-32.77 32.77zm330.37-116.97c10.68 10.41 17.29 25.87 17.29 46.13 0 20.26-6.61 35.71-17.29 46.13-10.69 10.41-25.47 15.79-41.91 15.79-16.44 0-31.22-5.38-41.91-15.79-10.68-10.42-17.29-25.87-17.29-46.13 0-20.26 6.61-35.72 17.29-46.13 10.69-10.41 25.47-15.79 41.91-15.79 16.44 0 31.22 5.38 41.91 15.79zm401.41-18.61q-8.23-7.14-22.76-7.15-11.77 0.01-18.3 5.07-6.59 5.11-6.59 14.42 0 6.67 3.47 10.89 3.42 4.18 10.27 7.59 6.77 3.37 20.96 8.6h0.01q14.98 5.85 23.95 10.62 8.92 4.74 15.31 13.26 6.38 8.48 6.38 21.16 0 12.48-6.28 22.05-6.29 9.58-18.03 14.86-11.78 5.29-27.76 5.29-15.99 0-28.09-5.4-12.05-5.39-18.55-15.18-6.49-9.79-6.49-22.71v-7.66h23.37v6.36q-0.01 10.17 8.71 16.92 8.64 6.7 22.95 6.7 13.05-0.01 19.69-5.74 6.69-5.76 6.69-14.84-0.01-6.23-3.69-10.56-3.63-4.29-10.37-7.81-6.67-3.48-20.01-8.7 0 0-0.01 0-14.98-5.64-24.27-10.63-9.23-4.95-15.42-13.46-6.16-8.49-6.16-21.17 0-18.93 13.39-29.9 13.45-11 35.93-10.99 15.77 0 27.86 5.61 12.07 5.6 18.78 15.62 6.7 10.01 6.7 23.13v5.92h-23.37v-4.61q0-10.38-8.27-17.56zm-318.54 18.35h1.52c7.2-9.6 18.63-15.53 34.94-15.53 14.12 0 25.51 4.23 33.38 12.18 7.88 7.95 12.27 19.65 12.27 34.71v74.96h-21.74v-71.71c0-9.84-2.46-17.37-7.24-22.42-4.78-5.03-11.84-7.55-20.88-7.55-10.09 0-18.19 3.05-23.74 9.4-5.05 5.79-7.99 14.26-8.51 25.47v66.53h-21.83v-119.76h21.83zm-194.95-13.73c0 0 0 63.58 0 98.2l-21.85 21.85c-10.29 0-22.53 0-32.81 0l-21.83-21.83q0 0 0 0h54.66v-98.22zm353.46 98.22l-21.83 21.83c0 0-10.89 0-21.8 0l-21.85-21.85v-130.94h21.83v32.74h32.74v21.83h-32.74v76.39h98.31v-130.96h21.83c0 0 0 88.7 0 130.94l-21.85 21.85c-10.29 0-22.53 0-32.81 0 0 0-21.83-21.83-21.83-21.83zm-213.17-98.22h21.83v119.77h-21.83zm-96.8 29.36c-6.6 7.05-10.44 17.44-10.44 30.75 0 13.3 3.84 23.69 10.44 30.74 6.57 7.02 15.86 10.69 26.68 10.69 10.82 0 20.11-3.67 26.68-10.69 6.61-7.05 10.45-17.44 10.45-30.74 0-13.31-3.84-23.7-10.45-30.75-6.57-7.01-15.86-10.69-26.68-10.69-10.82 0-20.11 3.68-26.68 10.69zm-299.99 63.38l-27.28-27.28q0 0 0 0h76.4v-103.69h27.29c0 0 0 59.4 0 98.2l-32.77 32.77zm396.79-125.48h21.82v21.82h-21.82zm-162.11 0h21.82v21.83h-21.82z" />
            </svg>
        `;
    }
}

// No ports, no dedicated magnet sub-elements: an Actor/UseCase's own root is
// left with no explicit `magnet` attribute (see both classes below), which -
// per dia.CellView#findMagnet - makes the *whole shape* resolve as a valid
// connection point on its own, without any dedicated dot to draw or
// position. A link can therefore land anywhere on a use-case ellipse or
// actor figure. Starting a *new* link is a separate, deliberate gesture -
// see the `elementTools.Connect` button added on hover further down - so
// this doesn't turn an ordinary drag-to-move into a link-drag.
class Actor extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'Actor',
            size: { width: ACTOR_WIDTH, height: ACTOR_HEIGHT },
            attrs: {
                root: {
                    cursor: 'move'
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
            attrs: {
                root: {
                    highlighterSelector: 'body',
                    cursor: 'move'
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

class Use extends shapes.standard.Link {
    defaults() {
        return util.defaultsDeep(
            {
                type: 'Use',
                attrs: {
                    // No end markers: the UML association between an actor
                    // and a use case is a plain, undirected line - no
                    // arrowhead on either end. `targetMarker: null` is needed
                    // rather than just leaving it out, to suppress the
                    // arrowhead standard.Link brings with it by default.
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
// source end has no marker, the same plain-line convention as Use.
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

// No port to name on either end - just the two elements. `defaultAnchor`/
// `defaultConnectionPoint` (see the Paper options) take care of aiming each
// end at the other element's center and stopping the line at its outline.
function createLink(Constructor, source, target) {
    return new Constructor({
        source: { id: source.id },
        target: { id: target.id }
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
        // at y=1075 - see the use-case x/y comment below) gives a clear,
        // generous margin so the last row reads as unmistakably inside the
        // frame, not hugging its edge, and stays clear of the brand mark in
        // the bottom-right corner.
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

// x is chosen so the use-case block centers horizontally within the
// boundary's own span - each ellipse is 220x90 (see CARD_WIDTH/HEIGHT), the
// left column starts at x=400 and the right one at x=700, giving a
// 140/80/140 left-margin/gap/right-margin split across the boundary's
// 800-wide interior (260-1060).
//
// y centers the block not within the boundary's full height, but within the
// "safe" zone above the brand mark (see BOUNDARY_LOGO_* / the Boundary
// class), which sits in the bottom-right corner at local y 1060-1130 (x
// 530-780) - true vertical centering (which would put the block at
// y=230-1120) would run the bottom-right use case right into it. The block
// is 890 tall; centered between the boundary's own top (local y=0) and the
// logo's top (local y=1060) gives an 85/85 top/bottom margin, so the block
// spans local y=85-975 (absolute y=185-1075).
const requestCodeReview = createUseCase('Request Code Review', 400, 185);
const reviewCode = createUseCase('Review Code', 700, 185);
const giveFeedback = createUseCase('Give Feedback', 700, 325);
const proposeChanges = createUseCase('Propose Changes', 700, 460);
const requestConferenceCall = createUseCase('Request Conference Call', 400, 385);
const proposeTimeAndDateOfCall = createUseCase('Propose Time and Date of Call', 400, 560);
const attendConferenceCall = createUseCase('Attend Conference Call', 400, 735);
const contactViaTicketingSystem = createUseCase('Contact via Ticketing System', 400, 860);
const respondToTicket = createUseCase('Respond to Ticket', 700, 860);
const askGithubDiscussion = createUseCase('Ask on GitHub Discussion', 400, 985);
const respondToDiscussion = createUseCase('Respond to Discussion', 700, 985);

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
// actors have no card body to lift, just the bare stick figure. Both Actor
// and UseCase (either can be a link's source - an actor's "Use", or a use
// case's own "Include"/"Extend") get a Connect button on hover instead: with
// no ports, and the whole shape deliberately *not* wired up to start a link
// on an ordinary drag (see the note above Actor's class), this hover button
// is the one dedicated place a user can grab to drag a new link out from.
paper.on('element:mouseenter', (elementView) => {
    const { model } = elementView;
    if (model instanceof UseCase) {
        model.attr('body/filter', nodeShadow('hover'), { rewrite: true });
    }
    if (model instanceof UseCase || model instanceof Actor) {
        elementView.addTools(new dia.ToolsView({
            tools: [
                new elementTools.Connect({
                    x: '100%',
                    y: '0%',
                    offset: { x: -6, y: 6 },
                    magnet: 'root'
                })
            ]
        }));
    }
});

paper.on('element:mouseleave', (elementView) => {
    const { model } = elementView;
    if (model instanceof UseCase) {
        model.attr('body/filter', nodeShadow('rest'), { rewrite: true });
    }
    elementView.removeTools();
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
