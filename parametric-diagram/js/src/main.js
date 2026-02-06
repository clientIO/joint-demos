import {
    dia,
    shapes,
    ui,
    highlighters,
    util,
    elementTools,
    linkTools,
    g,
    V
} from '@joint/plus';
import './styles.scss';

const PADDING = 20;
const TOP = PADDING;
const LEFT = PADDING;
const INTERFACE_WIDTH = 180;
const MIN_BLOCK_WIDTH = 800;
const MIN_BLOCK_HEIGHT = 600;
const PAR_HEADER_HEIGHT = 40;

const colors = {
    constraintBlockColor: '#F8B4C4',
    constraintBlockTextColor: '#233543',
    constraintPropertyColor: '#EF476F',
    constraintPropertyTextColor: '#FFFFFF',
    constraintInterfaceColor: '#FFE7AD',
    systemPropertyColor: '#233543',
    systemPropertyTextColor: '#FFFFFF',
    parColor: '#FFF9EB',
    parBorderColor: '#FFD166',
    black: '#233543',
    white: '#DDE6ED',
    selection: '#1EAFC2',
    dropArea: '#EA1F4E'
};

const textStyle = {
    fontFamily: 'sans-serif',
    fontWeight: 400
};

const removeToolMarkup = util.svg`
      <circle r="10" fill="${colors.selection}" stroke="${colors.parColor}" cursor="pointer" />
      <path d="M -5 -5 5 5 M -5 5 5 -5" stroke="#ffffff" stroke-width="2" cursor="pointer" />
  `;

const paperContainerEl = document.getElementById('paper-container');
const toolbarContainerEl = document.getElementById('toolbar-container');

const ConstraintBlock = dia.Element.define(
    'ConstraintBlock',
    {
        size: { width: 260, height: 120 },
        attrs: {
            root: {
                cursor: 'move'
            },
            body: {
                rx: 5,
                ry: 5,
                width: 'calc(w)',
                height: 'calc(h)',
                fill: colors.constraintBlockColor,
                stroke: 'none'
            },
            border: {
                rx: 5,
                ry: 5,
                width: 'calc(w)',
                height: 'calc(h)',
                fill: 'none',
                stroke: colors.black,
                strokeWidth: 3
            },
            label: {
                ...textStyle,
                fontSize: 16,
                fill: colors.constraintBlockTextColor,
                stroke: colors.constraintBlockColor,
                strokeWidth: 3,
                paintOrder: 'stroke',
                x: 'calc(w / 2)',
                y: 'calc(h / 2)',
                textAnchor: 'middle',
                textVerticalAnchor: 'middle',
                textWrap: {
                    width: `calc(w - ${PADDING})`,
                    height: `calc(h - ${PADDING})`,
                    ellipsis: true
                },
                // Allow the user to interact with ports even though the label covers them.
                pointerEvents: 'none'
            }
        }
    },
    {
        markup: util.svg/* xml */ `
          <rect @selector="body" />
          <rect @selector="border" />
          <text @selector="label" />
      `,

        addProperty(id, x, y, name, type) {
            const port = util.merge(ConstraintBlock.getPortDefinition(), {
                id,
                args: { x, y },
                attrs: {
                    portLabel: {
                        text: `${name} : ${type}`
                    }
                }
            });
            this.addPort(port);
        }
    },
    {
        PORT_WIDTH: 100,
        PORT_HEIGHT: 20,

        create: function(id, x, y, type) {
            return new ConstraintBlock({
                id,
                position: { x, y },
                attrs: {
                    label: {
                        text: ': ' + type
                    }
                }
            });
        },

        getPortDefinition() {
            return {
                z: 1,
                size: {
                    width: ConstraintBlock.PORT_WIDTH,
                    height: ConstraintBlock.PORT_HEIGHT
                },
                attrs: {
                    portBody: {
                        magnet: 'conditional',
                        fill: colors.constraintPropertyColor,
                        rx: 2,
                        ry: 2,
                        x: '-calc(w / 2)',
                        y: '-calc(h / 2)',
                        width: 'calc(w)',
                        height: 'calc(h)'
                    },
                    portLabel: {
                        ...textStyle,
                        fontSize: 13,
                        text: 'name : Type',
                        fill: colors.constraintPropertyTextColor,
                        pointerEvents: 'none',
                        textAnchor: 'middle',
                        textVerticalAnchor: 'middle',
                        textWrap: {
                            width: 'calc(w)',
                            height: 'calc(h)',
                            ellipsis: true
                        }
                    }
                },
                markup: util.svg/* xml */ `
                      <rect @selector="portBody" />
                      <text @selector="portLabel" />
                  `
            };
        },

        isValidPosition(x, y) {
            return (
                x > LEFT + PADDING + INTERFACE_WIDTH + PADDING &&
                y > TOP + PAR_HEADER_HEIGHT + PADDING
            );
        }
    }
);

