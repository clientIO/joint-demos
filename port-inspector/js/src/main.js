import { dia, ui, util, shapes, highlighters } from '@joint/plus';
import './styles.scss';

const colors = {
    shape: '#ed2637',
    port: '#ed2637',
    border: '#dde6ed',
    text: '#131e29',
    bg: '#dde6ed',
    selection: '#0075f2',
    portSelection: '#0075f2'
};

const portMarkup = {
    rect: util.svg`<rect width='20' height='20' x='-10' y='-10' @selector='portBody'/>`,
    longRect: util.svg`<rect width='40' height='20' x='-20' y='-10' @selector='portBody'/>`,
    circle: util.svg`<circle r='10' @selector='portBody'/>`,
    triangle: util.svg`<polygon points='-10,-10 10,-10 0,10' @selector='portBody'/>`,
    label: util.svg`<text @selector='portLabel'/>`
};

const attributes = {
    label: {
        fontSize: 14,
        fontFamily: 'sans-serif',
        fill: '#333333',
        textVerticalAnchor: 'top',
        textAnchor: 'middle',
        x: 'calc(w / 2)',
        y: 'calc(h + 10)',
        // reset if used
        refX: null,
        refY: null
    },
    body: {
        stroke: colors.shape,
        strokeWidth: 2,
        fill: {
            type: 'pattern',
            attrs: {
                width: 12,
                height: 12,
                'stroke-width': 1,
                stroke: colors.shape,
                fill: 'none'
            },
            markup: util.svg`
                <rect width='12' height='12' fill='${colors.bg}' stroke='none' />
                <path d='M 0 0 L 12 12 M 6 -6 L 18 6 M -6 6 L 6 18' />
            `
        }
    },
    portBody: {
        fill: colors.port,
        stroke: colors.bg,
        strokeWidth: 3
    },
    portLabel: {
        fontSize: 14,
        fontFamily: 'sans-serif',
        fill: '#333333',
        textVerticalAnchor: 'middle'
    }
};

// Define custom elements
// ----------------------

class Label extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'Label',
            size: {
                width: 120,
                height: 120
            },
            attrs: {
                body: {
                    ...attributes.body,
                    d: 'M 0 calc(0.5*h) calc(0.5*h) 0 H calc(w) V calc(h) H calc(0.5*h) Z'
                },
                label: {
                    ...attributes.label
                }
            }
        };
    }

    preinitialize() {
        this.markup = [
            {
                tagName: 'path',
                selector: 'body'
            },
            {
                tagName: 'text',
                selector: 'label'
            }
        ];
    }

    initialize() {
        super.initialize();
        this.on('change:outPorts change:inPorts', (_, __, opt) =>
            this.updateAllPorts(opt)
        );
        this.updateAllPorts();
    }

    updateAllPorts(opt) {
        const inPorts = this.get('inPorts') || [];
        const outPorts = this.get('outPorts') || [];
        const ports = [...inPorts, ...outPorts];
        ports.forEach((port) => {
            if (!port.id) port.id = util.uuid();
        });
        this.prop('ports/items', ports, { ...opt, rewrite: true });
    }

    toJSON() {
        // Make sure the JSON does not contain the duplicated ports
        // We keep the data in the `inPorts` and `outPorts` attributes only
        const json = super.toJSON();
        delete json.ports.items;
        return json;
    }
}

class DoubleBorderRectangle extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'DoubleBorderRectangle',
            size: {
                width: 100,
                height: 80
            },
            attrs: {
                border: {
                    fill: colors.border,
                    stroke: colors.shape,
                    strokeWidth: 2,
                    x: 0,
                    y: 0,
                    width: 'calc(w)',
                    height: 'calc(h)'
                },
                innerBorder: {
                    ...attributes.body,
                    x: 10,
                    y: 10,
                    width: `calc(w - 20)`,
                    height: `calc(h - 20)`
                },
                label: {
                    ...attributes.label
                }
            }
        };
    }

    preinitialize() {
        this.markup = [
            {
                tagName: 'rect',
                selector: 'border'
            },
            {
                tagName: 'rect',
                selector: 'innerBorder'
            },
            {
                tagName: 'text',
                selector: 'label'
            }
        ];
    }
}

class DoubleBorderRhombus extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'DoubleBorderRhombus',
            size: {
                width: 120,
                height: 120
            },
            attrs: {
                border: {
                    fill: colors.border,
                    stroke: colors.shape,
                    strokeWidth: 2,
                    d: 'M calc(w/2) 0 calc(w) calc(h/2) calc(w/2) calc(h) 0 calc(h/2) Z'
                },
                innerBorder: {
                    ...attributes.body,
                    d: `M calc(w/2) 10 calc(w - 10) calc(h/2) calc(w/2) calc(h - 10) 10 calc(h/2) Z`
                },
                label: {
                    ...attributes.label
                }
            }
        };
    }

    preinitialize() {
        this.markup = [
            {
                tagName: 'path',
                selector: 'border'
            },
            {
                tagName: 'path',
                selector: 'innerBorder'
            },
            {
                tagName: 'text',
                selector: 'label'
            }
        ];
    }
}

