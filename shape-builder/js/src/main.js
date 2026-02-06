import { ui, util, dia, shapes, connectors, anchors, highlighters } from '@joint/plus';
import './styles.scss';

const COLORS = [
    '#cececa',
    '#87d68d',
    '#ef767a',
    '#eeb868',
    '#406e8e',
    '#8ea8c3',
    '#cbf7ed'
];

// Define a custom element.
// ------------------------

const Shape = dia.Element.define(
    'Shape',
    {
        size: { width: 200, height: 180 },
        attrs: {
            root: {
                cursor: 'move'
            },
            body: {
                width: 'calc(w)',
                height: 'calc(h)',
                strokeWidth: 1,
                stroke: '#666',
                fill: '#e5e7e6'
            },
            header: {
                width: 'calc(w)',
                height: 30,
                strokeWidth: 1,
                stroke: '#666',
                // The color must match to one of the colors in the COLORS array
                // in order to make the color picker work.
                fill: COLORS[0]
            },
            label: {
                textVerticalAnchor: 'middle',
                textAnchor: 'middle',
                x: 'calc(w / 2)',
                y: 15,
                fontSize: 16,
                fontFamily: 'sans-serif',
                fill: '#000',
                text: 'Shape',
                textWrap: {
                    maxLineCount: 1,
                    width: 'calc(w - 10)',
                    ellipsis: true
                }
            }
        },
        inputs: [],
        outputs: [],
        designMode: false,
        portHeight: 40,
        portSpacing: 10,
        fieldWidth: 100,
        ports: {
            groups: {
                in: {
                    position: {
                        name: 'absolute',
                        args: {
                            x: 0
                        }
                    }
                },
                out: {
                    position: {
                        name: 'absolute',
                        args: {
                            x: 'calc(w)'
                        }
                    }
                }
            }
        }
    },
    {
        markup: util.svg/* xml */ `
            <rect @selector="body"/>
            <rect @selector="header"/>
            <text @selector="label"/>
        `,

        initialize() {
            dia.Element.prototype.initialize.apply(this, arguments);
            if (this.get('designMode') || this.getPorts().length === 0) {
                // If the element is in the design mode, we are ok to re-build
                // the `ports` and lost all user's values.
                this.buildPortItems();
            }
            this.on(
                'change:inputs change:outputs change:designMode change:fieldWidth',
                (el, changed, opt) => this.buildPortItems(opt)
            );
        },

        buildPortItems(opt = {}) {
            const HEADER_SIZE = 30;
            const portSpacing = this.get('portSpacing');
            const portHeight = this.get('portHeight');
            const inputs = this.get('inputs');
            const outputs = this.get('outputs');
            const items = [];
            inputs.forEach((input, index) => {
                input.id = input.id || util.uuid();
                items.push({
                    ...this.buildPortItem(input, 'in'),
                    id: input.id,
                    group: 'in',
                    args: {
                        y:
                            HEADER_SIZE +
                            index * portHeight +
                            (index + 1) * portSpacing +
                            portHeight / 2
                    }
                });
            });
            outputs.forEach((output, index) => {
                output.id = output.id || util.uuid();
                items.push({
                    ...this.buildPortItem(output, 'out'),
                    id: output.id,
                    group: 'out',
                    args: {
                        y:
                            HEADER_SIZE +
                            index * portHeight +
                            (index + 1) * portSpacing +
                            portHeight / 2
                    }
                });
            });
            const fieldWidth = this.getFieldWidth();
            const maxPortCount = Math.max(inputs.length, outputs.length);
            this.startBatch('update-ports');
            this.prop(['ports', 'items'], items, { ...opt, rewrite: true });
            this.set(
                'size',
                {
                    width:
                        outputs.length === 0 || inputs.length === 0
                            ? fieldWidth
                            : 2 * fieldWidth,
                    height:
                        HEADER_SIZE +
                        maxPortCount * portHeight +
                        (maxPortCount + 1) * portSpacing
                },
                opt
            );
            this.stopBatch('update-ports');
        },

        getFieldWidth() {
            const w = this.get('fieldWidth');
            if (Number.isFinite(w)) {
                return Math.max(100, Math.min(200, w));
            }
            return 100;
        },

        buildPortItem(input, group) {
            const fieldWidth = this.getFieldWidth();
            const portSpacing = this.get('portSpacing');
            const portHeight = this.get('portHeight');
            const left = group === 'in';
            const item = {
                size: { width: fieldWidth, height: portHeight },
                attrs: {
                    portBody: {
                        width: 10,
                        height: 10,
                        x: -5,
                        y: -5,
                        fill: '#FFFFFF',
                        stroke: '#000000',
                        strokeWidth: 2,
                        magnet: 'inout',
                        cursor: 'crosshair'
                    },
                    portForm: {
                        x: left ? portSpacing : `calc(-1 * w + ${portSpacing})`,
                        y: 'calc(h / -2)',
                        width: `calc(w - ${portSpacing * 2})`,
                        height: 'calc(h)'
                    },
                    portFormWrap: {
                        style: {
                            textAlign: left ? 'left' : 'right'
                        }
                    }
                }
            };
            let portFormMarkup = '';

            switch (input.type) {
                case 'input': {
                    portFormMarkup = /* xml */ `
                        <input @selector="field" xmlns="http://www.w3.org/1999/xhtml"
                            type="${input.inputType || 'text'}"
                            style="width: 100%; box-sizing: border-box" />
                    `;
                    break;
                }
                case 'select': {
                    const options = input.options || [];
                    const optionMarkup = options
                        .map(
                            (option) => /* xml */ `
                                <option value="${option.value}">${option.content || option.value
}
                                </option>
                            `
                        )
                        .join('');
                    portFormMarkup = /* xml */ `
                        <select @selector="field" xmlns="http://www.w3.org/1999/xhtml" style="width: 100%">
                            ${optionMarkup}
                        </select>
                    `;
                    break;
                }
                default:
                case 'span': {
                    portFormMarkup = /* xml */ `
                        <div @selector="field" style="
                            color: gray;
                            font-size: 12px;
                            line-height: 12px;
                        "></div>
                    `;
                    break;
                }
            }

            const designMode = this.get('designMode');
            item.markup = util.svg/* xml */ `
                <rect @selector="portBody"/>
                <foreignObject @selector="portForm">
                    <div ${designMode ? 'inert="true"' : ''
} @selector="portFormWrap"
                        xmlns="http://www.w3.org/1999/xhtml"
                        style="width: 100%; height: 100%; font-family: sans-serif; font-size: 14px;">
                        <label>
                            ${input.name}
                            ${portFormMarkup}
                        </label>
                    </div>
                </foreignObject>
            `;
            return item;
        }
    }
);

