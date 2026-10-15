import { shapes as defaultShapes, dia, util, linkTools, elementTools } from '@joint/core';
import './styles.css';

const paperContainer = document.getElementById('paper-container');

const FONT_FAMILY = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

// Each actor gets a light->deep gradient pair: a flat stroke color on the
// actor itself (see createActor), a full gradient when blended into a
// connected use case's fill (see getAccentColor). Hues are spread far apart
// so adjacent blended bands stay visually distinct.
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

// Most theme colors live as CSS custom properties in styles.css; this reads
// one live, for the cases where JS needs the literal value.
function getCSSVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

// A drop-shadow filter bakes its color in when built, so it can't ride a CSS
// class - each theme needs its own values here.
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

// A 2x2 grid glyph (frame/group icon) drawn as four small squares.
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

// Brand mark lives in the Boundary's own markup (not fixed over the canvas),
// so it moves with the frame. `calc(w)`/`calc(h)` keep it pinned to the
// bottom-right corner at any size.
const BOUNDARY_LOGO_WIDTH = 250;
const BOUNDARY_LOGO_HEIGHT = BOUNDARY_LOGO_WIDTH * (280 / 1000);
const BOUNDARY_LOGO_PAD = 20;

// --- UseCase: the UML notation for a use case is an ellipse containing only
// its name - no icon or chip, just the centered title.
const CARD_WIDTH = 220;
const CARD_HEIGHT = 90;
// Real pixel coordinates (not fractional) so a gradient band stays the same
// width top-to-bottom on this wide, short card.
const CARD_GRADIENT_ATTRS = { gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: CARD_WIDTH, y2: 20 };
const NEUTRAL_GRADIENT = makeGradient('#64748b', '#475569', CARD_GRADIENT_ATTRS);
// Widest a title can wrap without a full 3-line title crowding the
// ellipse's own curve.
const UC_TITLE_WRAP_WIDTH = 160;

// Gap between a link's end and the shape it connects to (see
// `defaultConnectionPoint`). Actors need a bigger gap than use cases - the
// figure's thin, unfilled outline reads as "touching" much sooner than the
// ellipse's bold fill does (see `createUse`).
const LINK_END_OFFSET = 10;
const ACTOR_LINK_END_OFFSET = 70;

// Invisible hit-test padding around Actor, past its own bbox, so the
// hover-revealed Connect button always stays within hoverable space.
const CONNECT_HIT_PAD = 20;

// --- Actor: a UML actor is a stick figure, name centered below it.
// ACTOR_WIDTH is wider than the figure itself, to leave room for a 2-line name.
const ACTOR_WIDTH = 160;
const ACTOR_HEIGHT = 120;
const ACTOR_CX = ACTOR_WIDTH / 2;

// Reserved label height used to center the figure+name block. A short
// one-line name (e.g. "Community") passes ACTOR_LABEL_ONE_LINE instead of the
// two-line default (see createActor's `lines` argument).
const ACTOR_LABEL_TWO_LINES = 40;
const ACTOR_LABEL_ONE_LINE = 20;

function centerY(offset) {
    const rounded = Math.round(offset * 100) / 100;
    return `calc(0.5 * h ${rounded < 0 ? '-' : '+'} ${Math.abs(rounded)})`;
}

// Stick figure proportions: head, body, arms, legs - the standard UML
// actor glyph.
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
    // No ports: an element's root has no explicit `magnet`, so the whole
    // shape is a valid connection point without an ordinary drag also
    // starting a link - that needs the Connect button added on hover below.
    // markAvailable highlights every legal drop target while a link is
    // dragged (see the `available-cell`/`available-magnet` classes in
    // styles.css).
    markAvailable: true,
    cellViewNamespace: shapes,
    // Transparent so the canvas's own background (#paper-container in
    // styles.css) shows through.
    background: { color: 'transparent' },
    // 1px dot every 10px - a visible but quiet grid (see --uc-grid-dot).
    gridSize: 10,
    // Shared with the theme toggle so the grid color updates on theme change.
    drawGrid: gridOptions(),
    // Aim at the other element's center, but stop the line at the shape's
    // outline, a little short of it (see LINK_END_OFFSET).
    defaultAnchor: {
        name: 'center',
        args: {
            useModelGeometry: true
        }
    },
    defaultConnectionPoint: {
        name: 'boundary',
        args: { offset: LINK_END_OFFSET }
    },
    defaultConnector: { name: 'normal' },
    // `Use` isn't defined yet here, but this only runs once a user drags a
    // new link, by which time it exists.
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
        // `highlighting` overrides JointJS's defaults entirely, so these two
        // must be restated for markAvailable to have anything to apply.
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
    // Only an actor's "Use" association can be drawn by hand - use-case-to-
    // use-case relationships (include/extend) stay pre-authored, never
    // user-created.
    validateConnection: function(cellViewS, _, cellViewT) {
        return cellViewS.model instanceof Actor && cellViewT.model instanceof UseCase;
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
                    // Never a link endpoint - just a frame.
                    magnet: false
                },
                // No shadow filter here - at this size it clips the fill (a
                // browser filter-region limit); Actor/UseCase are small
                // enough to keep theirs via `nodeShadow()`. Small corner
                // radius so the rectangle isn't harshly blunt.
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
        // Small icon + caption, top-left, like a frame/group label.
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