// A custom inspector that supports mouseenter and mouseleave events
const MyInspector = ui.Inspector.extend({
    events: {
        ...ui.Inspector.prototype.events,
        'mouseenter .list-item': 'onListItemMouseEnter',
        'mouseleave .list-item': 'onListItemMouseLeave'
    },

    onListItemMouseEnter(evt) {
        const path = evt.currentTarget.closest('.list').dataset.attribute;
        const index = evt.currentTarget.dataset.index;
        this.trigger('listItem:mouseenter', path, index, evt);
    },

    onListItemMouseLeave(evt) {
        const path = evt.currentTarget.closest('.list').dataset.attribute;
        const index = evt.currentTarget.dataset.index;
        this.trigger('listItem:mouseleave', path, index, evt);
    }
});

// Port and label presentation attributes
// --------------------------------------

const attributesModel = new shapes.standard.Rectangle({
    inspector: 1,
    position: { x: 700, y: 600 },
    size: { width: 120, height: 200 },
    attrs: {
        body: {
            ...attributes.body,
            width: 'calc(w)',
            height: 'calc(h)'
        },
        label: {
            ...attributes.label,
            text: 'Port and label\npresentation attributes'
        }
    },
    ports: {
        groups: {
            main: {
                position: function(ports) {
                    return Array.from({ length: ports.length }, (_, i) => {
                        return {
                            x: 0,
                            y: i * (25 + 5) + 15
                        };
                    });
                },
                size: { width: 120, height: 25 },
                // In this case, the text is part of the port body
                // Using the port label layout would have no effect
                markup: util.svg`
                      <rect @selector='portBody'/>
                      <text @selector='portLabel'/>
                  `,
                attrs: {
                    portBody: {
                        ...attributes.portBody,
                        stroke: colors.port,
                        fill: colors.bg,
                        magnet: 'out',
                        width: 'calc(w)',
                        height: 'calc(h)'
                    },
                    portLabel: {
                        ...attributes.portLabel,
                        x: 'calc(w / 2)',
                        y: 'calc(h / 2)',
                        textAnchor: 'middle',
                        textWrap: {
                            maxLineCount: 1,
                            width: 'calc(w - 10)',
                            ellipsis: true
                        },
                        fill: colors.text
                    }
                }
            }
        },
        items: [
            {
                id: 'port1',
                group: 'main',
                attrs: {
                    portLabel: {
                        text: 'Port 1'
                    }
                }
            }
        ]
    }
});