const SystemProperty = shapes.standard.Rectangle.define(
    'SystemProperty',
    {
        size: { width: 140, height: 40 },
        attrs: {
            body: {
                rx: 2,
                ry: 2,
                fill: colors.systemPropertyColor,
                stroke: 'none'
            },
            label: {
                ...textStyle,
                fontSize: 13,
                fill: colors.systemPropertyTextColor,
                // To make the magnet on `body` work nicely (see selectElement()),
                // we let all events to pass through the label.
                pointerEvents: 'none',
                textWrap: {
                    width: `calc(w - ${PADDING / 2})`,
                    height: `calc(h - ${PADDING / 2})`,
                    ellipsis: true
                }
            }
        }
    },
    {},
    {
        create: function(id, x, y, name, type) {
            return new SystemProperty({
                id,
                position: { x, y },
                attrs: {
                    label: {
                        text: name + ' : ' + type
                    }
                }
            });
        }
    }
);

const SystemInterface = shapes.standard.Rectangle.define('SystemInterface', {
    size: { width: 180, height: 680 },
    attrs: {
        root: {
            pointerEvents: 'none'
        },
        body: {
            fill: colors.constraintInterfaceColor,
            stroke: colors.systemPropertyColor,
            strokeWidth: 4,
            rx: 5,
            ry: 5
        },
        label: {
            ...textStyle,
            fontSize: 18,
            y: 20,
            fill: colors.systemPropertyColor,
            // reset the inherited `refY` attribute
            refY: null
        }
    }
});

const ConstraintProperty = shapes.standard.Rectangle.define(
    'ConstraintProperty',
    {
        size: { width: 100, height: 24 },
        attrs: {
            body: {
                rx: 2,
                ry: 2,
                fill: colors.constraintPropertyColor,
                stroke: 'none'
            },
            label: {
                ...textStyle,
                fontSize: 13,
                fill: colors.constraintPropertyTextColor
            }
        }
    },
    {},
    {
        create: function(id, x, y, name, type) {
            return new ConstraintProperty({
                id,
                position: { x, y },
                port: ConstraintBlock.getPortDefinition(),
                attrs: {
                    label: {
                        text: name + ' : ' + type
                    }
                }
            });
        }
    }
);

const ParametricDiagram = dia.Element.define(
    'ParametricDiagram',
    {
        attrs: {
            body: {
                pointerEvents: 'none',
                rx: 2,
                ry: 2,
                fill: colors.parColor,
                stroke: colors.parBorderColor,
                strokeWidth: 2,
                width: 'calc(w)',
                height: 'calc(h)'
            },
            tag: {
                ref: 'label',
                d: 'M 0 0 H calc(w + calc(x + 20)) V 30 l -10 10 H 0 Z',
                fill: colors.parBorderColor,
                cursor: 'default'
            },
            label: {
                ...textStyle,
                x: 20,
                y: 20,
                textAnchor: 'start',
                textVerticalAnchor: 'middle',
                fontSize: 16,
                fill: colors.black,
                cursor: 'text'
            }
        }
    },
    {
        markup: util.svg/* xml */ `
          <rect @selector="body" />
          <path @selector="tag" />
          <text @selector="label" />
      `
    }
);

const BindingConnector = shapes.standard.Link.define(
    'BindingConnector',
    {
        attrs: {
            line: {
                stroke: colors.black
            },
            wrapper: {
                strokeWidth: 8,
                stroke: colors.parColor,
                strokeLinecap: 'butt',
                opacity: 1
            }
        }
    },
    {},
    {
        create: function(id, sourceId, sourcePort, targetId, targetPort) {
            return new BindingConnector({
                id,
                source: {
                    id: sourceId,
                    port: sourcePort
                },
                target: {
                    id: targetId,
                    port: targetPort
                }
            });
        }
    }
);

// Paper

const namespace = {
    ...shapes.standard,
    ParametricDiagram,
    SystemInterface,
    SystemProperty,
    ConstraintBlock,
    ConstraintProperty,
    BindingConnector
};