// A view that capture the input change and update the model.
const ShapeView = dia.ElementView.extend({
    events: {
        change: 'onInputChange'
    },

    onInputChange: function(evt) {
        const fieldEl = evt.target;
        const id = this.findAttribute('port', fieldEl);
        this.model.portProp(id, 'attrs/field/props/value', fieldEl.value);
    }
});

// A simplified element view for the shapes in the stencil.
// It has fixed size, it shows no ports, and it has a label.
const STENCIL_SHAPE_SIZE = { width: 150, height: 50 };
const StencilElementView = dia.ElementView.extend(
    {
        body: null,
        label: null,

        markup: util.svg/* xml */ `
        <rect @selector="body"
            width="${STENCIL_SHAPE_SIZE.width}"
            height="${STENCIL_SHAPE_SIZE.height}"
            stroke="#666" />
        <text @selector="label" font-size="18" font-family="sans-serif" text-anchor="middle" x="75" y="25" dominant-baseline="central" fill="#333" />
    `,

        initFlag: ['RENDER', 'UPDATE', 'TRANSFORM'],

        presentationAttributes: {
            size: ['UPDATE'],
            position: ['TRANSFORM'],
            angle: ['TRANSFORM']
        },

        confirmUpdate(flags) {
            if (this.hasFlag(flags, 'RENDER')) this.render();
            if (this.hasFlag(flags, 'UPDATE')) this.update();
            if (this.hasFlag(flags, 'TRANSFORM')) this.updateTransformation();
        },

        render() {
            const { el, markup } = this;
            const doc = util.parseDOMJSON(markup);
            this.body = doc.selectors.body;
            this.label = doc.selectors.label;
            el.setAttribute('cursor', 'move');
            el.appendChild(doc.fragment);
        },

        update() {
            const { model, body, label } = this;
            body.setAttribute('fill', model.attr('header/fill'));
            label.textContent = model.attr('label/text');
        }
    },
    {
        SIZE: STENCIL_SHAPE_SIZE
    }
);

// Create paper and populate the graph.
// ------------------------------------

const cellNamespace = { ...shapes, Shape, ShapeView };
const graph = new dia.Graph({}, { cellNamespace });

const paper = new dia.Paper({
    el: document.getElementById('paper'),
    width: '100%',
    height: '100%',
    model: graph,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    snapLinks: { radius: 20 },
    clickThreshold: 5,
    defaultLink: () => new shapes.standard.Link(),
    defaultAnchor: (view, magnet, ...rest) => {
        const group = view.findAttribute('port-group', magnet);
        const anchorFn = group === 'in' ? anchors.left : anchors.right;
        return anchorFn(view, magnet, ...rest);
    },
    defaultConnectionPoint: {
        name: 'anchor'
    },
    defaultConnector: {
        name: 'curve',
        args: {
            sourceDirection: connectors.curve.TangentDirections.RIGHT,
            targetDirection: connectors.curve.TangentDirections.LEFT
        }
    },
    validateMagnet: (sourceView, sourceMagnet) => {
        const sourceGroup = sourceView.findAttribute('port-group', sourceMagnet);
        if (sourceGroup !== 'out') {
            return false;
        }
        return true;
    },
    validateConnection: (sourceView, sourceMagnet, targetView, targetMagnet) => {
        if (sourceView === targetView) {
            return false;
        }

        const target = targetView.model;
        if (target.isLink()) {
            return false;
        }

        const targetGroup = targetView.findAttribute('port-group', targetMagnet);
        if (targetGroup !== 'in') {
            return false;
        }

        return true;
    },
    linkPinning: false,
    cellViewNamespace: cellNamespace,
    preventDefaultViewAction: false,
    preventDefaultBlankAction: false
});

// Create stencil.
// ---------------

const stencil = new ui.Stencil({
    paper,
    usePaperGrid: true,
    width: '100%',
    height: '100%',
    paperOptions: () => {
        return {
            model: new dia.Graph({}, { cellNamespace: shapes }),
            // Use a simplified element view for the shapes in the stencil.
            cellViewNamespace: { ...shapes, ShapeView: StencilElementView },
            background: {
                color: 'transparent'
            }
        };
    },
    layout: function(graph) {
        graph.getElements().forEach((element, index) => {
            const height = StencilElementView.SIZE.height + 10;
            element.position(0, index * height);
        });
    }
});

