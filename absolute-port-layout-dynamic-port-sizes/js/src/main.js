import { V, dia, shapes as defaultShapes, anchors, util } from '@joint/core';
import './styles.css';

const THEME_STORAGE_KEY = 'absolute-port-layout-dynamic-port-sizes-theme';

function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function getPreferredTheme() {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
    } catch {
        // No storage: fall back to the system preference below.
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
}

let currentTheme = getPreferredTheme();
applyTheme(currentTheme);

const FONT_FAMILY = getCssVar('--font') || 'sans-serif';

class Shape extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'Shape',
            size: {
                width: 120,
                height: 60
            },
            attrs: {
                root: {
                    cursor: 'move'
                },
                body: {
                    d:
                        'M 0 calc(h) H calc(w) V 8 a 8 8 1 0 0 -8 -8 H 8 a 8 8 1 0 0 -8 8 z'
                },
                divider: {
                    d: 'M 0 calc(h-4) H calc(w)'
                },
                label: {
                    text: 'Custom shape with a dynamic port size',
                    textWrap: { width: -30, height: -10, ellipsis: true },
                    fontSize: 15,
                    fontFamily: FONT_FAMILY,
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    x: 'calc(0.5*w)',
                    y: 'calc(0.5*h+1)'
                }
            },
            ports: {
                groups: {
                    out: {
                        z: -1,
                        position: 'absolute',
                        markup: [
                            {
                                tagName: 'rect',
                                selector: 'portBody'
                            },
                            {
                                tagName: 'text',
                                selector: 'portLabel'
                            }
                        ],
                        attrs: {
                            portBody: {
                                width: 'calc(w)',
                                height: 'calc(h + 4)',
                                rx: 6,
                                ry: 7,
                                y: -4,
                                magnet: true,
                                cursor: 'crosshair'
                            },
                            portLabel: {
                                x: 'calc(0.5 * w)',
                                y: 'calc(0.5 * h)',
                                textAnchor: 'middle',
                                textVerticalAnchor: 'middle',
                                textWrap: {
                                    width: -this.portPadding / 2,
                                    ellipsis: true
                                },
                                pointerEvents: 'none',
                                ...this.portFontAttributes
                            }
                        }
                    }
                }
            }
        };
    }

    preinitialize() {
        this.minWidth = 100;
        this.portPadding = 16;
        this.portGap = 10;
        this.portHeight = 32;
        this.portFontAttributes = {
            'font-size': 14,
            'font-family': FONT_FAMILY
        };
        this.markup = [
            {
                tagName: 'path',
                selector: 'body'
            },
            {
                tagName: 'path',
                selector: 'divider'
            },
            {
                tagName: 'text',
                selector: 'label'
            }
        ];
    }

    initialize() {
        super.initialize();
        if (!this.constructor.svgDocument) {
            throw new Error('SVG Document not provided.');
        }
        this.on('change', this.onAttributeChange);
        this.setOutPorts();
    }

    onAttributeChange(change, opt) {
        if (opt.shape === this.id) return;
        if ('outPorts' in this.changed) {
            this.setOutPorts();
        }
    }

    measureText(svgDocument, text, attrs) {
        const vText = V('text').attr(attrs).text(text);
        vText.appendTo(svgDocument);
        const bbox = vText.getBBox();
        vText.remove();
        return bbox;
    }

    setOutPorts(opt = {}) {
        const {
            attributes,
            portPadding,
            portGap,
            portHeight,
            portFontAttributes,
            minWidth,
            constructor
        } = this;
        const { outPorts = [], size, ports } = attributes;
        let x = 0;
        const items = outPorts.map((port) => {
            const { id, label = 'Port' } = port;
            let { width } = this.measureText(
                constructor.svgDocument,
                label,
                portFontAttributes
            );
            width += 2 * portPadding;
            const item = {
                id,
                group: 'out',
                size: { width, height: portHeight },
                args: { x, y: '100%' },
                attrs: {
                    portLabel: {
                        text: label
                    }
                }
            };
            x += width + portGap;
            return item;
        });
        this.set(
            {
                ports: {
                    ...ports,
                    items
                },
                size: {
                    ...size,
                    width: Math.max(x - portGap, minWidth)
                }
            },
            { ...opt, shape: this.id }
        );
    }

    addOutPort(port, opt = {}) {
        const { outPorts = [] } = this.attributes;
        this.set('outPorts', [...outPorts, port], opt);
    }

    removeLastOutPort(opt = {}) {
        const { outPorts = [] } = this.attributes;
        this.set('outPorts', outPorts.slice(0, outPorts.length - 1), opt);
    }

    static svgDocument = null;
}