const graph = new dia.Graph({}, { cellNamespace: namespace });

const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: namespace,
    width: '100%',
    height: '100%',
    gridSize: 20,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: '#cad8e3' },
    highlighting: {
        embedding: {
            name: 'addClass',
            options: {
                className: 'highlighted-parent'
            }
        },
        connecting: {
            name: 'mask',
            options: {
                attrs: {
                    stroke: colors.selection,
                    'stroke-width': 4
                }
            }
        }
    },
    interactive: (cellView) => {
        if (cellView.model.get('type') === 'ParametricDiagram') return false;
        return {
            linkMove: false
        };
    },
    preventDefaultBlankAction: false,
    // Link configuration
    defaultRouter: {
        name: 'manhattan',
        args: {
            padding: 20,
            step: 20,
            excludeTypes: ['ParametricDiagram', 'SystemInterface']
        }
    },
    defaultConnector: {
        name: 'straight',
        args: { cornerType: 'cubic', cornerRadius: 5 }
    },
    defaultConnectionPoint: {
        name: 'boundary',
        args: {
            offset: 2
        }
    },
    defaultLink: () => new BindingConnector(),
    multiLinks: false,
    linkPinning: false,
    snapLinks: { radius: 10 },
    validateConnection: function(
        sourceView,
        sourceMagnet,
        targetView,
        targetMagnet
    ) {
        if (sourceView === targetView) {
            return false;
        }
        const target = targetView.model;
        const targetType = target.get('type');
        if (targetType === 'ConstraintBlock' && targetMagnet !== null) {
            return true;
        }
        if (targetType === 'SystemProperty') {
            return true;
        }
        return false;
    },
    // Element configuration
    moveThreshold: 10,
    clickThreshold: 5,
    magnetThreshold: 'onleave',
    embeddingMode: true,
    frontParentOnly: false,
    restrictTranslate: function(elementView) {
        const element = elementView.model;
        const elementType = element.get('type');
        if (elementType === 'SystemProperty') {
            return false;
        }
        return new g.Rect(250, PADDING * 4, 1e6, 1e6);
    },
    validateEmbedding: function(childView, parentView) {
        const childType = childView.model.get('type');
        const parentType = parentView.model.get('type');
        if (childType === 'SystemProperty' && parentType === 'SystemInterface') {
            return true;
        }
        return false;
    },

    validateUnembedding: function(childView) {
        const childType = childView.model.get('type');
        if (childType === 'SystemProperty') {
            return false;
        }
        return true;
    }
});

paperContainerEl.appendChild(paper.el);

// Base parametric diagram elements

const par = new ParametricDiagram({
    z: -1,
    attrs: {
        label: {
            text: 'par EchoDSP',
            annotations: [
                {
                    start: 0,
                    end: 3,
                    attrs: {
                        'font-weight': 'bold'
                    }
                }
            ]
        }
    }
});

const inputs = new SystemInterface({
    id: 'inputs',
    attrs: {
        label: {
            text: 'Inputs'
        }
    }
});

const outputs = new SystemInterface({
    id: 'outputs',
    size: { width: 180, height: 680 },
    attrs: {
        label: {
            text: 'Outputs'
        }
    }
});

graph.addCells([par, inputs, outputs]);

layoutParametricDiagram(par);

// Constraint blocks and properties

const cb1 = ConstraintBlock.create('cb1', 300, 160, 'SineWave');
cb1.resize(280, 120);
cb1.addProperty('cb1-a', 160, 12, 'a', 'Real');
cb1.addProperty('cb1-f', 50, 40, 'f', 'Real');
cb1.addProperty('cb1-t', 50, 80, 't', 'Real');
cb1.addProperty('cb1-output', 230, 80, 'output', 'Real');

const cb2 = ConstraintBlock.create('cb2', 340, 340, 'Mult');
cb2.addProperty('cb2-a', 160, 12, 'a', 'Real');
cb2.addProperty('cb2-b', 50, 60, 'b', 'Real');
cb2.addProperty('cb2-output', 210, 80, 'output', 'Real');

const cb3 = ConstraintBlock.create('cb3', 360, 560, 'Delay');
cb3.addProperty('cb3-input', 160, 12, 'input', 'Real');
cb3.addProperty('cb3-delay', 50, 60, 'delay', 'Real');
cb3.addProperty('cb3-output', 210, 80, 'output', 'Real');

