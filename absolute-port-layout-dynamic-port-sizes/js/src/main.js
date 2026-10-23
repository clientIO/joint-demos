import { dia, shapes as defaultShapes, anchors, util } from '@joint/core';
import './styles.css';

const FONT_FAMILY = 'system-ui, sans-serif';
const PORT_FONT_SIZE = 14;

// Used by setOutPorts() to size each port to fit its label. Must match
// portLabel's fontSize/fontFamily below, or the measured width will be wrong.
const measureContext = document.createElement('canvas').getContext('2d');
measureContext.font = `${PORT_FONT_SIZE}px ${FONT_FAMILY}`;

const COLORS = {
    shape: {
        fill: '#ffffff',
        stroke: '#e2e8f0',
        divider: '#e2e8f0',
        label: '#0f172a',
        shadow: 'drop-shadow(0 8px 24px rgba(15, 23, 42, 0.1))'
    },
    port: {
        fill: '#3b82f6',
        stroke: '#2563eb',
        label: '#ffffff',
        shadow: 'drop-shadow(0 2px 4px rgba(15, 23, 42, 0.16))'
    },
    target: {
        fill: '#f1f5f9',
        stroke: '#94a3b8'
    },
    link: '#475569',
    gridDot: '#a6b6c5'
};

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
                        'M 0 calc(h) H calc(w) V 12 a 12 12 1 0 0 -12 -12 H 12 a 12 12 1 0 0 -12 12 z',
                    fill: COLORS.shape.fill,
                    stroke: COLORS.shape.stroke,
                    strokeWidth: 1,
                    filter: COLORS.shape.shadow
                },
                divider: {
                    d: 'M 0 calc(h-4) H calc(w)',
                    fill: 'none',
                    stroke: COLORS.shape.divider,
                    strokeWidth: 1
                },
                label: {
                    text: 'Custom shape with a dynamic port size',
                    textWrap: { width: -30, height: -10, ellipsis: true },
                    fontSize: 15,
                    fontFamily: FONT_FAMILY,
                    fontWeight: 500,
                    fill: COLORS.shape.label,
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
                                fill: COLORS.port.fill,
                                stroke: COLORS.port.stroke,
                                strokeWidth: 1,
                                filter: COLORS.port.shadow,
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
                                fill: COLORS.port.label,
                                fontSize: PORT_FONT_SIZE,
                                fontFamily: FONT_FAMILY
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
        this.on('change', this.onAttributeChange);
        this.setOutPorts();
    }

    onAttributeChange(change, opt) {
        if (opt.shape === this.id) return;
        if ('outPorts' in this.changed) {
            this.setOutPorts();
        }
    }

    setOutPorts(opt = {}) {
        const { attributes, portPadding, portGap, portHeight, minWidth } = this;
        const { outPorts = [], size, ports } = attributes;
        let x = 0;
        const items = outPorts.map((port) => {
            const { id, label = 'Port' } = port;
            const width = measureContext.measureText(label).width + 2 * portPadding;
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
}

const shapes = { ...defaultShapes, Shape };

const paperContainer = document.getElementById('paper-container');

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 10,
    drawGrid: true,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: 'transparent' },
    linkPinning: false,
    defaultLink: () =>
        new shapes.standard.Link({
            attrs: {
                line: {
                    stroke: COLORS.link,
                    strokeWidth: 1.5
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
    },
    // Style both "can drop here" highlight states the same way (see styles.css).
    highlighting: {
        elementAvailability: {
            name: 'addClass',
            options: { className: 'link-target' }
        },
        connecting: {
            name: 'addClass',
            options: { className: 'link-target' }
        }
    }
});
paperContainer.appendChild(paper.el);

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
        },
        body: {
            fill: COLORS.target.fill,
            stroke: COLORS.target.stroke,
            strokeWidth: 1,
            filter: COLORS.shape.shadow
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
