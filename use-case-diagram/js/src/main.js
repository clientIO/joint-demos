import { shapes as defaultShapes, dia, util, linkTools } from '@joint/core';
import './styles.css';

const paperContainer = document.getElementById('paper-container');

const FONT_FAMILY = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

// Actor accents, each a light->deep pair of the same hue rather than one flat
// tone - every accent surface (actor chip, card background) renders as a
// smooth diagonal gradient instead of a flat, dated-looking solid fill. Kept
// as literal hex (not theme CSS variables): these need real color values,
// both for the gradient stops and to blend across actors (see getAccentColor).
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

// Mostly-horizontal gradient vector with a slight tilt - bands run
// perpendicular to it (vertical-ish columns, left-to-right). Fractional
// (objectBoundingBox) coordinates are fine here since this is the default
// for makeGradient(), used on the actor's roughly-square icon chip where
// there's no width/height mismatch to stretch the tilt unevenly; the wider,
// shorter use-case card body needs its own real-pixel version of this same
// idea instead (see CARD_GRADIENT_ATTRS, defined once CARD_WIDTH is known).
const GRADIENT_ANGLE_ATTRS = { x1: 0, y1: 0, x2: 1, y2: 0.1 };

function makeGradient(from, to, attrs = GRADIENT_ANGLE_ATTRS) {
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

const nodeShadow = {
    name: 'dropShadow',
    args: { dx: 0, dy: 3, blur: 8, color: '#0f172a', opacity: 0.12 }
};

const nodeShadowHover = {
    name: 'dropShadow',
    args: { dx: 0, dy: 6, blur: 16, color: '#0f172a', opacity: 0.2 }
};

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

// --- Actor and UseCase share one "node card" recipe (icon chip + title row) -
// modeled directly on the AI Workflow Builder's node header: a small tinted,
// ring-outlined icon chip identifies the node, sized text sits to its right.
// The card border/fill stays neutral (theme-driven); the accent color only
// ever shows up on the chip fill/ring and the icon itself.
const CARD_WIDTH = 180;
const CARD_HEIGHT = 60;
// Use-case body gradients (see getAccentColor) need this card's own real
// pixel coordinates rather than GRADIENT_ANGLE_ATTRS's 0-1 fractional ones:
// on this 3:1 (180x60) card, a fractional tilt gets stretched far more on
// the short axis than the long one, so each band's boundary lands at a
// noticeably different x between the card's top and bottom edge. Real
// pixel coordinates don't have that distortion, so a "slight" y2 tilt here
// stays genuinely slight and every band stays the same width top-to-bottom.
const CARD_GRADIENT_ATTRS = { gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: CARD_WIDTH, y2: 20 };
const NEUTRAL_GRADIENT = makeGradient('#64748b', '#475569', CARD_GRADIENT_ATTRS);
// The chip sits on the card's own accent color/gradient (that's where the
// "which actor(s) use this" half-color lives - see getAccentColor), so its
// fill stays mostly-white for contrast rather than tinted the same accent
// (which would just blend in); only its ring and icon pick up that accent.
const CHIP_SIZE = 26;
const CHIP_PAD_X = 10;
const CHIP_Y = (CARD_HEIGHT - CHIP_SIZE) / 2;
const TITLE_X = CHIP_PAD_X + CHIP_SIZE + 8;
const CHIP_FILL_OPACITY = 0.92;
const CHIP_STROKE_OPACITY = 0.55;

// Icon glyph geometry lives inside the chip's own (fixed-size) box, so it
// never needs a calc() expression - only the outer card scales with `w`/`h`.
const ICON_BOX_X = CHIP_PAD_X + 4;
const ICON_BOX_Y = CHIP_Y + 4;
const ICON_BOX_SIZE = CHIP_SIZE - 8;

// Use-case icons: each reflects what the action actually is, instead of one
// checkmark repeated on every card. `createUseCase`'s last argument picks one
// of these by key; `check` is the fallback for anything uncategorized.
function circleD(cx, cy, r) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`;
}

const ICON_CX = ICON_BOX_X + ICON_BOX_SIZE / 2;
const ICON_CY = ICON_BOX_Y + ICON_BOX_SIZE / 2;

const USE_CASE_ICONS = {
    // A goal/task accomplished - the fallback for anything uncategorized.
    check: `M ${ICON_BOX_X + 2} ${ICON_CY} L ${ICON_BOX_X + ICON_BOX_SIZE * 0.42} ${ICON_BOX_Y + ICON_BOX_SIZE - 2} L ${ICON_BOX_X + ICON_BOX_SIZE - 1} ${ICON_BOX_Y + 2}`,
    // Code brackets `</>`: reviewing or changing code.
    code: `M ${ICON_BOX_X + ICON_BOX_SIZE * 0.42} ${ICON_BOX_Y + 2} L ${ICON_BOX_X + 2} ${ICON_CY} L ${ICON_BOX_X + ICON_BOX_SIZE * 0.42} ${ICON_BOX_Y + ICON_BOX_SIZE - 2} M ${ICON_BOX_X + ICON_BOX_SIZE * 0.58} ${ICON_BOX_Y + 2} L ${ICON_BOX_X + ICON_BOX_SIZE - 2} ${ICON_CY} L ${ICON_BOX_X + ICON_BOX_SIZE * 0.58} ${ICON_BOX_Y + ICON_BOX_SIZE - 2}`,
    // Clock face: scheduling or attending a call.
    clock: `${circleD(ICON_CX, ICON_CY, ICON_BOX_SIZE * 0.42)} M ${ICON_CX} ${ICON_CY} L ${ICON_CX} ${ICON_CY - ICON_BOX_SIZE * 0.28} M ${ICON_CX} ${ICON_CY} L ${ICON_CX + ICON_BOX_SIZE * 0.22} ${ICON_CY}`,
    // Envelope: contacting or responding through a support channel.
    ticket: `M ${ICON_BOX_X + 1} ${ICON_BOX_Y + 3} L ${ICON_BOX_X + ICON_BOX_SIZE - 1} ${ICON_BOX_Y + 3} L ${ICON_BOX_X + ICON_BOX_SIZE - 1} ${ICON_BOX_Y + ICON_BOX_SIZE - 3} L ${ICON_BOX_X + 1} ${ICON_BOX_Y + ICON_BOX_SIZE - 3} Z M ${ICON_BOX_X + 1} ${ICON_BOX_Y + 3} L ${ICON_CX} ${ICON_BOX_Y + ICON_BOX_SIZE * 0.55} L ${ICON_BOX_X + ICON_BOX_SIZE - 1} ${ICON_BOX_Y + 3}`,
    // Chat bubble: a discussion thread or a piece of feedback.
    chat: `M ${ICON_BOX_X + 1} ${ICON_BOX_Y + 2} L ${ICON_BOX_X + ICON_BOX_SIZE - 1} ${ICON_BOX_Y + 2} L ${ICON_BOX_X + ICON_BOX_SIZE - 1} ${ICON_BOX_Y + ICON_BOX_SIZE * 0.72} L ${ICON_BOX_X + ICON_BOX_SIZE * 0.4} ${ICON_BOX_Y + ICON_BOX_SIZE * 0.72} L ${ICON_BOX_X + ICON_BOX_SIZE * 0.28} ${ICON_BOX_Y + ICON_BOX_SIZE - 1} L ${ICON_BOX_X + ICON_BOX_SIZE * 0.28} ${ICON_BOX_Y + ICON_BOX_SIZE * 0.72} L ${ICON_BOX_X + 1} ${ICON_BOX_Y + ICON_BOX_SIZE * 0.72} Z`
};

// Actor cards get their own layout: a bigger icon chip on its own row, name
// centered below - distinct from the use case's left icon + inline title row.
const ACTOR_WIDTH = 160;
const ACTOR_HEIGHT = 120;
const ACTOR_CHIP_SIZE = 32;
const ACTOR_CHIP_X = (ACTOR_WIDTH - ACTOR_CHIP_SIZE) / 2;
const ACTOR_GAP = 8;
// How tall a reserved label area to center the icon+name block around - the
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

const ACTOR_ICON_BOX_SIZE = ACTOR_CHIP_SIZE - 10;
const ACTOR_ICON_BOX_X = ACTOR_CHIP_X + 5;

// Person glyph (actor): a head circle plus a "shoulders" dome - no
// stick-figure UML relic. X coordinates (unaffected by centering) are fixed;
// Y coordinates depend on `labelAllowance` via computeActorGeometry() below.
const ACTOR_PERSON_HEAD_R = ACTOR_ICON_BOX_SIZE * 0.23;
const ACTOR_PERSON_HEAD_CX = ACTOR_ICON_BOX_X + ACTOR_ICON_BOX_SIZE / 2;

function computeActorGeometry(labelAllowance) {
    const blockHalf = (ACTOR_CHIP_SIZE + ACTOR_GAP + labelAllowance) / 2;
    const iconInsetOffset = -blockHalf + 5;
    const shouldersBaseYExpr = centerY(iconInsetOffset + ACTOR_ICON_BOX_SIZE - 1);
    const shouldersCtrlYExpr = centerY(iconInsetOffset + ACTOR_ICON_BOX_SIZE * 0.55);
    return {
        chipYExpr: centerY(-blockHalf),
        labelTopExpr: centerY(-blockHalf + ACTOR_CHIP_SIZE + ACTOR_GAP),
        headCyExpr: centerY(iconInsetOffset + ACTOR_ICON_BOX_SIZE * 0.32),
        shouldersD: `M ${ACTOR_ICON_BOX_X + 1} ${shouldersBaseYExpr} Q ${ACTOR_PERSON_HEAD_CX} ${shouldersCtrlYExpr} ${ACTOR_ICON_BOX_X + ACTOR_ICON_BOX_SIZE - 1} ${shouldersBaseYExpr} Z`
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
    cellViewNamespace: shapes,
    sorting: dia.Paper.sorting.APPROX,
    gridSize: 20,
    drawGrid: { name: 'dot', args: { color: getCSSVar('--uc-grid-dot'), thickness: 1.4 }},
    defaultConnectionPoint: {
        name: 'boundary',
        args: {
            offset: 5
        }
    },
    defaultConnector: {
        name: 'jumpover'
    },
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
                },
                // No drop-shadow filter here on purpose: applied to this shape
                // (800x1150, the one genuinely large element in the diagram)
                // it silently clips the rect's own fill part-way down - a
                // browser filter-region/texture-size limit for large filtered
                // shapes, not anything about this element's declared size.
                // Small nodes (Actor/UseCase) are well under that ceiling and
                // keep their own shadow via `nodeShadow`.
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    strokeWidth: 1.5,
                    rx: 24,
                    ry: 24
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

// Small magnet dots on the left/right edge, shared by Actor and UseCase, via
// JointJS's own ports API (`dia.Element` port groups) instead of splicing
// custom circles into each shape's own markup - the 'left'/'right' port
// layouts already center a single port vertically and reposition it on
// resize, so no hand-written `calc(w)` position math is needed here. Each
// port's own markup carries two elements: a small visible dot (PORT_RADIUS)
// plus a larger, invisible circle (PORT_HIT_RADIUS) stacked on top that alone
// carries `magnet: true` - that's the actual drag target, so the hit area is
// comfortably bigger than what's drawn. Ports render inside their own
// `<g class="joint-port">` container automatically, which CSS below uses to
// scope the dot's hover feedback to the side actually being hovered.
const PORT_RADIUS = 5;
const PORT_HIT_RADIUS = 13;

const PORT_MARKUP = [
    { tagName: 'circle', selector: 'portDot' },
    { tagName: 'circle', selector: 'portHit' }
];

const PORT_ATTRS = {
    portDot: { cx: 0, cy: 0, r: PORT_RADIUS, class: 'uc-link-dot uc-port' },
    portHit: { cx: 0, cy: 0, r: PORT_HIT_RADIUS, fill: 'transparent', magnet: true, class: 'uc-port-hit' }
};

const PORT_GROUPS = {
    left: { position: 'left', markup: PORT_MARKUP, attrs: PORT_ATTRS },
    right: { position: 'right', markup: PORT_MARKUP, attrs: PORT_ATTRS }
};

const PORTS = {
    groups: PORT_GROUPS,
    items: [{ group: 'left' }, { group: 'right' }]
};

class Actor extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'Actor',
            size: { width: ACTOR_WIDTH, height: ACTOR_HEIGHT },
            ports: PORTS,
            attrs: {
                root: {
                    cursor: 'move',
                },
                // Actors stand apart from use cases: a solid-color chip + a
                // border in that same accent (set per-instance in createActor),
                // instead of the neutral card + faint tint use cases get - they
                // read as the "external, colorful" role at a glance. Layout is
                // also its own: a bigger icon on its own row, name centered below.
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 10,
                    ry: 10,
                    strokeWidth: 2,
                    filter: nodeShadow
                },
                wash: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 10,
                    ry: 10
                },
                chipBg: {
                    x: ACTOR_CHIP_X,
                    y: ACTOR_GEOMETRY_DEFAULT.chipYExpr,
                    width: ACTOR_CHIP_SIZE,
                    height: ACTOR_CHIP_SIZE,
                    rx: 8,
                    ry: 8
                },
                iconHead: {
                    cx: ACTOR_PERSON_HEAD_CX,
                    cy: ACTOR_GEOMETRY_DEFAULT.headCyExpr,
                    r: ACTOR_PERSON_HEAD_R,
                    fill: '#ffffff'
                },
                icon: {
                    d: ACTOR_GEOMETRY_DEFAULT.shouldersD,
                    fill: '#ffffff'
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
            <rect @selector="body" class="uc-actor-card" />
            <rect @selector="wash" class="uc-actor-wash" />
            <rect @selector="chipBg" />
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
                },
                // Like the original demo, the "which actor(s) use this" accent
                // is the whole card's background (see fillUseCaseColors) - not
                // just a small chip - so it stays unmistakable at a glance. The
                // outline is a constant ink tone (theme-reactive, not per-instance)
                // so the border still reads against any accent color/gradient.
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 10,
                    ry: 10,
                    strokeWidth: 1.5,
                    filter: nodeShadow
                },
                chipBg: {
                    x: CHIP_PAD_X,
                    y: CHIP_Y,
                    width: CHIP_SIZE,
                    height: CHIP_SIZE,
                    rx: 7,
                    ry: 7,
                    // Fill stays white and mostly opaque - it sits on the card's
                    // own accent color/gradient, so tinting it the same accent
                    // would just blend in; a sliver of translucency (not fully
                    // opaque) lets a soft hint of that color through instead.
                    fill: '#ffffff',
                    fillOpacity: CHIP_FILL_OPACITY,
                    strokeWidth: 1.5,
                    strokeOpacity: CHIP_STROKE_OPACITY
                },
                // stroke (chipBg's ring) and stroke (icon) are set per-instance
                // in fillUseCaseColors() to the same accent as the card body -
                // a colored ring + colored icon on an (almost) white chip, not a
                // flat dark icon on a plain white tile.
                icon: {
                    d: USE_CASE_ICONS.check,
                    fill: 'none',
                    strokeWidth: 2.4,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round'
                },
                label: {
                    x: TITLE_X,
                    y: 'calc(0.5 * h)',
                    textAnchor: 'start',
                    textVerticalAnchor: 'middle',
                    fontSize: 12.5,
                    lineHeight: '1.4em',
                    fontFamily: FONT_FAMILY,
                    fontWeight: 600,
                    fill: '#ffffff',
                    textWrap: {
                        width: `calc(w - ${TITLE_X + 14})`,
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
            <rect @selector="body" class="uc-node-stroke" />
            <rect @selector="chipBg" />
            <path @selector="icon" />
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
                    line: {
                        class: 'uc-link-line',
                        strokeWidth: 1.75,
                        sourceMarker: { type: 'circle', r: 3.5, class: 'uc-link-dot' },
                        targetMarker: { type: 'circle', r: 3.5, class: 'uc-link-dot' }
                    }
                }
            },
            super.defaults
        );
    }
}

const lineAttrs = {
    class: 'uc-link-line',
    strokeWidth: 1.75,
    strokeDasharray: '5,4',
    sourceMarker: { type: 'circle', r: 3, class: 'uc-link-dot' },
    targetMarker: {
        type: 'path',
        class: 'uc-link-line',
        fill: 'none',
        'stroke-width': 1.75,
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
            body: {
                stroke: accent.to
            },
            wash: {
                fill: accent.to
            },
            chipBg: {
                fill: makeGradient(accent.from, accent.to),
                y: geometry.chipYExpr
            },
            iconHead: {
                cy: geometry.headCyExpr
            },
            icon: {
                d: geometry.shouldersD
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

function createUseCase(useCase, x, y, icon = 'check') {
    return new UseCase({
        position: {
            x,
            y
        },
        attrs: {
            label: {
                text: useCase
            },
            icon: {
                d: USE_CASE_ICONS[icon] || USE_CASE_ICONS.check
            }
        }
    });
}

function createUse(source, target) {
    return new Use({
        source: { id: source.id },
        target: { id: target.id }
    });
}

function createInclude(source, target) {
    return new Include({
        source: { id: source.id },
        target: { id: target.id }
    });
}

function createExtend(source, target) {
    return new Extend({
        source: { id: source.id },
        target: { id: target.id }
    });
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
const requestCodeReview = createUseCase('Request Code Review', 420, 245, 'code');
const reviewCode = createUseCase('Review Code', 720, 245, 'code');
const giveFeedback = createUseCase('Give Feedback', 720, 385, 'chat');
const proposeChanges = createUseCase('Propose Changes', 720, 520, 'code');
const requestConferenceCall = createUseCase(
    'Request Conference Call',
    420,
    445,
    'clock'
);
const proposeTimeAndDateOfCall = createUseCase(
    'Propose Time and Date of Call',
    420,
    620,
    'clock'
);
const attendConferenceCall = createUseCase('Attend Conference Call', 420, 795, 'clock');
const contactViaTicketingSystem = createUseCase(
    'Contact via Ticketing System',
    420,
    920,
    'ticket'
);
const respondToTicket = createUseCase('Respond to Ticket', 720, 920, 'ticket');
const askGithubDiscussion = createUseCase('Ask on GitHub Discussion', 420, 1045, 'chat');
const respondToDiscussion = createUseCase('Respond to Discussion', 720, 1045, 'chat');

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
// - so it's unmistakable at a glance, not tucked into a small chip.
function recolorUseCase(useCase) {
    const useCaseActors = graph
        .getNeighbors(useCase, { inbound: true })
        .filter((el) => el instanceof Actor);
    const accent = getAccentColor(useCaseActors.map((actor) => actor.prop('accent')));
    useCase.attr('body/fill', accent, { rewrite: true });
    useCase.attr('chipBg/stroke', accent, { rewrite: true });
    useCase.attr('icon/stroke', accent, { rewrite: true });
}

function fillUseCaseColors() {
    graph.getElements().forEach((element) => {
        if (element instanceof UseCase) recolorUseCase(element);
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

// Lift a node card slightly on hover for a bit of interactive feedback.
paper.on('element:mouseenter', (elementView) => {
    if (!(elementView.model instanceof UseCase) && !(elementView.model instanceof Actor)) return;
    elementView.model.attr('body/filter', nodeShadowHover, { rewrite: true });
});

paper.on('element:mouseleave', (elementView) => {
    if (!(elementView.model instanceof UseCase) && !(elementView.model instanceof Actor)) return;
    elementView.model.attr('body/filter', nodeShadow, { rewrite: true });
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
    paper.setGrid({ name: 'dot', args: { color: getCSSVar('--uc-grid-dot'), thickness: 1.4 }});
    fillUseCaseColors();
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