const cb4 = ConstraintBlock.create('cb4', 760, 560, 'Add2');
cb4.addProperty('cb4-a', 50, 40, 'a', 'Real');
cb4.addProperty('cb4-b', 50, 80, 'b', 'Real');
cb4.addProperty('cb4-output', 210, 80, 'output', 'Real');

const cb5 = ConstraintBlock.create('cb5', 720, 200, 'Buffer');
cb5.resize(260, 80);
cb5.addProperty('cb5-input', 50, 40, 'input', 'Real');
cb5.addProperty('cb5-output', 210, 40, 'output', 'Real');

const cb6 = ConstraintBlock.create('cb6', 760, 360, 'Buffer');
cb6.resize(260, 80);
cb6.addProperty('cb6-input', 50, 40, 'input', 'Real');
cb6.addProperty('cb6-output', 210, 40, 'output', 'Real');

graph.addCells(cb1, cb2, cb3, cb4, cb5, cb6);

// System properties
// (only the y-coordinate is important because the x-coordinate is set by the layout)

const sp1 = SystemProperty.create('sp1', 0, 80, 'amplitude', 'Sound');
const sp2 = SystemProperty.create('sp2', 0, 140, 'f', 'Frequency');
const sp3 = SystemProperty.create('sp3', 0, 240, 't', 'Time');
const sp4 = SystemProperty.create('sp4', 0, 380, 'att', 'Real');
const sp5 = SystemProperty.create('sp5', 0, 600, 'offset', 'Real');
const sp6 = SystemProperty.create('sp6', 0, 220, 'outOriginal', 'Real');
const sp7 = SystemProperty.create('sp7', 0, 320, 'outEchoOnly', 'Real');
const sp8 = SystemProperty.create('sp8', 0, 620, 'output', 'Real');

graph.addCells(sp1, sp2, sp3, sp4, sp5, sp6, sp7, sp8);

// Binding connectors

const l1 = BindingConnector.create(
    'l1',
    'cb1',
    'cb1-output',
    'cb5',
    'cb5-input'
);
const l2 = BindingConnector.create('l2', 'cb1', 'cb1-output', 'cb2', 'cb2-a');
const l3 = BindingConnector.create('l3', 'cb1', 'cb1-output', 'cb4', 'cb4-a');
const l4 = BindingConnector.create(
    'l4',
    'cb2',
    'cb2-output',
    'cb3',
    'cb3-input'
);
const l5 = BindingConnector.create(
    'l5',
    'cb3',
    'cb3-output',
    'cb6',
    'cb6-input'
);
const l6 = BindingConnector.create('l6', 'cb3', 'cb3-output', 'cb4', 'cb4-b');
const l7 = BindingConnector.create('l7', 'sp1', null, 'cb1', 'cb1-a');
const l8 = BindingConnector.create('l8', 'sp2', null, 'cb1', 'cb1-f');
const l9 = BindingConnector.create('l9', 'sp3', null, 'cb1', 'cb1-t');
const l10 = BindingConnector.create('l10', 'sp4', null, 'cb2', 'cb2-b');
const l11 = BindingConnector.create('l11', 'sp5', null, 'cb3', 'cb3-delay');
const l12 = BindingConnector.create('l12', 'cb5', 'cb5-output', 'sp6', null);
const l13 = BindingConnector.create('l13', 'cb6', 'cb6-output', 'sp7', null);
const l14 = BindingConnector.create('l14', 'cb4', 'cb4-output', 'sp8', null);

graph.addCells([l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14]);

// Embed system properties into system interfaces
inputs.embed([sp1, sp2, sp3, sp4, sp5]);
outputs.embed([sp6, sp7, sp8]);

// Call automatic layout
layoutSystemInterface(inputs);
layoutSystemInterface(outputs);
layoutParametricDiagram(par);

// Functions

// Find the port position on the boundary of the element
// based on given point and port size
function findPortPosition(element, point, port) {
    const portSize = port.size;
    if (!portSize) {
        throw new Error('Port size is not defined.');
    }
    const bbox = element
        .getBBox()
        .inflate(-portSize.width / 2, -portSize.height / 2);
    return bbox.pointNearestToPoint(point).difference(element.position());
}