// No ports: root has no explicit `magnet`, so the whole shape is a valid
// link endpoint (see the Paper's `markAvailable` note above).
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
                // Invisible, padded hit area (see CONNECT_HIT_PAD) so the
                // whole box is draggable and the Connect button has room.
                // Kept last in the markup so links still clip to the figure,
                // not to this rect (see `defaultConnectionPoint`).
                hitArea: {
                    x: -CONNECT_HIT_PAD,
                    y: -CONNECT_HIT_PAD,
                    width: `calc(w + ${CONNECT_HIT_PAD * 2})`,
                    height: `calc(h + ${CONNECT_HIT_PAD * 2})`,
                    fill: 'transparent'
                },
                // Stroked in the actor's own accent, no fill.
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
            <path @selector="icon" />
            <circle @selector="iconHead" />
            <text @selector="label" class="uc-ink-text" />
            <rect @selector="hitArea" />
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
                // Invisible hit area so drag works across the whole box, not
                // just the ellipse's own ink. Kept last in the markup so
                // links still clip to the ellipse, not to this rect (see
                // `defaultConnectionPoint`).
                hitArea: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: 'transparent'
                },
                // Fill shows which actor(s) use this (see fillUseCaseColors);
                // outline is a fixed ink tone so it reads against any fill.
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
            <rect @selector="hitArea" />
        `;
    }
}

class Use extends shapes.standard.Link {
    defaults() {
        return util.defaultsDeep(
            {
                type: 'Use',
                attrs: {
                    // Plain undirected line, no arrowhead. `targetMarker:
                    // null` suppresses standard.Link's default arrowhead.
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

// Shared by Include/Extend - only the target end carries an arrow marker.
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
    // A one-line name centers on a shorter block than the 2-line default.
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
    // Kept as model data so fillUseCaseColors() can read back the full
    // {from, to} pair, not just a flat color.
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

function createLink(Constructor, source, target) {
    return new Constructor({
        source: { id: source.id },
        target: { id: target.id }
    });
}

// Overrides the source connectionPoint so the actor side gets the bigger
// ACTOR_LINK_END_OFFSET gap, without widening the use-case side too.
function createUse(source, target) {
    const use = createLink(Use, source, target);
    use.source({
        id: source.id,
        connectionPoint: {
            name: 'boundary',
            args: { offset: ACTOR_LINK_END_OFFSET }
        }
    });
    return use;
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
        // Extra height below the lowest use case (see rowY below) keeps it
        // clear of the frame's edge and the brand mark.
        height: 1230
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

// Actors sit near the rows they connect to; techSupport (connects to nearly
// everything) sits mid-height.
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

// x centers the two columns in the boundary's 800-wide interior. COLUMN_GAP
// leaves an «include»/«extend» badge room on a horizontal link between them.
//
// y: rows are evenly spaced by ROW_STEP, so the gap is the same between any
// two cards, not just wherever a row carries a badge. The top margin (110)
// is a bit smaller than the bottom one (130), since the bottom margin also
// has to clear the brand mark in the corner (see BOUNDARY_LOGO_*).
const ROW_STEP = CARD_HEIGHT + 90;
const rowY = (row) => 210 + row * ROW_STEP;
const COLUMN_GAP = 160;
const COL_LEFT_X = 260 + (800 - (CARD_WIDTH * 2 + COLUMN_GAP)) / 2;
const COL_RIGHT_X = COL_LEFT_X + CARD_WIDTH + COLUMN_GAP;
const requestCodeReview = createUseCase('Request Code Review', COL_LEFT_X, rowY(0));
const reviewCode = createUseCase('Review Code', COL_RIGHT_X, rowY(0));
const giveFeedback = createUseCase('Give Feedback', COL_RIGHT_X, rowY(1));
const proposeChanges = createUseCase('Propose Changes', COL_RIGHT_X, rowY(2));
const requestConferenceCall = createUseCase('Request Conference Call', COL_LEFT_X, rowY(1));
const proposeTimeAndDateOfCall = createUseCase('Propose Time and Date of Call', COL_LEFT_X, rowY(2));
const attendConferenceCall = createUseCase('Attend Conference Call', COL_LEFT_X, rowY(3));
const contactViaTicketingSystem = createUseCase('Contact via Ticketing System', COL_LEFT_X, rowY(4));
const respondToTicket = createUseCase('Respond to Ticket', COL_RIGHT_X, rowY(4));
const askGithubDiscussion = createUseCase('Ask on GitHub Discussion', COL_LEFT_X, rowY(5));
const respondToDiscussion = createUseCase('Respond to Discussion', COL_RIGHT_X, rowY(5));

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

// One actor -> its own gradient. Several actors -> one equal-width band per
// actor, with a hard break between bands, so each one stays distinguishable.
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

// Whole card fill shows the blended color of its connected actors.
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

// A shadow filter's color is baked in at creation, so a theme change means
// rebuilding it for every use case (actors have no card to shadow).
function applyNodeShadows() {
    graph.getElements().forEach((element) => {
        if (element instanceof UseCase) {
            element.attr('body/filter', nodeShadow('rest'), { rewrite: true });
        }
    });
}

fillUseCaseColors();

// A connect/disconnect only recolors the one use case that changed; any
// other change to the graph (removal, cascading embeds, ...) can affect more
// than one, so it falls back to recomputing all of them.
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

// Hover lifts a use-case card. Only actors reveal a Connect button - the one
// way to start a new link. Use cases are never a link source by hand:
// an include/extend relationship is pre-authored, not dragged out (see `validateConnection`).
paper.on('element:mouseenter', (elementView) => {
    const { model } = elementView;
    if (model instanceof UseCase) {
        model.attr('body/filter', nodeShadow('hover'), { rewrite: true });
    }
    if (model instanceof Actor) {
        elementView.addTools(new dia.ToolsView({
            tools: [
                new elementTools.Connect({
                    x: '100%',
                    y: '50%',
                    offset: { x: -36, y: 0 },
                    scale: 1.5,
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