const shapes = { ...defaultShapes, Shape };

// Paper

const paperContainer = document.getElementById('paper-container');

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 10,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: 'transparent' },
    linkPinning: false,
    defaultLink: () =>
        new shapes.standard.Link({
            attrs: {
                line: {
                    stroke: getCssVar('--link-color')
                }
            }
        }),
    validateConnection: (sv, _, tv) => {
        if (sv.model.isLink() || tv.model.isLink()) return false;
        return sv !== tv;
    },
    defaultConnectionPoint: { name: 'anchor' },
    defaultAnchor: (view, magnet, ...rest) => {
        const anchorFn = view.model instanceof Shape ? anchors.bottom : anchors.top;
        return anchorFn(view, magnet, ...rest);
    },
    defaultConnector: {
        name: 'curve'
    }
});
paperContainer.appendChild(paper.el);

// A soft top-to-bottom card gradient for the shape, and a glossy radial
// highlight for the ellipse target. The gradients are static; their `<stop>`
// colors are driven entirely by CSS (see styles.css), so they follow the
// theme live without needing to be redrawn on toggle.
paper.defs.appendChild(
    V(
        '<linearGradient id="shape-body-gradient" x1="0" y1="0" x2="0" y2="1">' +
        '<stop class="shape-gradient-stop-start" offset="0"/>' +
        '<stop class="shape-gradient-stop-end" offset="1"/>' +
        '</linearGradient>'
    ).node
);
paper.defs.appendChild(
    V(
        '<radialGradient id="target-body-gradient" cx="0.32" cy="0.28" r="0.75">' +
        '<stop class="target-gradient-stop-start" offset="0"/>' +
        '<stop class="target-gradient-stop-end" offset="1"/>' +
        '</radialGradient>'
    ).node
);
// One shared gradient for every port: `objectBoundingBox` units (the SVG
// default) make it stretch to fit each port's own box, however many exist.
paper.defs.appendChild(
    V(
        '<linearGradient id="port-gradient" x1="0" y1="0" x2="0" y2="1">' +
        '<stop class="port-gradient-stop-start" offset="0"/>' +
        '<stop class="port-gradient-stop-end" offset="1"/>' +
        '</linearGradient>'
    ).node
);

function drawGrid() {
    paper.setGrid({
        name: 'dot',
        args: { color: getCssVar('--grid-dot-color'), thickness: 1 }
    });
}

drawGrid();

Shape.svgDocument = paper.svg;

const words = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed convallis lacinia nibh. Sed posuere felis sit amet porttitor sollicitudin. Sed lorem felis, semper at volutpat eget, accumsan mollis quam. Interdum et malesuada fames ac ante ipsum primis in faucibus. Nullam volutpat sodales sapien, et iaculis mauris pulvinar vel. Fusce in interdum nisi. Donec vel ultricies lectus. Suspendisse mi nisl, vulputate sed scelerisque quis, porttitor ut enim. Praesent augue ligula, interdum sit amet pulvinar ac, tincidunt ut dolor. Vivamus luctus eget ipsum ac eleifend. Suspendisse lorem enim, hendrerit in semper in, porttitor id nulla. Pellentesque iaculis risus ac purus efficitur, id elementum velit hendrerit. Ut nisl mi, ornare eu consectetur congue, placerat at nulla.'.split(
    ' '
);

function getRandomWord() {
    return words[Math.floor(Math.random() * words.length)];
}

function getRandomPort() {
    return {
        id: util.uuid(),
        label: getRandomWord()
    };
}

const shape = new Shape({
    outPorts: [getRandomPort(), getRandomPort(), getRandomPort()]
});

shape.position(100, 100).addTo(graph);

const target = new shapes.standard.Ellipse({
    size: { width: 50, height: 50 },
    attrs: {
        root: {
            highlighterSelector: 'body'
        }
    }
});
target.position(150, 300).addTo(graph);

document.getElementById('add-port').addEventListener('click', () => {
    shape.addOutPort(getRandomPort());
});

document.getElementById('remove-port').addEventListener('click', () => {
    shape.removeLastOutPort();
});

document.getElementById('theme-toggle').addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
    try {
        localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
    } catch {
        // No storage: the choice lasts the session.
    }
    drawGrid();
});