// Layout the system properties inside the system interface
function layoutSystemInterface(systemInterface) {
    const bbox = systemInterface.getBBox();
    const x = bbox.x + PADDING;
    const systemProperties = sortElementsByCoordinate(
        systemInterface.getEmbeddedCells(),
        'y'
    );

    let lastAvailableY = TOP + PAR_HEADER_HEIGHT + PADDING + 40;
    for (let i = 0; i < systemProperties.length; i++) {
        const systemProperty = systemProperties[i];
        const { y: preferredY } = systemProperty.position();

        const nextSystemProperty = systemProperties[i + 1];
        if (!nextSystemProperty) {
            systemProperty.position(x, Math.max(preferredY, lastAvailableY));
        } else {
            const y = Math.max(preferredY, lastAvailableY);
            systemProperty.position(x, y);
            lastAvailableY = Math.max(y + systemProperty.size().height + PADDING);
        }
    }
}

// Sort elements by given coordinate (x or y).
function sortElementsByCoordinate(elements, coordinate) {
    return util.sortBy(elements, (el) => el.position()[coordinate]);
}

// Layout parametric diagram
// - find the output interface position
// - resize the system interfaces
// - resize the par container element
function layoutParametricDiagram(par) {
    const elementsByType = util.groupBy(graph.getElements(), (el) =>
        el.get('type')
    );
    // Bounding boxes
    const minBBox = new g.Rect(
        LEFT,
        TOP,
        PADDING + INTERFACE_WIDTH + PADDING + MIN_BLOCK_WIDTH + PADDING,
        PADDING + PAR_HEADER_HEIGHT + PADDING + MIN_BLOCK_HEIGHT + PADDING
    );
    const blockBBox = graph.getCellsBBox(elementsByType.ConstraintBlock);
    const propertiesBBox = graph.getCellsBBox(elementsByType.SystemProperty);
    const parBBox = getUnion(propertiesBBox, blockBBox, minBBox);
    const contentBBox = getUnion(blockBBox, minBBox);
    // Parametric diagram
    const parHeight = PADDING + parBBox.height + PADDING;
    // Interfaces
    const interfaceHeight = parHeight - PAR_HEADER_HEIGHT - PADDING - PADDING;
    // Input interface
    inputs.position(LEFT + PADDING, TOP + PAR_HEADER_HEIGHT + PADDING, {
        deep: true
    });
    inputs.resize(inputs.size().width, interfaceHeight);
    // Output interface
    const outputX = contentBBox.x + contentBBox.width + PADDING * 2;
    outputs.position(outputX, TOP + PAR_HEADER_HEIGHT + PADDING, {
        deep: true
    });
    outputs.resize(outputs.size().width, interfaceHeight);
    // Parametric diagram
    par.position(LEFT, TOP);
    par.resize(-LEFT + outputX + INTERFACE_WIDTH + PADDING, parHeight);
}

// Get union of rectangles. It ignores nulls.
function getUnion(...rects) {
    return g.Rect.fromRectUnion(...rects.filter((r) => r));
}

// Delete all constraint blocks, properties and connectors
// Delete all constraint blocks, properties and connectors
function clearAll() {
    const elementsByType = util.groupBy(graph.getElements(), (el) =>
        el.get('type')
    );
    [
        ...(elementsByType.ConstraintBlock || []),
        ...(elementsByType.SystemProperty || [])
    ].forEach((el) => el.remove());
    par.attr('label/text', 'par Diagram');
    layoutParametricDiagram(par);
}

// Selection

let selection = null;

function selectElement(elementView, port = null) {
    const element = elementView.model;
    const paper = elementView.paper;
    deselectAll(paper);
    selection = [element.id, port];
    let x, y;
    let selector;
    if (port) {
        selector = { port, selector: 'portBody' };
        ({ x, y } = element.getPortsPositions()[port]);
        x -= ConstraintBlock.PORT_WIDTH / 2;
        y -= ConstraintBlock.PORT_HEIGHT / 2 + PADDING;
    } else {
        x = 0;
        y = -PADDING;
        selector = 'body';
    }
    // Turn the System Property into a magnet
    if (element.get('type') === 'SystemProperty') {
        const [bodyNode] = elementView.findBySelector('body');
        bodyNode.setAttribute('magnet', 'conditional');
    }

    // Show selection frame
    highlighters.mask.add(elementView, selector, 'selection', {
        layer: dia.Paper.Layers.FRONT,
        attrs: {
            stroke: colors.selection,
            'stroke-width': 4
        }
    });

    highlighters.addClass.add(elementView, selector, 'selection-class', {
        className: 'selected'
    });

    // Show remove button
    elementView.addTools(
        new dia.ToolsView({
            tools: [
                new elementTools.Remove({
                    x,
                    y,
                    markup: removeToolMarkup,
                    action: () => {
                        if (port) {
                            element.removePort(port);
                        } else {
                            element.remove();
                        }
                        deselectAll(paper);
                    }
                })
            ]
        })
    );
}