document.getElementById('stencil').appendChild(stencil.el);

const shapeMath = new Shape({
    attrs: {
        label: {
            text: 'Math'
        },
        header: {
            fill: COLORS[3]
        }
    },
    inputs: [
        {
            id: 'n1',
            name: 'Number A',
            type: 'input',
            inputType: 'number'
        },
        {
            id: 'n2',
            name: 'Number B',
            type: 'input',
            inputType: 'number'
        },
        {
            id: 'operation',
            name: 'Operation',
            type: 'select',
            options: [
                {
                    value: 'addition',
                    content: 'Addition'
                },
                {
                    value: 'subtraction',
                    content: 'Subtraction'
                },
                {
                    value: 'multiplication',
                    content: 'Multiplication'
                },
                {
                    value: 'division',
                    content: 'Division'
                }
            ]
        }
    ],

    outputs: [
        {
            id: 'result',
            name: 'Result',
            type: 'span'
        },
        {
            id: 'error',
            name: 'Error',
            type: 'span'
        }
    ]
});

const shapeNumber = new Shape({
    attrs: {
        label: {
            text: 'Number'
        },
        header: {
            fill: COLORS[1]
        }
    },
    outputs: [
        {
            id: 'number',
            name: 'Value',
            type: 'input',
            inputType: 'number'
        }
    ]
});

const shapePrint = new Shape({
    fieldWidth: 200,
    attrs: {
        label: {
            text: 'Print'
        },
        header: {
            fill: COLORS[2]
        }
    },
    inputs: [
        {
            id: 'text',
            name: 'Text',
            type: 'input',
            inputType: 'text'
        }
    ]
});

const stencilShapes = [shapeMath, shapeNumber, shapePrint];

stencil.render();
stencil.load(stencilShapes);

// Create inspector.
// -----------------

let inspector = null;

function closeInspector() {
    if (inspector !== null) {
        inspector.remove();
        inspector = null;
    }
}

function openInspector(cell) {
    closeInspector();

    const items = {};
    const inputs = {
        attrs: {
            label: {
                text: {
                    type: 'text',
                    label: 'Name',
                    group: 'nodeGroup'
                }
            }
        },
        ports: {
            items
        }
    };

    cell
        .get('inputs')
        .forEach((input, index) =>
            addInput(items, cell, input, index, 'inputsGroup')
        );
    cell
        .get('outputs')
        .forEach((input, index) =>
            addInput(items, cell, input, index, 'outputsGroup')
        );

    inspector = new ui.Inspector({
        cell: cell,
        inputs,
        groups: {
            nodeGroup: {
                label: 'Node',
                index: 1
            },
            inputsGroup: {
                label: 'Inputs',
                index: 2
            },
            outputsGroup: {
                label: 'Outputs',
                index: 3
            }
        }
    });

    inspector.render();

    const container = document.getElementById('inspector');
    container.appendChild(inspector.el);
}

function addInput(items, cell, input, index, group) {
    const { id, type, name } = input;
    const field = {};
    const common = {
        label: name,
        index,
        group
    };
    items[cell.getPortIndex(id)] = {
        attrs: {
            field
        }
    };
    switch (type) {
        case 'input': {
            field.props = {
                value: {
                    ...common,
                    type: input.inputType || 'text'
                }
            };
            break;
        }
        case 'select': {
            const options = input.options || [];
            field.props = {
                value: {
                    ...common,
                    type: 'select',
                    options: options.map((option) => ({
                        value: option.value,
                        content: option.content || option.value
                    }))
                }
            };
            break;
        }
        case 'span': {
            field.html = {
                ...common,
                type: 'text'
            };
            break;
        }
    }
}

let selectedCell = null;

paper.on('element:pointerclick', (elementView, event) => {
    if (event.target.tagName.toLowerCase() === 'input') return;
    highlighters.mask.removeAll(paper);
    highlighters.mask.add(elementView, 'body', 'highlighter-selected', {
        layer: dia.Paper.Layers.BACK,
        padding: 2,
        attrs: {
            stroke: '#0077B6',
            'stroke-width': 2
        }
    });
    openInspector(elementView.model);
    selectedCell = elementView.model;
});

paper.on('link:pointerclick', (linkView, event) => {
    highlighters.mask.removeAll(paper);
    highlighters.mask.add(linkView, 'line', 'highlighter-selected', {
        layer: dia.Paper.Layers.BACK,
        padding: 2,
        attrs: {
            stroke: '#0077B6',
            'stroke-width': 2
        }
    });
    closeInspector();
    selectedCell = linkView.model;
});

paper.on('blank:pointerclick', () => {
    highlighters.mask.removeAll(paper);
    closeInspector();
    selectedCell = null;
});

// Add keyboard shortcuts.
// -----------------------

const keyboard = new ui.Keyboard();
keyboard.on('delete backspace', () => {
    if (selectedCell) {
        selectedCell.remove();
    }
});

// Create a modal dialog to define a new shape.
// --------------------------------------------