function showAttributesInspector(cell) {
    return MyInspector.create('#inspector-container', {
        cell,
        renderLabel,
        inputs: {
            ports: {
                items: {
                    max: 6,
                    type: 'list',
                    label: 'Ports',
                    item: {
                        type: 'object',
                        properties: {
                            group: {
                                // A hidden input to make sure the new ports
                                // falls under the 'main' group
                                type: 'text',
                                defaultValue: 'main',
                                attrs: {
                                    '*': {
                                        style: 'display:none'
                                    }
                                }
                            },
                            attrs: {
                                portLabel: {
                                    text: {
                                        type: 'text',
                                        label: 'Port label',
                                        defaultValue: 'New port'
                                    },
                                    fill: {
                                        type: 'color',
                                        label: 'Label Color',
                                        defaultValue: colors.text
                                    }
                                },
                                portBody: {
                                    fill: {
                                        type: 'color',
                                        label: 'Port Color',
                                        defaultValue: colors.bg
                                    },
                                    stroke: {
                                        type: 'color',
                                        label: 'Port Border Color',
                                        defaultValue: colors.port
                                    },
                                    magnet: {
                                        type: 'select-button-group',
                                        label: 'Magnet',
                                        docs:
                                            'https://docs.jointjs.com/api/dia/attributes/#magnet',
                                        defaultValue: 'out',
                                        options: [
                                            { value: 'in', content: 'Only In' },
                                            {
                                                value: 'out',
                                                content: 'Only Out'
                                            },
                                            {
                                                value: 'any',
                                                content: 'In and Out'
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}

// Dynamic Ports
// -------------

const dynamicPortsModel = new shapes.standard.Rectangle({
    inspector: 2,
    position: { x: 200, y: 40 },
    size: { width: 120, height: 200 },
    attrs: {
        body: {
            ...attributes.body
        },
        label: {
            ...attributes.label,
            text: 'Dynamic ports'
        }
    },
    portMarkup: portMarkup.circle,
    portLabelMarkup: portMarkup.label,
    ports: {
        groups: {
            in: {
                position: 'left',
                attrs: {
                    portBody: {
                        magnet: 'in',
                        ...attributes.portBody
                    },
                    portLabel: {
                        ...attributes.portLabel
                    }
                }
            },
            out: {
                position: 'right',
                attrs: {
                    portBody: {
                        magnet: 'out',
                        ...attributes.portBody
                    },
                    portLabel: {
                        ...attributes.portLabel
                    }
                }
            }
        },
        items: [
            {
                id: 'in1',
                group: 'in'
            },
            {
                id: 'out1',
                group: 'out'
            }
        ]
    }
});

function showDynamicPortsInspector(cell) {
    return MyInspector.create('#inspector-container', {
        cell,
        inputs: {
            ports: {
                items: {
                    type: 'list',
                    label: 'Dynamic Ports',
                    addButtonLabel: 'Add Port',
                    removeButtonLabel: 'Remove Port',
                    item: {
                        type: 'object',
                        properties: {
                            group: {
                                type: 'select-button-group',
                                defaultValue: 'in',
                                label: 'Port Group',
                                options: [
                                    { value: 'in', content: 'In' },
                                    { value: 'out', content: 'Out' }
                                ]
                            }
                        }
                    }
                }
            }
        }
    });
}

// Static Ports
// ------------

const staticPortsModel = new shapes.standard.Path({
    inspector: 3,
    position: { x: 450, y: 80 },
    size: { width: 120, height: 120 },
    attrs: {
        body: {
            ...attributes.body,
            d:
                'M 0 30 30 0 calc(w-30) 0 calc(w) 30 calc(w) calc(h-30) calc(w-30) calc(h) 30 calc(h) 0 calc(h-30) Z'
        },
        label: {
            text: 'Static ports',
            ...attributes.label
        }
    },
    portMarkup: portMarkup.circle,
    portLabelMarkup: portMarkup.label,
    ports: {
        groups: {
            in: {
                position: 'left',
                label: {
                    position: {
                        name: 'outside'
                    }
                },
                attrs: {
                    portBody: {
                        magnet: 'in',
                        ...attributes.portBody
                    },
                    portLabel: {
                        ...attributes.portLabel
                    }
                }
            },
            out: {
                position: 'right',
                label: {
                    position: {
                        name: 'outside'
                    }
                },
                attrs: {
                    portBody: {
                        magnet: 'out',
                        ...attributes.portBody
                    },
                    portLabel: {
                        ...attributes.portLabel
                    }
                }
            }
        },
        items: [
            {
                id: 'in1',
                group: 'in',
                attrs: {
                    portLabel: {
                        text: 'In 1'
                    }
                }
            },
            {
                id: 'in2',
                group: 'in',
                attrs: {
                    portLabel: {
                        text: 'In 2'
                    }
                }
            },
            {
                id: 'out1',
                group: 'out',
                attrs: {
                    portLabel: {
                        text: 'Out 1'
                    }
                }
            },
            {
                id: 'out2',
                group: 'out',
                attrs: {
                    portLabel: {
                        text: 'Out 2'
                    }
                }
            }
        ]
    }
});

function showStaticPortsInspector(cell) {
    return MyInspector.create('#inspector-container', {
        cell,
        inputs: {
            ports: {
                items: {
                    0: {
                        attrs: {
                            portLabel: {
                                text: {
                                    type: 'text',
                                    label: 'Input Port 1 Label'
                                }
                            }
                        }
                    },
                    1: {
                        attrs: {
                            portLabel: {
                                text: {
                                    type: 'text',
                                    label: 'Input Port 2 Label'
                                }
                            }
                        }
                    },
                    2: {
                        attrs: {
                            portLabel: {
                                text: {
                                    type: 'text',
                                    label: 'Output Port 1 Label'
                                }
                            }
                        }
                    },
                    3: {
                        attrs: {
                            portLabel: {
                                text: {
                                    type: 'text',
                                    label: 'Output Port 2 Label'
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}

// Dynamic Output Ports
// --------------------

// Note: the data-binding between `outPorts` and `ports/items` is handled
// by the `updateAllPorts` method in the `Label` class

const dynamicOutputPortsModel = new Label({
    inspector: 8,
    position: { x: 700, y: 80 },
    attrs: {
        label: {
            text: 'Static input ports\nDynamic output ports'
        }
    },
    portMarkup: portMarkup.circle,
    portLabelMarkup: portMarkup.label,
    ports: {
        groups: {
            in: {
                position: 'left',
                attrs: {
                    portBody: {
                        ...attributes.portBody,
                        magnet: 'in'
                    }
                }
            },
            out: {
                position: 'right',
                attrs: {
                    portBody: {
                        ...attributes.portBody,
                        magnet: 'out'
                    }
                }
            }
        }
    },
    inPorts: [
        {
            id: 'in1',
            group: 'in',
            attrs: {
                portBody: {
                    ...attributes.portBody,
                    magnet: 'in'
                },
                portLabel: {
                    ...attributes.portLabel
                }
            }
        }
    ]
});

function showOutputPortInspector(cell) {
    return MyInspector.create('#inspector-container', {
        cell,
        inputs: {
            inPorts: {
                0: {
                    attrs: {
                        portBody: {
                            fill: {
                                type: 'color',
                                label: 'Input Port Color',
                                defaultValue: '#ffffff'
                            }
                        }
                    }
                }
            },
            outPorts: {
                max: 4,
                type: 'list',
                label: 'Ports',
                addButtonLabel: 'Add Output Port',
                removeButtonLabel: 'Remove Port',
                item: {
                    type: 'object',
                    properties: {
                        group: {
                            // A hidden input to make sure the new ports
                            // falls under the 'main' group
                            type: 'text',
                            defaultValue: 'out',
                            attrs: {
                                '*': {
                                    style: 'display:none'
                                }
                            }
                        },
                        attrs: {
                            portBody: {
                                fill: {
                                    type: 'color',
                                    label: 'Port Color',
                                    defaultValue: colors.port
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}

// Port and label position adjustments
// ----------------------------------

const adjustmentModel = new shapes.standard.Rectangle({
    inspector: 10,
    position: { x: 800, y: 300 },
    size: { width: 120, height: 200 },
    attrs: {
        body: {
            ...attributes.body
        },
        label: {
            ...attributes.label,
            text: 'Port and label\nposition adjustments'
        }
    },
    portMarkup: portMarkup.circle,
    portLabelMarkup: portMarkup.label,
    ports: {
        groups: {
            in: {
                position: 'left',
                label: {
                    position: {
                        name: 'outside'
                    }
                },
                attrs: {
                    portBody: {
                        magnet: 'in',
                        ...attributes.portBody
                    },
                    portLabel: {
                        ...attributes.portLabel
                    }
                }
            },
            out: {
                position: 'right',
                label: {
                    position: {
                        name: 'right'
                    }
                },
                attrs: {
                    portBody: {
                        magnet: 'out',
                        ...attributes.portBody
                    },
                    portLabel: {
                        ...attributes.portLabel
                    }
                }
            }
        },
        items: [
            {
                id: 'in1',
                group: 'in',
                label: {
                    position: {
                        args: {
                            angle: 45,
                            offset: 20
                        }
                    }
                },
                attrs: {
                    labelText: {
                        text: 'In 1'
                    }
                }
            },
            {
                id: 'in2',
                group: 'in',
                label: {
                    position: {
                        args: {
                            angle: -45,
                            offset: 20
                        }
                    }
                },
                attrs: {
                    labelText: {
                        text: 'In 2'
                    }
                }
            },
            {
                id: 'out1',
                group: 'out',
                label: {
                    position: {
                        args: {
                            angle: -45,
                            offset: 20
                        }
                    }
                },
                attrs: {
                    labelText: {
                        text: 'Out 1'
                    }
                }
            },
            {
                id: 'out2',
                group: 'out',
                label: {
                    position: {
                        args: {
                            angle: 45,
                            offset: 20
                        }
                    }
                },
                attrs: {
                    labelText: {
                        text: 'Out 2'
                    }
                }
            }
        ]
    }
});

function showAdjustmentInspector(cell) {
    return MyInspector.create('#inspector-container', {
        cell,
        renderLabel,
        inputs: {
            ports: {
                items: {
                    type: 'list',
                    label: 'Port position adjustments',
                    docs:
                        'https://docs.jointjs.com/learn/features/ports/#port-layouts',
                    min: 4,
                    max: 4,
                    item: {
                        type: 'object',
                        properties: {
                            // Position Arguments
                            args: {
                                dx: {
                                    type: 'number',
                                    label: 'DX offset',
                                    defaultValue: 0
                                },
                                dy: {
                                    type: 'number',
                                    label: 'DY offset',
                                    defaultValue: 0
                                }
                            },
                            // Label Arguments
                            label: {
                                position: {
                                    args: {
                                        angle: {
                                            type: 'number',
                                            label: 'Label Angle',
                                            defaultValue: 0
                                        },
                                        offset: {
                                            type: 'number',
                                            label: 'Label Offset',
                                            defaultValue: 15
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}

// Port shapes
// -----------

const shapeModel = new shapes.standard.Rectangle({
    inspector: 5,
    position: { x: 450, y: 640 },
    size: { width: 120, height: 130 },
    attrs: {
        body: {
            ...attributes.body
        },
        label: {
            ...attributes.label,
            text: 'Port shapes\nPort group shapes'
        }
    },
    portLabelMarkup: portMarkup.label,
    ports: {
        groups: {
            in: {
                position: 'left',
                markup: portMarkup.circle,
                attrs: {
                    portBody: {
                        ...attributes.portBody,
                        magnet: 'in'
                    },
                    portLabel: {
                        ...attributes.portLabel
                    }
                },
                label: {
                    position: {
                        name: 'outside'
                    }
                }
            },
            out: {
                position: 'right',
                label: {
                    position: {
                        name: 'right'
                    }
                },
                markup: portMarkup.circle,
                attrs: {
                    portBody: {
                        ...attributes.portBody,
                        magnet: 'out'
                    },
                    portLabel: {
                        ...attributes.portLabel
                    }
                }
            }
        },
        items: [
            {
                id: 'in1',
                group: 'in',
                attrs: {
                    portLabel: {
                        text: 'In 1'
                    }
                }
            },
            {
                id: 'in2',
                group: 'in',
                attrs: {
                    portLabel: {
                        text: 'In 2'
                    }
                }
            },
            {
                id: 'out1',
                group: 'out',
                markup: portMarkup.rect,
                attrs: {
                    portLabel: {
                        text: 'Out 1'
                    }
                }
            },
            {
                id: 'out2',
                group: 'out',
                attrs: {
                    portLabel: {
                        text: 'Out 2'
                    }
                }
            },
            {
                id: 'out3',
                group: 'out',
                attrs: {
                    portLabel: {
                        text: 'Out 3'
                    }
                }
            }
        ]
    }
});

function showShapeInspector(cell) {
    return MyInspector.create('#inspector-container', {
        cell,
        renderLabel,
        inputs: {
            ports: {
                groups: {
                    in: {
                        markup: {
                            type: 'select-button-group',
                            label: 'Input Ports Default Shape',
                            // Value is an object, so we need to specify the key
                            // by which we want to compare the options.
                            // To determine which of the options is selected.
                            key: [0, 'tagName'],
                            options: [
                                {
                                    content: '■ Rectangle',
                                    value: portMarkup.rect
                                },
                                {
                                    content: '● Circle',
                                    value: portMarkup.circle
                                },
                                {
                                    content: '▾ Triangle',
                                    value: portMarkup.triangle
                                }
                            ]
                        }
                    },
                    out: {
                        markup: {
                            type: 'select-button-group',
                            label: 'Output Ports Default Shape',
                            key: [0, 'tagName'],
                            options: [
                                {
                                    content: '■ Rectangle',
                                    value: portMarkup.rect
                                },
                                {
                                    content: '● Circle',
                                    value: portMarkup.circle
                                },
                                {
                                    content: '▾ Triangle',
                                    value: portMarkup.triangle
                                }
                            ]
                        }
                    }
                },
                items: {
                    type: 'list',
                    label: 'Ports',
                    // Disable adding ports.
                    min: Infinity,
                    // Disable removing ports.
                    max: -1,
                    item: {
                        type: 'object',
                        properties: {
                            markup: {
                                type: 'select-button-group',
                                label: 'Port Shape',
                                usePortNameInLabel: true,
                                key: [0, 'tagName'],
                                options: [
                                    {
                                        content: '■ Rectangle',
                                        value: portMarkup.rect
                                    },
                                    {
                                        content: '● Circle',
                                        value: portMarkup.circle
                                    },
                                    {
                                        content: '▾ Triangle',
                                        value: portMarkup.triangle
                                    },
                                    {
                                        content: 'Group Default',
                                        value: null
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        }
    });
}

// Rectangle Port Layout
// ---------------------

const rectModel = new shapes.standard.Rectangle({
    inspector: 4,
    position: { x: 50, y: 340 },
    size: { width: 120, height: 120 },
    attrs: {
        body: {
            ...attributes.body
        },
        label: {
            ...attributes.label,
            y: 'calc(h + 50)',
            text: 'Port and label\nlayouts for rectangles'
        }
    },
    portMarkup: portMarkup.circle,
    portLabelMarkup: portMarkup.label,
    ports: {
        groups: {
            in: {
                position: 'left',
                label: {
                    position: {
                        name: 'outside'
                    }
                },
                attrs: {
                    portBody: {
                        ...attributes.portBody,
                        magnet: 'in'
                    },
                    portLabel: {
                        ...attributes.portLabel
                    }
                }
            },
            out: {
                position: 'right',
                label: {
                    position: {
                        name: 'outside'
                    }
                },
                attrs: {
                    portBody: {
                        ...attributes.portBody,
                        magnet: 'out'
                    },
                    portLabel: {
                        ...attributes.portLabel
                    }
                }
            }
        },
        items: [
            {
                id: 'p1',
                group: 'in',
                attrs: {
                    portLabel: {
                        text: 'pA'
                    }
                }
            },
            {
                id: 'p2',
                group: 'in',
                attrs: {
                    portLabel: {
                        text: 'pB'
                    }
                }
            },
            {
                id: 'p3',
                group: 'in',
                attrs: {
                    portLabel: {
                        text: 'pC'
                    }
                }
            },
            {
                id: 'p4',
                group: 'out',
                attrs: {
                    portLabel: {
                        text: 'pD'
                    }
                }
            },
            {
                id: 'p5',
                group: 'out',
                attrs: {
                    portLabel: {
                        text: 'pE'
                    }
                }
            }
        ]
    }
});

function showRectangleInspector(cell) {
    return MyInspector.create('#inspector-container', {
        cell,
        renderLabel,
        inputs: {
            ports: {
                groups: {
                    in: {
                        position: {
                            type: 'select-button-group',
                            label: 'Input Ports Position',
                            docs:
                                'https://docs.jointjs.com/learn/features/ports/#port-layouts',
                            options: [
                                { value: 'left', content: 'Left' },
                                { value: 'right', content: 'Right' },
                                { value: 'top', content: 'Top' },
                                { value: 'bottom', content: 'Bottom' }
                            ]
                        },
                        label: {
                            position: {
                                type: 'select-button-group',
                                label: 'Input Ports Label Layout',
                                docs:
                                    'https://docs.jointjs.com/learn/features/ports/#port-label-layouts',
                                options: [
                                    { value: 'inside', content: 'Inside' },
                                    { value: 'outside', content: 'Outside' },
                                    {
                                        value: 'insideOriented',
                                        content: 'Inside Oriented'
                                    },
                                    {
                                        value: 'outsideOriented',
                                        content: 'Outside Oriented'
                                    }
                                ]
                            }
                        }
                    },
                    out: {
                        position: {
                            type: 'select-button-group',
                            label: 'Output Ports Layout',
                            docs:
                                'https://docs.jointjs.com/learn/features/ports/#port-layouts',
                            options: [
                                { value: 'left', content: 'Left' },
                                { value: 'right', content: 'Right' },
                                { value: 'top', content: 'Top' },
                                { value: 'bottom', content: 'Bottom' }
                            ]
                        },
                        label: {
                            position: {
                                type: 'select-button-group',
                                label: 'Output Ports Label Layout',
                                docs:
                                    'https://docs.jointjs.com/learn/features/ports/#port-label-layouts',
                                options: [
                                    { value: 'inside', content: 'Inside' },
                                    { value: 'outside', content: 'Outside' },
                                    {
                                        value: 'insideOriented',
                                        content: 'Inside Oriented'
                                    },
                                    {
                                        value: 'outsideOriented',
                                        content: 'Outside Oriented'
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        }
    });
}

// Ellipse Port Layout
// -------------------

const ellipseModel = new shapes.standard.Ellipse({
    inspector: 6,
    position: { x: 300, y: 340 },
    size: { width: 120, height: 120 },
    attrs: {
        body: {
            ...attributes.body
        },
        label: {
            ...attributes.label,
            y: 'calc(h + 50)',
            text: 'Port and label\nlayouts for ellipses'
        }
    },
    ports: {
        groups: {
            main: {
                position: {
                    name: 'ellipse',
                    args: {
                        startAngle: 0,
                        step: 40,
                        compensateRotation: true
                    }
                },
                label: {
                    position: {
                        name: 'radial',
                        args: {
                            offset: 20
                        }
                    },
                    markup: portMarkup.label
                },
                markup: portMarkup.rect,
                attrs: {
                    portBody: {
                        ...attributes.portBody,
                        magnet: 'out'
                    },
                    portLabel: {
                        ...attributes.portLabel
                    }
                }
            }
        }
    }
});

// Generate ports based on the portCount attribute

ellipseModel.on('change:portCount', (_, count, opt) => {
    const ports = Array.from({ length: count }, (_, index) => ({
        id: `p${index}`,
        group: 'main',
        attrs: {
            portLabel: {
                text: `P${index + 1}`
            }
        }
    }));
    ellipseModel.prop('ports/items', ports, { ...opt, rewrite: true });
});

ellipseModel.set('portCount', 5);

function showEllipseInspector(cell) {
    return MyInspector.create('#inspector-container', {
        cell,
        renderLabel,
        groups: {
            portLayout: {
                label: 'Port Layout',
                index: 1
            },
            portLabelLayout: {
                label: 'Port Label Layout',
                index: 2
            }
        },
        inputs: {
            ports: {
                groups: {
                    main: {
                        position: {
                            name: {
                                type: 'select-button-group',
                                label: 'Port Layout',
                                docs:
                                    'https://docs.jointjs.com/learn/features/ports/#port-layouts',
                                defaultValue: 'ellipse',
                                group: 'portLayout',
                                options: [
                                    { value: 'ellipse', content: 'Step' },
                                    {
                                        value: 'ellipseSpread',
                                        content: 'Spread'
                                    }
                                ]
                            },
                            args: {
                                startAngle: {
                                    type: 'number',
                                    label: 'Start Angle',
                                    defaultValue: 0,
                                    group: 'portLayout'
                                },
                                step: {
                                    type: 'number',
                                    label: 'Step',
                                    when: {
                                        eq: {
                                            'ports/groups/main/position/name': 'ellipse'
                                        }
                                    },
                                    group: 'portLayout'
                                },
                                compensateRotation: {
                                    type: 'toggle',
                                    label: 'Compensate Rotation',
                                    group: 'portLayout'
                                }
                            }
                        },
                        label: {
                            position: {
                                name: {
                                    type: 'select-button-group',
                                    label: 'Label Layout',
                                    docs:
                                        'https://docs.jointjs.com/learn/features/ports/#port-label-layouts',
                                    defaultValue: 'radial',
                                    group: 'portLabelLayout',
                                    options: [
                                        { value: 'radial', content: 'Radial' },
                                        {
                                            value: 'radialOriented',
                                            content: 'Radial Oriented'
                                        },
                                        {
                                            value: 'outside',
                                            content: 'Outside'
                                        },
                                        {
                                            value: 'outsideOriented',
                                            content: 'Outside Oriented'
                                        },
                                        { value: 'inside', content: 'Inside' },
                                        {
                                            value: 'insideOriented',
                                            content: 'Inside Oriented'
                                        }
                                    ]
                                },
                                args: {
                                    offset: {
                                        type: 'number',
                                        label: 'Label Offset',
                                        group: 'portLabelLayout'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            portCount: {
                type: 'number',
                min: 0,
                max: 9,
                label: 'Port Count (Max 9)',
                group: 'portLayout'
            }
        }
    });
}

// Port Z-Index
// ------------

const zIndexModel = new DoubleBorderRectangle({
    inspector: 7,
    position: { x: 200, y: 600 },
    size: { width: 120, height: 200 },
    attrs: {
        label: {
            text: 'Port\nz-index'
        }
    },
    ports: {
        groups: {
            main: {
                position: 'right',
                markup: portMarkup.longRect,
                label: {
                    markup: portMarkup.label,
                    position: {
                        name: 'right',
                        args: {
                            x: 5,
                            y: 20
                        }
                    }
                },
                attrs: {
                    portBody: {
                        ...attributes.portBody,
                        magnet: 'out'
                    },
                    portLabel: {
                        ...attributes.portLabel
                    }
                }
            }
        },
        items: [
            {
                id: 'p1',
                group: 'main',
                z: 0,
                attrs: {
                    labelText: {
                        text: 'Port 1'
                    }
                }
            },
            {
                id: 'p2',
                group: 'main',
                z: 1,
                attrs: {
                    labelText: {
                        text: 'Port 2'
                    }
                }
            },
            {
                id: 'p3',
                group: 'main',
                z: 2,
                attrs: {
                    labelText: {
                        text: 'Port 3'
                    }
                }
            }
        ]
    }
});

function showZIndexInspector(cell) {
    return MyInspector.create('#inspector-container', {
        cell,
        inputs: {
            ports: {
                items: {
                    0: {
                        z: {
                            type: 'number',
                            label: 'Port 1 z-index'
                        }
                    },
                    1: {
                        z: {
                            type: 'number',
                            label: 'Port 2 z-index'
                        }
                    },
                    2: {
                        z: {
                            type: 'number',
                            label: 'Port 3 z-index'
                        }
                    }
                }
            }
        }
    });
}

// Manual Port Layout
// ------------------

const rhombusLayout = new DoubleBorderRhombus({
    inspector: 9,
    position: { x: 550, y: 340 },
    attrs: {
        label: {
            y: 'calc(h + 50)',
            text: 'Manual ports layout'
        }
    },
    portMarkup: portMarkup.rect,
    portLabelMarkup: portMarkup.label,
    ports: {
        groups: {
            main: {
                position: {
                    name: 'absolute'
                },
                attrs: {
                    portBody: {
                        ...attributes.portBody,
                        magnet: 'out'
                    }
                }
            }
        },
        items: [
            {
                id: 'p1',
                group: 'main',
                args: {
                    // x: 'calc(3 * w / 4)',
                    x: 90,
                    // y: 'calc(3 * h / 4)',
                    y: 90,
                    angle: 45
                },
                attrs: {
                    portBody: {
                        x: -4
                    }
                }
            },
            {
                id: 'p2',
                group: 'main',
                args: {
                    // x: 'calc(3 * w / 4)',
                    x: 90,
                    // y: 'calc(h / 4)',
                    y: 30,
                    angle: -45
                },
                attrs: {
                    portBody: {
                        x: -4
                    }
                }
            }
        ]
    }
});

function showRhombusInspector(cell) {
    return MyInspector.create('#inspector-container', {
        cell,
        inputs: {
            ports: {
                items: {
                    type: 'list',
                    label: 'Ports',
                    item: {
                        type: 'object',
                        properties: {
                            group: {
                                // A hidden input to make sure the new ports
                                // falls under the 'main' group
                                type: 'text',
                                defaultValue: 'main',
                                attrs: {
                                    '*': {
                                        style: 'display:none'
                                    }
                                }
                            },
                            args: {
                                x: {
                                    type: 'number',
                                    label: 'X position',
                                    defaultValue: 60,
                                    index: 1
                                },
                                y: {
                                    type: 'number',
                                    label: 'Y position',
                                    defaultValue: 60,
                                    index: 2
                                },
                                angle: {
                                    type: 'number',
                                    label: 'Angle',
                                    defaultValue: 0,
                                    index: 4
                                }
                            },
                            attrs: {
                                portBody: {
                                    x: {
                                        type: 'number',
                                        label: 'Offset in Angle Direction',
                                        defaultValue: -10,
                                        index: 3
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}

// Create Paper and PaperScroller
// ------------------------------

const cellNamespace = {
    ...shapes,
    Label,
    DoubleBorderRhombus,
    DoubleBorderRectangle
};

const graph = new dia.Graph({}, { cellNamespace });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: cellNamespace,
    width: 1000,
    height: 1000,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    clickThreshold: 10,
    defaultConnectionPoint: {
        name: 'boundary'
    },
    background: {
        color: colors.bg
    },
    linkPinning: false,
    snapLinks: true,
    interactive: { elementMove: false, linkMove: false },
    markAvailable: true,
    defaultLink: () => new shapes.standard.Link(),
    validateConnection: (sv, sm, tv, targetNode) => {
        if (!targetNode) return false;
        if (sv === tv) return false;
        const targetMagnet = targetNode.getAttribute('magnet');
        return targetMagnet === 'in' || targetMagnet === 'any';
    },
    validateMagnet: (_, node) => {
        return node.getAttribute('magnet') !== 'in';
    }
});

const scroller = new ui.PaperScroller({
    paper,
    cursor: 'grab'
});
document.getElementById('paper-container').appendChild(scroller.el);
scroller.render();

// Paper interactions
// ------------------

paper.on('element:pointerclick', (elementView) => {
    showInspector(elementView);
});

paper.on('blank:pointerdown', (evt) => {
    scroller.startPanning(evt);
});

paper.on('blank:pointerclick', () => {
    highlighters.mask.removeAll(paper);
    MyInspector.close();
});

function showInspector(elementView) {
    MyInspector.close();
    highlighters.mask.removeAll(paper);
    highlighters.mask.add(elementView, 'root', 'selection', {
        deep: true,
        layer: dia.Paper.Layers.BACK,
        attrs: {
            stroke: colors.selection,
            'stroke-width': 3,
            'stroke-opacity': 0.5
        }
    });
    let inspector = null;
    const element = elementView.model;
    switch (element.get('inspector')) {
        case 1:
            inspector = showAttributesInspector(element);
            break;
        case 2:
            inspector = showDynamicPortsInspector(element);
            break;
        case 3:
            inspector = showStaticPortsInspector(element);
            break;
        case 4:
            inspector = showRectangleInspector(element);
            break;
        case 5:
            inspector = showShapeInspector(element);
            break;
        case 6:
            inspector = showEllipseInspector(element);
            // Avoid using the `step` for the `ellipseSpread`.
            inspector.on('change:ports/groups/main/position/name', (value) => {
                element.prop(
                    'ports/groups/main/position/args/step',
                    value === 'ellipseSpread' ? null : 40
                );
            });
            break;
        case 7:
            inspector = showZIndexInspector(element);
            break;
        case 8:
            inspector = showOutputPortInspector(element);
            break;
        case 9:
            inspector = showRhombusInspector(element);
            break;
        case 10:
            inspector = showAdjustmentInspector(element);
            break;
        default:
            return;
    }

    inspector.on({
        'listItem:mouseenter': (path, index, evt) => {
            if (path !== 'ports/items' && path !== 'outPorts') return;
            const portId = element.prop(`${path}/${index}/id`);
            highlighters.mask.add(elementView, { port: portId }, 'port-selection', {
                layer: dia.Paper.Layers.FRONT,
                attrs: {
                    'stroke-width': 4,
                    stroke: colors.portSelection
                }
            });
        },
        'listItem:mouseleave': (path, index, evt) => {
            highlighters.mask.removeAll(paper, 'port-selection');
        }
    });

    scroller.scrollToElement(element, { animation: true });
}

// A custom function to render the inspector label
// - supports docs links
// - supports port name in the label
function renderLabel(options, path, inspector) {
    let label = options.label;
    if (options.usePortNameInLabel) {
        const pathArray = path.split('/');
        pathArray.pop();
        const portName = inspector
            .getModel()
            .prop([...pathArray, 'attrs', 'portLabel', 'text']);
        label = ` ${portName} ${label || ''}`;
    }
    const docs = options.docs;
    const labelEl = document.createElement('label');
    labelEl.textContent = (label ?? path) + ' ';
    if (docs) {
        const linkEl = document.createElement('a');
        linkEl.classList.add('docs-link');
        linkEl.setAttribute('href', docs);
        linkEl.setAttribute('target', '_blank');
        linkEl.textContent = '(Docs)';
        labelEl.appendChild(linkEl);
    }
    return labelEl;
}

// Show models and open default inspector
// ------------------------------

graph.addCells([
    attributesModel,
    staticPortsModel,
    dynamicPortsModel,
    dynamicOutputPortsModel,
    rectModel,
    ellipseModel,
    rhombusLayout,
    adjustmentModel,
    shapeModel,
    zIndexModel
]);

scroller.centerContent({ useModelGeometry: true });

showInspector(dynamicPortsModel.findView(paper));