function selectLink(linkView) {
    const paper = linkView.paper;
    const link = linkView.model;
    deselectAll(paper);
    selection = [link.id];
    link.toFront();
    linkView.addTools(
        new dia.ToolsView({
            tools: [
                new linkTools.Remove({
                    markup: removeToolMarkup
                })
            ]
        })
    );
    highlighters.addClass.add(linkView, 'line', 'selection-class', {
        className: 'selected'
    });
}

function deselectAll(paper) {
    if (!selection) return;
    const [currentId] = selection;
    const currentEl = graph.getCell(currentId);
    if (currentEl && currentEl.get('type') === 'SystemProperty') {
        const [bodyNode] = currentEl.findView(paper).findBySelector('body');
        bodyNode.removeAttribute('magnet');
    }
    highlighters.mask.removeAll(paper, 'selection');
    highlighters.addClass.removeAll(paper, 'selection-class');
    paper.removeTools();
    selection = null;
}

function isSelected(elementView, port = null) {
    if (!selection) return false;
    const [currentId, currentPort] = selection;
    return currentId === elementView.model.id && currentPort === port;
}

// Events

graph.on('change:position', (cell, position, opt) => {
    if (!opt.ui) return;
    if (cell.get('type') !== 'ConstraintBlock') return;
    layoutParametricDiagram(par);
});

graph.on('add', (cell, collection, opt) => {
    if (cell.get('type') !== 'ConstraintBlock') return;
    layoutParametricDiagram(par);
});

graph.on('batch:stop', (data) => {
    if (data.batchName === 'embed' && data.cell) {
        if (data.cell.get('type') === 'SystemInterface') {
            layoutSystemInterface(data.cell);
            layoutParametricDiagram(par);
        }
    }
});

paper.on('element:pointerclick', (elementView, evt) => {
    if (elementView.model.get('type') === 'ParametricDiagram') return;
    selectElement(elementView);
});

paper.on('link:pointerclick', (linkView) => {
    selectLink(linkView);
});

paper.on('element:magnet:pointerclick', (elementView, evt, magnet) => {
    evt.stopPropagation();
    const portId = elementView.findAttribute('port', magnet);
    selectElement(elementView, portId);
});

// Text editing

paper.on('element:magnet:pointerdblclick', (elementView, evt, magnet) => {
    const portId = elementView.findAttribute('port', magnet);
    if (!portId) return;
    evt.stopPropagation();
    const element = elementView.model;
    const portIndex = element.getPortIndex(portId);
    editText(
        paper,
        element,
        elementView.getNodeBBox(magnet),
        `ports/items/${portIndex}/attrs/`,
        {
            bodySelector: 'portBody',
            labelSelector: 'portLabel'
        }
    );
});

paper.on('element:pointerdblclick', (elementView) => {
    switch (elementView.model.get('type')) {
        case 'SystemProperty':
            editText(paper, elementView.model, elementView.getBBox(), 'attrs/');
            break;
        case 'ConstraintBlock':
            editText(paper, elementView.model, elementView.getBBox(), 'attrs/', {
                allowNewLine: true,
                setTextarea: (textarea) => {
                    textarea.style.outline = `3px solid ${colors.black}`;
                }
            });
            break;
        case 'ParametricDiagram': {
            const [node] = elementView.findBySelector('tag');
            const bbox = elementView.getNodeBBox(node);
            editText(paper, elementView.model, bbox, 'attrs/', {
                bodySelector: 'tag',
                labelSelector: 'label',
                prefix: 'par ',
                setTextarea: (textarea) => {
                    textarea.style.clipPath =
                        'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)';
                }
            });
            break;
        }
    }
});