document.getElementById('add-shape').addEventListener('click', () => {
    const paperContainer = document.createElement('div');

    const dialogGraph = new dia.Graph({}, { cellNamespace, Shape });
    const dialogPaper = new dia.Paper({
        el: paperContainer,
        interactive: false,
        width: 300,
        height: 600,
        model: dialogGraph,
        async: false,
        sorting: dia.Paper.sorting.NONE,
        cellViewNamespace: cellNamespace
    });

    const dialogShape = new Shape({
        designMode: true,
        inputs: [
            {
                id: 'in1',
                name: 'Input',
                type: 'input'
            }
        ],
        outputs: [
            {
                id: 'out1',
                name: 'Output',
                type: 'input'
            }
        ]
    });

    dialogShape.addTo(dialogGraph);

    const transformOptions = {
        padding: 20,
        useModelGeometry: true,
        horizontalAlign: 'middle',
        verticalAlign: 'middle',
        maxScale: 1
    };

    dialogPaper.transformToFitContent(transformOptions);
    dialogGraph.on('change', function() {
        dialogPaper.transformToFitContent(transformOptions);
    });

    const dialogInspectorInputs = new ui.Inspector({
        cell: dialogShape,
        inputs: {
            inputs: {
                label: 'Inputs',
                ...getInspectorPortList('inputs')
            }
        }
    });

    const dialogInspectorOutputs = new ui.Inspector({
        cell: dialogShape,
        inputs: {
            outputs: {
                label: 'Outputs',
                ...getInspectorPortList('outputs')
            }
        }
    });

    const dialogInspectorNode = new ui.Inspector({
        cell: dialogShape,
        inputs: {
            fieldWidth: {
                type: 'number',
                label: 'Width (100 - 200)',
                min: 100,
                max: 200,
                step: 10,
                index: 2
            },
            attrs: {
                label: {
                    text: {
                        type: 'text',
                        label: 'Default Name',
                        index: 1
                    }
                },
                header: {
                    fill: {
                        type: 'select-button-group',
                        label: 'Color',
                        options: COLORS.map((color) => ({
                            value: color,
                            content: `<span style="display:inline-block; width: 23px; height: 23px; background-color: ${color}"></span>`
                        })),
                        index: 2
                    }
                }
            }
        }
    });

    dialogInspectorInputs.render();
    dialogInspectorOutputs.render();
    dialogInspectorNode.render();

    const content = document.createDocumentFragment();
    content.append(
        dialogInspectorInputs.el,
        paperContainer,
        dialogInspectorOutputs.el,
        dialogInspectorNode.el
    );

    const dialog = new ui.Dialog({
        width: 1100,
        title: 'Shape Builder',
        content,
        buttons: [
            {
                content: 'Add',
                action: 'save',
                position: 'center'
            },
            {
                content: 'Cancel',
                action: 'cancel',
                position: 'center'
            }
        ]
    });

    dialog.el.id = 'dialog';
    dialog.open();

    dialog.on({
        close: function() {
            dialogInspectorInputs.remove();
            dialogInspectorOutputs.remove();
            dialogInspectorNode.remove();
            dialogPaper.remove();
        },
        'action:cancel': function() {
            dialog.close();
        },
        'action:save': function() {
            const stencilShape = dialogShape.clone().set('designMode', false);
            stencilShapes.push(stencilShape);
            stencil.load(stencilShapes);
            dialog.close();
        }
    });
});

function getInspectorPortList(attribute) {
    return {
        type: 'list',
        item: {
            type: 'object',
            properties: {
                id: {
                    type: 'text',
                    attrs: {
                        '*': {
                            style: 'display:none',
                            disabled: true
                        }
                    }
                },
                name: {
                    type: 'text',
                    label: 'Name',
                    defaultValue: attribute === 'inputs' ? 'Input' : 'Output'
                },
                type: {
                    type: 'select',
                    label: 'Type',
                    defaultValue: 'input',
                    options: [
                        {
                            value: 'input',
                            content: 'Input'
                        },
                        {
                            value: 'select',
                            content: 'Select'
                        },
                        {
                            value: 'span',
                            content: 'Text'
                        }
                    ]
                },
                options: {
                    type: 'list',
                    item: {
                        type: 'object',
                        properties: {
                            value: {
                                type: 'text',
                                label: 'Value'
                            },
                            content: {
                                type: 'text',
                                label: 'Content'
                            }
                        }
                    },
                    when: {
                        eq: {
                            [attribute + '/${index}/type']: 'select'
                        }
                    }
                },
                inputType: {
                    type: 'select',
                    label: 'Input Type',
                    options: [
                        {
                            value: 'text',
                            content: 'Text'
                        },
                        {
                            value: 'number',
                            content: 'Number'
                        },
                        {
                            value: 'color',
                            content: 'Color'
                        }
                    ],
                    when: {
                        eq: {
                            [attribute + '/${index}/type']: 'input'
                        }
                    }
                }
            }
        }
    };
}

// Example