function editText(paper, element, bbox, basePath, options = {}) {
    const {
        bodySelector = 'body',
        labelSelector = 'label',
        setTextarea = () => { },
        // shift + enter creates a new line
        allowNewLine = false,
        prefix = ''
    } = options;

    const baseLabelPath = basePath + labelSelector + '/';
    const baseBodyPath = basePath + bodySelector + '/';
    const textPath = baseLabelPath + 'text';
    const fontSize = element.prop(baseLabelPath + 'fontSize');
    const matrix = paper.matrix().translate(bbox.x, bbox.y);
    const text = element.prop(textPath).substr(prefix.length);

    const textarea = document.createElement('textarea');
    // Position & Size
    textarea.style.position = 'absolute';
    textarea.style.boxSizing = 'border-box';
    textarea.style.width = bbox.width + 'px';
    textarea.style.height = bbox.height + 'px';
    textarea.style.transform = V.matrixToTransformString(matrix);
    textarea.style.transformOrigin = '0 0';
    // TODO: the padding could be calculated from the font size and
    // the number of lines in the text and update as the user types.
    textarea.style.padding = `${(bbox.height - fontSize) / 2 - 1}px 0 0`;
    // Content
    textarea.value = text;
    // Styling
    textarea.style.fontSize = fontSize + 'px';
    textarea.style.fontFamily = element.prop(baseLabelPath + 'fontFamily');
    textarea.style.color = element.prop(baseLabelPath + 'fill');
    textarea.style.background = element.prop(baseBodyPath + 'fill');
    textarea.style.textAlign = 'center';
    textarea.style.resize = 'none';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    setTextarea(textarea);
    paper.el.appendChild(textarea);
    textarea.focus();
    // Select all text
    textarea.setSelectionRange(0, textarea.value.length);
    textarea.addEventListener('blur', function() {
        element.prop(textPath, prefix + textarea.value);
        textarea.remove();
    });
    textarea.addEventListener('keydown', (evt) => {
        if (evt.key === 'Enter' && (!allowNewLine || !evt.shiftKey)) {
            textarea.blur();
        }
        if (evt.key === 'Escape') {
            textarea.value = element.prop(textPath).substr(prefix.length);
            textarea.blur();
        }
    });
}

// Cancel the text editing when the user clicks outside the textarea.
paper.on('element:pointerdown', (elementView) => {
    document.activeElement.blur();
});

paper.on('blank:pointerdown', (evt) => {
    if (evt.target.tagName === 'TEXTAREA') return;
    document.activeElement.blur();
    deselectAll(paper);
});

// Adjusting ports position

paper.on('element:magnet:pointerdown', (elementView, evt, magnet) => {
    const portId = elementView.findAttribute('port', magnet);
    if (!isSelected(elementView, portId)) {
        // Do not create a new link when the port is clicked.
        elementView.preventDefaultInteraction(evt);
        evt.data.adjustPortPosition = true;
    }
});

paper.on('element:magnet:pointermove', (elementView, evt, magnet, x, y) => {
    if (!evt.data.adjustPortPosition) return;
    deselectAll(paper);
    const element = elementView.model;
    const portId = elementView.findAttribute('port', magnet);
    const port = element.getPort(portId);
    const portPosition = findPortPosition(element, { x, y }, port);
    element.portProp(portId, 'args', portPosition.toJSON());
});

// Stencil
// It's not rendered on the screen. It is only used to create clones of elements
// when the user drags them out of the toolbar.

const stencil = new ui.Stencil({
    paper,
    paperOptions: () => {
        return {
            model: new dia.Graph({}, { cellNamespace: namespace }),
            cellViewNamespace: namespace
        };
    }
});