graph.fromJSON({
    cells: [
        {
            type: 'Shape',
            size: {
                width: 200,
                height: 190
            },
            inputs: [
                {
                    id: 'n1',
                    name: 'Number A',
                    type: 'input',
                    inputType: 'number'
                },
                {
                    id: 'n2',
                    name: 'Number B',
                    type: 'input',
                    inputType: 'number'
                },
                {
                    id: 'operation',
                    name: 'Operation',
                    type: 'select',
                    options: [
                        {
                            value: 'addition',
                            content: 'Addition'
                        },
                        {
                            value: 'subtraction',
                            content: 'Subtraction'
                        },
                        {
                            value: 'multiplication',
                            content: 'Multiplication'
                        },
                        {
                            value: 'division',
                            content: 'Division'
                        }
                    ]
                }
            ],
            outputs: [
                {
                    id: 'result',
                    name: 'Result',
                    type: 'span'
                },
                {
                    id: 'error',
                    name: 'Error',
                    type: 'span'
                }
            ],
            inert: false,
            portHeight: 40,
            portSpacing: 10,
            fieldWidth: 100,
            ports: {
                groups: {
                    in: {
                        position: {
                            name: 'absolute',
                            args: {
                                x: 0
                            }
                        }
                    },
                    out: {
                        position: {
                            name: 'absolute',
                            args: {
                                x: 'calc(w)'
                            }
                        }
                    }
                },
                items: [
                    {
                        size: {
                            width: 100,
                            height: 40
                        },
                        attrs: {
                            portBody: {
                                width: 10,
                                height: 10,
                                x: -5,
                                y: -5,
                                fill: '#FFFFFF',
                                stroke: '#000000',
                                strokeWidth: 2,
                                magnet: true
                            },
                            portForm: {
                                x: 10,
                                y: 'calc(h / -2)',
                                width: 'calc(w - 20)',
                                height: 'calc(h)'
                            },
                            portFormWrap: {
                                style: {
                                    textAlign: 'left'
                                }
                            }
                        },
                        markup: [
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'rect',
                                style: {},
                                selector: 'portBody'
                            },
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'foreignObject',
                                style: {},
                                selector: 'portForm',
                                children: [
                                    {
                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                        tagName: 'div',
                                        style: {
                                            'font-size': '14px',
                                            'font-family': 'sans-serif',
                                            height: '100%',
                                            width: '100%'
                                        },
                                        selector: 'portFormWrap',
                                        children: [
                                            {
                                                namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                tagName: 'label',
                                                style: {},
                                                children: [
                                                    ' Number A ',
                                                    {
                                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                        tagName: 'input',
                                                        style: {
                                                            'box-sizing': 'border-box',
                                                            width: '100%'
                                                        },
                                                        selector: 'field',
                                                        attributes: {
                                                            xmlns: 'http://www.w3.org/1999/xhtml',
                                                            type: 'number',
                                                            style: 'width: 100%; box-sizing: border-box'
                                                        }
                                                    }
                                                ]
                                            }
                                        ],
                                        attributes: {
                                            xmlns: 'http://www.w3.org/1999/xhtml',
                                            style:
                                                'width: 100%; height: 100%; font-family: sans-serif; font-size: 14px;'
                                        }
                                    }
                                ]
                            }
                        ],
                        id: 'n1',
                        group: 'in',
                        args: {
                            y: 60
                        }
                    },
                    {
                        size: {
                            width: 100,
                            height: 40
                        },
                        attrs: {
                            portBody: {
                                width: 10,
                                height: 10,
                                x: -5,
                                y: -5,
                                fill: '#FFFFFF',
                                stroke: '#000000',
                                strokeWidth: 2,
                                magnet: true
                            },
                            portForm: {
                                x: 10,
                                y: 'calc(h / -2)',
                                width: 'calc(w - 20)',
                                height: 'calc(h)'
                            },
                            portFormWrap: {
                                style: {
                                    textAlign: 'left'
                                }
                            }
                        },
                        markup: [
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'rect',
                                style: {},
                                selector: 'portBody'
                            },
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'foreignObject',
                                style: {},
                                selector: 'portForm',
                                children: [
                                    {
                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                        tagName: 'div',
                                        style: {
                                            'font-size': '14px',
                                            'font-family': 'sans-serif',
                                            height: '100%',
                                            width: '100%'
                                        },
                                        selector: 'portFormWrap',
                                        children: [
                                            {
                                                namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                tagName: 'label',
                                                style: {},
                                                children: [
                                                    ' Number B ',
                                                    {
                                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                        tagName: 'input',
                                                        style: {
                                                            'box-sizing': 'border-box',
                                                            width: '100%'
                                                        },
                                                        selector: 'field',
                                                        attributes: {
                                                            xmlns: 'http://www.w3.org/1999/xhtml',
                                                            type: 'number',
                                                            style: 'width: 100%; box-sizing: border-box'
                                                        }
                                                    }
                                                ]
                                            }
                                        ],
                                        attributes: {
                                            xmlns: 'http://www.w3.org/1999/xhtml',
                                            style:
                                                'width: 100%; height: 100%; font-family: sans-serif; font-size: 14px;'
                                        }
                                    }
                                ]
                            }
                        ],
                        id: 'n2',
                        group: 'in',
                        args: {
                            y: 110
                        }
                    },
                    {
                        size: {
                            width: 100,
                            height: 40
                        },
                        attrs: {
                            portBody: {
                                width: 10,
                                height: 10,
                                x: -5,
                                y: -5,
                                fill: '#FFFFFF',
                                stroke: '#000000',
                                strokeWidth: 2,
                                magnet: true
                            },
                            portForm: {
                                x: 10,
                                y: 'calc(h / -2)',
                                width: 'calc(w - 20)',
                                height: 'calc(h)'
                            },
                            portFormWrap: {
                                style: {
                                    textAlign: 'left'
                                }
                            },
                            field: {
                                props: {
                                    value: 'multiplication'
                                }
                            }
                        },
                        markup: [
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'rect',
                                style: {},
                                selector: 'portBody'
                            },
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'foreignObject',
                                style: {},
                                selector: 'portForm',
                                children: [
                                    {
                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                        tagName: 'div',
                                        style: {
                                            'font-size': '14px',
                                            'font-family': 'sans-serif',
                                            height: '100%',
                                            width: '100%'
                                        },
                                        selector: 'portFormWrap',
                                        children: [
                                            {
                                                namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                tagName: 'label',
                                                style: {},
                                                children: [
                                                    ' Operation ',
                                                    {
                                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                        tagName: 'select',
                                                        style: {
                                                            width: '100%'
                                                        },
                                                        selector: 'field',
                                                        children: [
                                                            {
                                                                namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                                tagName: 'option',
                                                                style: {},
                                                                children: ['Addition '],
                                                                attributes: {
                                                                    value: 'addition'
                                                                }
                                                            },
                                                            {
                                                                namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                                tagName: 'option',
                                                                style: {},
                                                                children: ['Subtraction '],
                                                                attributes: {
                                                                    value: 'subtraction'
                                                                }
                                                            },
                                                            {
                                                                namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                                tagName: 'option',
                                                                style: {},
                                                                children: ['Multiplication '],
                                                                attributes: {
                                                                    value: 'multiplication'
                                                                }
                                                            },
                                                            {
                                                                namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                                tagName: 'option',
                                                                style: {},
                                                                children: ['Division '],
                                                                attributes: {
                                                                    value: 'division'
                                                                }
                                                            }
                                                        ],
                                                        attributes: {
                                                            xmlns: 'http://www.w3.org/1999/xhtml',
                                                            style: 'width: 100%'
                                                        }
                                                    }
                                                ]
                                            }
                                        ],
                                        attributes: {
                                            xmlns: 'http://www.w3.org/1999/xhtml',
                                            style:
                                                'width: 100%; height: 100%; font-family: sans-serif; font-size: 14px;'
                                        }
                                    }
                                ]
                            }
                        ],
                        id: 'operation',
                        group: 'in',
                        args: {
                            y: 160
                        }
                    },
                    {
                        size: {
                            width: 100,
                            height: 40
                        },
                        attrs: {
                            portBody: {
                                width: 10,
                                height: 10,
                                x: -5,
                                y: -5,
                                fill: '#FFFFFF',
                                stroke: '#000000',
                                strokeWidth: 2,
                                magnet: true
                            },
                            portForm: {
                                x: 'calc(-1 * w + 10)',
                                y: 'calc(h / -2)',
                                width: 'calc(w - 20)',
                                height: 'calc(h)'
                            },
                            portFormWrap: {
                                style: {
                                    textAlign: 'right'
                                }
                            }
                        },
                        markup: [
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'rect',
                                style: {},
                                selector: 'portBody'
                            },
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'foreignObject',
                                style: {},
                                selector: 'portForm',
                                children: [
                                    {
                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                        tagName: 'div',
                                        style: {
                                            'font-size': '14px',
                                            'font-family': 'sans-serif',
                                            height: '100%',
                                            width: '100%'
                                        },
                                        selector: 'portFormWrap',
                                        children: [
                                            {
                                                namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                tagName: 'label',
                                                style: {},
                                                children: [
                                                    ' Result ',
                                                    {
                                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                        tagName: 'div',
                                                        style: {
                                                            'line-height': '12px',
                                                            'font-size': '12px',
                                                            color: 'gray'
                                                        },
                                                        selector: 'field',
                                                        attributes: {
                                                            style:
                                                                '\n                            color: gray;\n                            font-size: 12px;\n                            line-height: 12px;\n                        '
                                                        }
                                                    }
                                                ]
                                            }
                                        ],
                                        attributes: {
                                            xmlns: 'http://www.w3.org/1999/xhtml',
                                            style:
                                                'width: 100%; height: 100%; font-family: sans-serif; font-size: 14px;'
                                        }
                                    }
                                ]
                            }
                        ],
                        id: 'result',
                        group: 'out',
                        args: {
                            y: 60
                        }
                    },
                    {
                        size: {
                            width: 100,
                            height: 40
                        },
                        attrs: {
                            portBody: {
                                width: 10,
                                height: 10,
                                x: -5,
                                y: -5,
                                fill: '#FFFFFF',
                                stroke: '#000000',
                                strokeWidth: 2,
                                magnet: true
                            },
                            portForm: {
                                x: 'calc(-1 * w + 10)',
                                y: 'calc(h / -2)',
                                width: 'calc(w - 20)',
                                height: 'calc(h)'
                            },
                            portFormWrap: {
                                style: {
                                    textAlign: 'right'
                                }
                            },
                            field: {
                                html: 'Division by Zero'
                            }
                        },
                        markup: [
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'rect',
                                style: {},
                                selector: 'portBody'
                            },
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'foreignObject',
                                style: {},
                                selector: 'portForm',
                                children: [
                                    {
                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                        tagName: 'div',
                                        style: {
                                            'font-size': '14px',
                                            'font-family': 'sans-serif',
                                            height: '100%',
                                            width: '100%'
                                        },
                                        selector: 'portFormWrap',
                                        children: [
                                            {
                                                namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                tagName: 'label',
                                                style: {},
                                                children: [
                                                    ' Error ',
                                                    {
                                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                        tagName: 'div',
                                                        style: {
                                                            'line-height': '12px',
                                                            'font-size': '12px',
                                                            color: 'gray'
                                                        },
                                                        selector: 'field',
                                                        attributes: {
                                                            style:
                                                                '\n                            color: gray;\n                            font-size: 12px;\n                            line-height: 12px;\n                        '
                                                        }
                                                    }
                                                ]
                                            }
                                        ],
                                        attributes: {
                                            xmlns: 'http://www.w3.org/1999/xhtml',
                                            style:
                                                'width: 100%; height: 100%; font-family: sans-serif; font-size: 14px;'
                                        }
                                    }
                                ]
                            }
                        ],
                        id: 'error',
                        group: 'out',
                        args: {
                            y: 110
                        }
                    }
                ]
            },
            position: {
                x: 223,
                y: 148
            },
            angle: 0,
            id: '9e4745f5-1edf-4763-a174-5b6ac51fd757',
            z: 1,
            attrs: {
                header: {
                    fill: '#eeb868'
                },
                label: {
                    text: 'Math'
                }
            }
        },
        {
            type: 'Shape',
            size: {
                width: 100,
                height: 90
            },
            inputs: [],
            outputs: [
                {
                    id: 'number',
                    name: 'Value',
                    type: 'input',
                    inputType: 'number'
                }
            ],
            inert: false,
            portHeight: 40,
            portSpacing: 10,
            fieldWidth: 100,
            ports: {
                groups: {
                    in: {
                        position: {
                            name: 'absolute',
                            args: {
                                x: 0
                            }
                        }
                    },
                    out: {
                        position: {
                            name: 'absolute',
                            args: {
                                x: 'calc(w)'
                            }
                        }
                    }
                },
                items: [
                    {
                        size: {
                            width: 100,
                            height: 40
                        },
                        attrs: {
                            portBody: {
                                width: 10,
                                height: 10,
                                x: -5,
                                y: -5,
                                fill: '#FFFFFF',
                                stroke: '#000000',
                                strokeWidth: 2,
                                magnet: true
                            },
                            portForm: {
                                x: 'calc(-1 * w + 10)',
                                y: 'calc(h / -2)',
                                width: 'calc(w - 20)',
                                height: 'calc(h)'
                            },
                            portFormWrap: {
                                style: {
                                    textAlign: 'right'
                                }
                            },
                            field: {
                                props: {
                                    value: '11'
                                }
                            }
                        },
                        markup: [
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'rect',
                                style: {},
                                selector: 'portBody'
                            },
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'foreignObject',
                                style: {},
                                selector: 'portForm',
                                children: [
                                    {
                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                        tagName: 'div',
                                        style: {
                                            'font-size': '14px',
                                            'font-family': 'sans-serif',
                                            height: '100%',
                                            width: '100%'
                                        },
                                        selector: 'portFormWrap',
                                        children: [
                                            {
                                                namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                tagName: 'label',
                                                style: {},
                                                children: [
                                                    ' Value ',
                                                    {
                                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                        tagName: 'input',
                                                        style: {
                                                            'box-sizing': 'border-box',
                                                            width: '100%'
                                                        },
                                                        selector: 'field',
                                                        attributes: {
                                                            xmlns: 'http://www.w3.org/1999/xhtml',
                                                            type: 'number',
                                                            style: 'width: 100%; box-sizing: border-box'
                                                        }
                                                    }
                                                ]
                                            }
                                        ],
                                        attributes: {
                                            xmlns: 'http://www.w3.org/1999/xhtml',
                                            style:
                                                'width: 100%; height: 100%; font-family: sans-serif; font-size: 14px;'
                                        }
                                    }
                                ]
                            }
                        ],
                        id: 'number',
                        group: 'out',
                        args: {
                            y: 60
                        }
                    }
                ]
            },
            position: {
                x: 20,
                y: 57
            },
            angle: 0,
            id: '5c6554ff-9d8b-4c7a-8ca1-db6920237315',
            z: 2,
            attrs: {
                header: {
                    fill: '#87d68d'
                },
                label: {
                    text: 'Number'
                }
            }
        },
        {
            type: 'Shape',
            size: {
                width: 100,
                height: 90
            },
            inputs: [],
            outputs: [
                {
                    id: 'number',
                    name: 'Value',
                    type: 'input',
                    inputType: 'number'
                }
            ],
            inert: false,
            portHeight: 40,
            portSpacing: 10,
            fieldWidth: 100,
            ports: {
                groups: {
                    in: {
                        position: {
                            name: 'absolute',
                            args: {
                                x: 0
                            }
                        }
                    },
                    out: {
                        position: {
                            name: 'absolute',
                            args: {
                                x: 'calc(w)'
                            }
                        }
                    }
                },
                items: [
                    {
                        size: {
                            width: 100,
                            height: 40
                        },
                        attrs: {
                            portBody: {
                                width: 10,
                                height: 10,
                                x: -5,
                                y: -5,
                                fill: '#FFFFFF',
                                stroke: '#000000',
                                strokeWidth: 2,
                                magnet: true
                            },
                            portForm: {
                                x: 'calc(-1 * w + 10)',
                                y: 'calc(h / -2)',
                                width: 'calc(w - 20)',
                                height: 'calc(h)'
                            },
                            portFormWrap: {
                                style: {
                                    textAlign: 'right'
                                }
                            },
                            field: {
                                props: {
                                    value: '13'
                                }
                            }
                        },
                        markup: [
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'rect',
                                style: {},
                                selector: 'portBody'
                            },
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'foreignObject',
                                style: {},
                                selector: 'portForm',
                                children: [
                                    {
                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                        tagName: 'div',
                                        style: {
                                            'font-size': '14px',
                                            'font-family': 'sans-serif',
                                            height: '100%',
                                            width: '100%'
                                        },
                                        selector: 'portFormWrap',
                                        children: [
                                            {
                                                namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                tagName: 'label',
                                                style: {},
                                                children: [
                                                    ' Value ',
                                                    {
                                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                        tagName: 'input',
                                                        style: {
                                                            'box-sizing': 'border-box',
                                                            width: '100%'
                                                        },
                                                        selector: 'field',
                                                        attributes: {
                                                            xmlns: 'http://www.w3.org/1999/xhtml',
                                                            type: 'number',
                                                            style: 'width: 100%; box-sizing: border-box'
                                                        }
                                                    }
                                                ]
                                            }
                                        ],
                                        attributes: {
                                            xmlns: 'http://www.w3.org/1999/xhtml',
                                            style:
                                                'width: 100%; height: 100%; font-family: sans-serif; font-size: 14px;'
                                        }
                                    }
                                ]
                            }
                        ],
                        id: 'number',
                        group: 'out',
                        args: {
                            y: 60
                        }
                    }
                ]
            },
            position: {
                x: 22,
                y: 276
            },
            angle: 0,
            id: '0e75f2aa-80e1-4668-955d-1c4a95ddfc85',
            z: 3,
            attrs: {
                header: {
                    fill: '#87d68d'
                },
                label: {
                    text: 'Number'
                }
            }
        },
        {
            type: 'standard.Link',
            source: {
                id: '0e75f2aa-80e1-4668-955d-1c4a95ddfc85',
                magnet: 'portBody',
                port: 'number'
            },
            target: {
                id: '9e4745f5-1edf-4763-a174-5b6ac51fd757',
                magnet: 'portBody',
                port: 'n2'
            },
            id: 'c2adae4a-58f3-4a40-b9a3-0fb1f8ac1898',
            z: 4,
            attrs: {}
        },
        {
            type: 'standard.Link',
            source: {
                id: '5c6554ff-9d8b-4c7a-8ca1-db6920237315',
                magnet: 'portBody',
                port: 'number'
            },
            target: {
                id: '9e4745f5-1edf-4763-a174-5b6ac51fd757',
                magnet: 'portBody',
                port: 'n1'
            },
            id: '6b361d37-01cd-46f8-ac99-6c6968cbd3f1',
            z: 5,
            attrs: {}
        },
        {
            type: 'Shape',
            size: {
                width: 200,
                height: 90
            },
            inputs: [
                {
                    id: 'text',
                    name: 'Text',
                    type: 'input',
                    inputType: 'text'
                }
            ],
            outputs: [],
            inert: false,
            portHeight: 40,
            portSpacing: 10,
            fieldWidth: 200,
            ports: {
                groups: {
                    in: {
                        position: {
                            name: 'absolute',
                            args: {
                                x: 0
                            }
                        }
                    },
                    out: {
                        position: {
                            name: 'absolute',
                            args: {
                                x: 'calc(w)'
                            }
                        }
                    }
                },
                items: [
                    {
                        size: {
                            width: 200,
                            height: 40
                        },
                        attrs: {
                            portBody: {
                                width: 10,
                                height: 10,
                                x: -5,
                                y: -5,
                                fill: '#FFFFFF',
                                stroke: '#000000',
                                strokeWidth: 2,
                                magnet: true
                            },
                            portForm: {
                                x: 10,
                                y: 'calc(h / -2)',
                                width: 'calc(w - 20)',
                                height: 'calc(h)'
                            },
                            portFormWrap: {
                                style: {
                                    textAlign: 'left'
                                }
                            },
                            field: {
                                props: {
                                    value: 'Result is ${Result}.'
                                }
                            }
                        },
                        markup: [
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'rect',
                                style: {},
                                selector: 'portBody'
                            },
                            {
                                namespaceURI: 'http://www.w3.org/2000/svg',
                                tagName: 'foreignObject',
                                style: {},
                                selector: 'portForm',
                                children: [
                                    {
                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                        tagName: 'div',
                                        style: {
                                            'font-size': '14px',
                                            'font-family': 'sans-serif',
                                            height: '100%',
                                            width: '100%'
                                        },
                                        selector: 'portFormWrap',
                                        children: [
                                            {
                                                namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                tagName: 'label',
                                                style: {},
                                                children: [
                                                    ' Text ',
                                                    {
                                                        namespaceURI: 'http://www.w3.org/1999/xhtml',
                                                        tagName: 'input',
                                                        style: {
                                                            'box-sizing': 'border-box',
                                                            width: '100%'
                                                        },
                                                        selector: 'field',
                                                        attributes: {
                                                            xmlns: 'http://www.w3.org/1999/xhtml',
                                                            type: 'text',
                                                            style: 'width: 100%; box-sizing: border-box'
                                                        }
                                                    }
                                                ]
                                            }
                                        ],
                                        attributes: {
                                            xmlns: 'http://www.w3.org/1999/xhtml',
                                            style:
                                                'width: 100%; height: 100%; font-family: sans-serif; font-size: 14px;'
                                        }
                                    }
                                ]
                            }
                        ],
                        id: 'text',
                        group: 'in',
                        args: {
                            y: 60
                        }
                    }
                ]
            },
            position: {
                x: 514,
                y: 65
            },
            angle: 0,
            id: '50d54aaf-c0a2-47fd-8fff-2c90f660bf33',
            z: 6,
            attrs: {
                header: {
                    fill: '#ef767a'
                },
                label: {
                    text: 'Print'
                }
            }
        },
        {
            type: 'standard.Link',
            source: {
                id: '9e4745f5-1edf-4763-a174-5b6ac51fd757',
                magnet: 'portBody',
                port: 'result'
            },
            target: {
                id: '50d54aaf-c0a2-47fd-8fff-2c90f660bf33',
                magnet: 'portBody',
                port: 'text'
            },
            id: '2034f21e-d353-4a39-84de-4b463509d3dd',
            z: 7,
            attrs: {}
        }
    ]
});