stencil.on({
    'element:dragstart element:drag': (cloneView, evt, cloneArea) => {
        highlighters.addClass.removeAll(cloneView.paper, 'invalid-drop-target');
        let invalidDrop = false;

        switch (cloneView.model.get('type')) {
            case 'SystemProperty': {
                const [dropTarget = null] = graph
                    .findModelsInArea(cloneArea)
                    .filter((model) => model.get('type') === 'SystemInterface');
                evt.data.dropTarget = dropTarget;
                if (dropTarget) break;
                invalidDrop = true;
                break;
            }
            case 'ConstraintBlock': {
                if (ConstraintBlock.isValidPosition(cloneArea.x, cloneArea.y)) break;
                invalidDrop = true;
                break;
            }
            case 'ConstraintProperty': {
                const [dropTarget] = graph
                    .findModelsFromPoint(cloneArea.center())
                    .filter((model) => model.get('type') === 'ConstraintBlock');

                highlighters.mask.removeAll(paper, 'valid-drop-target');

                if (dropTarget) {
                    evt.data.dropTarget = dropTarget;
                    highlighters.mask.add(
                        dropTarget.findView(paper),
                        'body',
                        'valid-drop-target',
                        {
                            layer: dia.Paper.Layers.FRONT,
                            attrs: {
                                stroke: colors.dropArea,
                                'stroke-width': 4
                            }
                        }
                    );
                } else {
                    evt.data.dropTarget = null;
                    invalidDrop = true;
                }
                break;
            }
        }
        if (invalidDrop) {
            highlighters.addClass.add(cloneView, 'body', 'invalid-drop-target', {
                className: 'invalid-drop-target'
            });
        }
    },
    'element:dragend': (cloneView, evt, cloneArea) => {
        highlighters.addClass.removeAll(cloneView.paper, 'invalid-drop-target');
        highlighters.mask.removeAll(paper, 'valid-drop-target');

        const clone = cloneView.model;
        switch (clone.get('type')) {
            case 'SystemProperty': {
                if (evt.data.dropTarget) break;
                stencil.cancelDrag({ dropAnimation: true });
                break;
            }
            case 'ConstraintBlock': {
                if (ConstraintBlock.isValidPosition(cloneArea.x, cloneArea.y)) break;
                stencil.cancelDrag({ dropAnimation: true });
                break;
            }
            case 'ConstraintProperty': {
                const { dropTarget } = evt.data;
                if (dropTarget) {
                    stencil.cancelDrag();
                    const port = clone.get('port');
                    const portPosition = findPortPosition(
                        dropTarget,
                        cloneArea.center(),
                        port
                    );
                    dropTarget.addPort({ ...port, args: portPosition.toJSON() });
                } else {
                    // An invalid drop target. Animate the port back to the stencil.
                    stencil.cancelDrag({ dropAnimation: true });
                }
                break;
            }
        }
    }
});

// Toolbar

const toolbar = new ui.Toolbar({
    tools: [
        {
            type: 'button',
            text: '⿹ Clear All',
            name: 'ClearAll',
            attrs: {
                button: {
                    class: 'btn'
                }
            }
        },
        {
            type: 'button',
            text: '⇪ Export',
            name: 'Export',
            attrs: {
                button: {
                    class: 'btn'
                }
            }
        },
        {
            type: 'separator'
        },
        {
            type: 'button',
            text: 'Constraint Block',
            name: 'ConstraintBlock',
            attrs: {
                button: {
                    class: 'btn btn-stencil',
                    style: `background: ${colors.constraintBlockColor}; color: ${colors.constraintBlockTextColor}`
                }
            }
        },
        {
            type: 'button',
            text: 'Constraint Property',
            name: 'ConstraintProperty',
            attrs: {
                button: {
                    class: 'btn btn-stencil',
                    style: `background: ${colors.constraintPropertyColor}; color: ${colors.constraintPropertyTextColor}`
                }
            }
        },
        {
            type: 'button',
            text: 'System Property',
            name: 'SystemProperty',
            attrs: {
                button: {
                    class: 'btn btn-stencil',
                    style: `background: ${colors.systemPropertyColor}; color: ${colors.systemPropertyTextColor}`
                }
            }
        }
    ]
});

toolbar.render();
toolbarContainerEl.appendChild(toolbar.el);

toolbar.on({
    'ConstraintBlock:pointerdown': (evt) => {
        // Only needed prior JointJS+ v3.7.3
        evt.data = {};
        const constrainBlock = ConstraintBlock.create('cb', 0, 0, 'Block');
        stencil.startDragging(constrainBlock, evt);
    },
    'ConstraintProperty:pointerdown': (evt) => {
        evt.data = {};
        const constraintProperty = ConstraintProperty.create(
            'cp',
            0,
            0,
            'name',
            'Type'
        );
        stencil.startDragging(constraintProperty, evt);
    },
    'SystemProperty:pointerdown': (evt) => {
        evt.data = {};
        const systemProperty = SystemProperty.create('sp', 0, 0, 'name', 'Type');
        stencil.startDragging(systemProperty, evt);
    },
    'ClearAll:pointerclick': () => {
        deselectAll(paper);
        clearAll();
    },
    'Export:pointerclick': () => {
        deselectAll(paper);
        paper.toSVG(
            (svg, error) => {
                if (error) {
                    console.error(error.message);
                }
                const lightbox = new ui.Lightbox({
                    image: 'data:image/svg+xml,' + encodeURIComponent(svg),
                    downloadable: true,
                    fileName: 'Rappid'
                });
                lightbox.open();
            },
            {
                preserveDimensions: true,
                useComputedStyles: false
            }
        );
    }
});
