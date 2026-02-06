import {
    dia,
    shapes,
    util,
    linkTools,
    elementTools,
    connectionStrategies
} from '@joint/plus';
import './styles.css';

const COLORS = {
    header: '#f68e96',
    text: '#131e29',
    outline: '#131e29',
    main: '#fdecee',
    background: '#d7e2ea',
    grid: '#a1bbce',
    tools: '#fdecee'
};

const UNIT = 10;
const MARGIN = 1 * UNIT;
const RADIUS = UNIT / 2;
// Header height = 4 * UNIT in total
const TYPE_HEIGHT = 18;
const NAME_HEIGHT = 22;

const shapeNamespace = { ...shapes };

const graph = new dia.Graph({}, { cellNamespace: shapeNamespace });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapeNamespace,
    width: '100%',
    height: '100%',
    gridSize: UNIT,
    drawGrid: { name: 'mesh', color: COLORS.grid },
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    defaultConnectionPoint: {
        name: 'boundary',
        args: {
            offset: 2
        }
    },
    defaultConnector: {
        name: 'rounded',
        args: { radius: RADIUS }
    },
    background: {
        color: COLORS.background
    },
    labelsLayer: true,
    defaultRouter: orthogonalRouter,
    clickThreshold: 10,
    moveThreshold: 10
});

document.getElementById('paper-container').appendChild(paper.el);

// -- Shape definitions

class UMLLink extends shapes.standard.Link {
    defaults() {
        return util.defaultsDeep(
            {
                type: 'UMLLink',
                attrs: {
                    root: {
                        pointerEvents: 'none'
                    },
                    line: {
                        stroke: COLORS.outlineColor,
                        targetMarker: {
                            type: 'path',
                            fill: 'none',
                            stroke: COLORS.outlineColor,
                            'stroke-width': 2,
                            d: 'M 7 -4 0 0 7 4'
                        }
                    }
                }
            },
            super.defaults
        );
    }
}

class Aggregation extends UMLLink {
    defaults() {
        return util.defaultsDeep(
            {
                type: 'Aggregation',
                attrs: {
                    line: {
                        sourceMarker: {
                            type: 'path',
                            fill: COLORS.background,
                            'stroke-width': 2,
                            d: 'M 10 -4 0 0 10 4 20 0 z'
                        }
                    }
                }
            },
            super.defaults()
        );
    }
}

class Composition extends UMLLink {
    defaults() {
        return util.defaultsDeep(
            {
                type: 'Composition',
                attrs: {
                    line: {
                        sourceMarker: {
                            type: 'path',
                            fill: COLORS.outlineColor,
                            'stroke-width': 2,
                            d: 'M 10 -4 0 0 10 4 20 0 z'
                        }
                    }
                }
            },
            super.defaults()
        );
    }
}

class UML extends shapes.standard.Record {
    defaults() {
        return util.defaultsDeep(
            {
                thickness: 2,
                headerColor: COLORS.header,
                textColor: COLORS.text,
                outlineColor: COLORS.outline,
                color: COLORS.main,
                itemHeight: 2 * UNIT,
                itemOffset: 5,
                umlName: '',
                umlType: '',
                attrs: {
                    root: {
                        magnetSelector: 'body'
                    },
                    body: {
                        width: 'calc(w)',
                        height: 'calc(h)',
                        stroke: '#000000',
                        fill: '#FFFFFF',
                        rx: RADIUS,
                        ry: RADIUS
                    },
                    header: {
                        width: 'calc(w)',
                        stroke: '#000000',
                        fill: 'transparent'
                    },
                    typeNameLabel: {
                        x: 'calc(0.5 * w)',
                        height: 'calc(h)',
                        textAnchor: 'middle',
                        textVerticalAnchor: 'middle',
                        fontSize: 14,
                        fill: 'none',
                        fontFamily: 'sans-serif'
                    },
                    umlNameLabel: {
                        x: 'calc(0.5 * w)',
                        fontFamily: 'sans-serif',
                        textAnchor: 'middle',
                        textVerticalAnchor: 'middle',
                        fontSize: 18,
                        fontWeight: 'bold',
                        fill: COLORS.textColor
                    },
                    itemLabel_attributesHeader: {
                        fontFamily: 'sans-serif',
                        fontStyle: 'italic',
                        textAnchor: 'middle',
                        x: 'calc(0.5 * w)',
                        fontSize: 12
                    },
                    itemLabel_operationsHeader: {
                        fontFamily: 'sans-serif',
                        fontStyle: 'italic',
                        textAnchor: 'middle',
                        x: 'calc(0.5 * w)',
                        fontSize: 12
                    },
                    itemLabels_static: {
                        textDecoration: 'underline'
                    },
                    itemLabels: {
                        fontFamily: 'sans-serif'
                    }
                }
            },
            super.defaults
        );
    }

    preinitialize(...args) {
        super.preinitialize(...args);
        this.markup = [
            {
                tagName: 'rect',
                selector: 'body'
            },
            {
                tagName: 'rect',
                selector: 'header'
            },
            {
                tagName: 'text',
                selector: 'umlNameLabel'
            },
            {
                tagName: 'text',
                selector: 'typeNameLabel'
            }
        ];
    }

    buildHeader() {
        const {
            umlType,
            umlName,
            textColor,
            outlineColor,
            headerColor,
            thickness
        } = this.attributes;

        return {
            header: {
                stroke: outlineColor,
                strokeWidth: thickness,
                height: TYPE_HEIGHT + NAME_HEIGHT,
                fill: headerColor
            },
            typeNameLabel: {
                y: TYPE_HEIGHT,
                text: `<<${umlType}>>`,
                fill: textColor,
                textVerticalAnchor: 'bottom'
            },
            umlNameLabel: {
                y: TYPE_HEIGHT + NAME_HEIGHT / 2,
                text: umlName,
                fill: textColor
            }
        };
    }
}

class UMLComponent extends UML {
    defaults() {
        return {
            ...super.defaults(),
            type: 'UMLComponent',
            subComponents: [],
            ports: {
                groups: {
                    subComponents: {
                        position: {
                            name: 'bottom'
                        }
                    }
                }
            }
        };
    }

    initialize(...args) {
        super.initialize(...args);
        this.buildShape();
    }

    buildShape(opt = {}) {
        const {
            subComponents,
            outlineColor,
            thickness,
            color,
            textColor
        } = this.attributes;

        this.removePorts();

        if (subComponents.length > 0) {
            subComponents.forEach((subComponent) => {
                const { name, type, subheader } = subComponent;
                this.addPort(
                    getPackagePort(name, type, subheader, color, outlineColor, thickness)
                );
            });
        }

        const headerAttrs = this.buildHeader();
        const padding = util.normalizeSides(this.get('padding'));

        this.set(
            {
                padding: { ...padding, top: TYPE_HEIGHT + NAME_HEIGHT },
                attrs: util.defaultsDeep(
                    {
                        body: {
                            stroke: outlineColor,
                            strokeWidth: thickness,
                            fill: color
                        },
                        ...headerAttrs,
                        itemLabels: {
                            fill: textColor
                        },
                        itemBody_delimiter: {
                            fill: outlineColor
                        }
                    },
                    this.attr()
                )
            },
            opt
        );
    }
}
class UMLClass extends UML {
    defaults() {
        return {
            ...super.defaults(),
            type: 'UMLClass',
            attributesHeader: '',
            operationsHeader: ''
        };
    }

    initialize(...args) {
        super.initialize(...args);
        this.buildItems();
    }

    buildItems(opt = {}) {
        const {
            attributesHeader,
            operationsHeader,
            color,
            outlineColor,
            textColor,
            attributes = [],
            operations = [],
            thickness
        } = this.attributes;

        const attributesItems = attributes.map((attribute, index) => {
            const {
                visibility = '+',
                name = '',
                type = '',
                isStatic = false
            } = attribute;
            return {
                id: `attribute${index}`,
                label: `${name}: ${type}`,
                icon: this.getVisibilityIcon(visibility, textColor),
                group: isStatic ? 'static' : null
            };
        });

        const operationsItems = operations.map((operation, index) => {
            const {
                visibility = '+',
                name = '',
                returnType = '',
                parameters = [],
                isStatic = false
            } = operation;

            const nameParams = parameters
                ? parameters.map((parameter) => {
                    const { name = '', returnType = '' } = parameter;
                    return `${name}: ${returnType}`;
                })
                : [];

            return {
                id: `operation${index}`,
                label: `${name}(${nameParams.join(',')}): ${returnType}`,
                icon: this.getVisibilityIcon(visibility, textColor),
                group: isStatic ? 'static' : null
            };
        });

        const items = [];

        if (attributesHeader) {
            items.push({
                id: 'attributesHeader',
                label: attributesHeader
            });
        }

        items.push(...attributesItems);

        if (attributesItems.length > 0 && operationsItems.length > 0) {
            items.push({
                id: 'delimiter',
                height: thickness,
                label: ''
            });
        }

        if (operationsHeader) {
            items.push({
                id: 'operationsHeader',
                label: operationsHeader
            });
        }

        items.push(...operationsItems);

        const headerAttrs = this.buildHeader();
        const padding = util.normalizeSides(this.get('padding'));

        this.set(
            {
                padding: { ...padding, top: TYPE_HEIGHT + NAME_HEIGHT },
                attrs: util.defaultsDeep(
                    {
                        body: {
                            stroke: outlineColor,
                            strokeWidth: thickness,
                            fill: color
                        },
                        ...headerAttrs,
                        itemLabels: {
                            fill: textColor
                        },
                        itemBody_delimiter: {
                            fill: outlineColor
                        }
                    },
                    this.attr()
                ),
                items: [items]
            },
            opt
        );
    }

    getVisibilityIcon(visibility, color) {
        const d = {
            '+': 'M 8 0 V 16 M 0 8 H 16',
            '-': 'M 0 8 H 16',
            '#': 'M 5 0 3 16 M 0 5 H 16 M 12 0 10 16 M 0 11 H 16',
            '~': 'M 0 8 A 4 4 1 1 1 8 8 A 4 4 1 1 0 16 8',
            '/': 'M 12 0 L 4 16'
        }[visibility];
        return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg
                  xmlns='http://www.w3.org/2000/svg'
                  xmlns:xlink='http://www.w3.org/1999/xlink'
                  version='1.1'
                  viewBox='-3 -3 22 22'
              >
                  <path d='${d}' stroke='${color}' stroke-width='2' fill='none'/>
              </svg>`)}`;
    }
}

// Enable UML elements and links to be recreated from JSON
// Test: graph.fromJSON(graph.toJSON())
Object.assign(shapeNamespace, {
    UMLClass,
    UMLComponent,
    Composition,
    Aggregation
});

// -- Instantiating UML elements and links

const bitcoin = new UMLClass({
    size: { width: 1000 },
    position: { x: 50, y: 50 },
    umlName: 'Bitcoin',
    umlType: 'system'
});

const blockChain = new UMLClass({
    size: { width: 160 },
    position: { x: 150, y: 170 },
    umlName: 'Block chain',
    umlType: 'block'
});

const bcComposition = new Composition({
    source: { id: bitcoin.id, anchor: { name: 'bottom', args: { dx: -320 }}},
    target: { id: blockChain.id, anchor: { name: 'top' }},
    labels: createLabels([
        {
            content: 'bc',
            type: 'label-target'
        },
        {
            content: '0..1',
            type: 'multiplicity-target'
        }
    ])
});

const pool = new UMLClass({
    size: { width: 140 },
    position: { x: 540, y: 170 },
    umlName: 'Pool',
    umlType: 'block'
});

const poolComposition = new Composition({
    source: { id: bitcoin.id, anchor: { name: 'bottom', args: { dx: 60 }}},
    target: { id: pool.id, anchor: { name: 'top' }},
    labels: createLabels([
        {
            content: 'pl',
            type: 'label-target'
        },
        {
            content: '0..*',
            type: 'multiplicity-target'
        }
    ])
});

const bitcoinBlock = new UMLClass({
    size: { width: 140 },
    position: { x: 740, y: 170 },
    umlName: 'bitcoin',
    umlType: 'block'
});

const btcBlockComposition = new Composition({
    source: { id: bitcoin.id, anchor: { name: 'bottom', args: { dx: 260 }}},
    target: { id: bitcoinBlock.id, anchor: { name: 'top' }},
    labels: createLabels([
        {
            content: 'btc',
            type: 'label-target'
        },
        {
            content: '50..21M',
            type: 'multiplicity-target'
        }
    ])
});

const block = new UMLClass({
    size: { width: 280 },
    position: { x: 80, y: 300 },
    padding: { bottom: 2 * MARGIN },
    umlName: 'Block',
    umlType: 'block',
    attributesHeader: 'references',
    attributes: [
        {
            name: 'prevBlockHash',
            visibility: '-',
            type: 'Block'
        }
    ],
    operationsHeader: 'values',
    operations: [
        {
            name: 'nonce',
            returnType: 'Real'
        },
        {
            name: 'timestamp',
            returnType: 'DateTime'
        },
        {
            name: 'version',
            returnType: 'Real'
        }
    ]
});

const blockComposition = new Composition({
    source: { id: blockChain.id, anchor: { name: 'bottom' }},
    target: { id: block.id, anchor: { name: 'top', args: { dx: 10 }}},
    labels: createLabels([
        {
            type: 'multiplicity-target',
            content: '1..*'
        }
    ])
});

const nodeBlock = new UMLClass({
    size: { width: 280 },
    position: { x: 570, y: 280 },
    padding: { bottom: 2 * MARGIN },
    umlName: 'Node',
    umlType: 'block',
    attributesHeader: 'values',
    attributes: [
        {
            name: 'ipAddress',
            type: 'String'
        }
    ]
});

const bitcoinNodeBlockComposition = new Composition({
    source: { id: bitcoin.id, anchor: { name: 'bottom', args: { dx: 160 }}},
    target: { id: nodeBlock.id, anchor: { name: 'top' }},
    labels: createLabels([
        {
            type: 'label-target',
            content: 'nd'
        },
        {
            type: 'multiplicity-target',
            content: '1..*'
        }
    ])
});

const poolNodeBlockAggregation = new Aggregation({
    source: { id: pool.id, anchor: { name: 'bottom' }},
    target: { id: nodeBlock.id, anchor: { name: 'top', args: { dx: -100 }}}
});

const nodeLoopAggregation = new Aggregation({
    source: { id: nodeBlock.id, anchor: { name: 'top', args: { dx: 120 }}},
    target: { id: nodeBlock.id, anchor: { name: 'right', args: { dy: -25 }}},
    labels: createLabels([
        {
            type: 'multiplicity-target',
            content: '1..*'
        },
        {
            type: 'label-target',
            content: 'connNode'
        }
    ])
});

const blockChainNodeBlockComposition = new Aggregation({
    source: { id: nodeBlock.id, anchor: { name: 'left' }},
    target: { id: blockChain.id, anchor: { name: 'right' }},
    labels: createLabels([
        {
            type: 'label-target',
            content: 'nodeBC'
        }
    ])
});

const treeHash = new UMLClass({
    size: { width: 160 },
    position: { x: 100, y: 570 },
    umlName: 'Tree hash',
    umlType: 'block'
});

const treeHashComposition = new Composition({
    source: { id: block.id, anchor: { name: 'bottom', args: { dx: -40 }}},
    target: { id: treeHash.id, anchor: { name: 'top' }},
    labels: createLabels([
        {
            type: 'label-target',
            content: 'merkle'
        }
    ])
});

const thLeftLoop = new Composition({
    source: { id: treeHash.id, anchor: { name: 'bottom', args: { dx: -60 }}},
    target: { id: treeHash.id, anchor: { name: 'left', args: { dy: 5 }}},
    labels: createLabels([
        {
            type: 'label-target',
            content: 'left'
        },
        {
            type: 'multiplicity-target',
            content: '0..1'
        }
    ])
});

const thRightLoop = new Composition({
    source: { id: treeHash.id, anchor: { name: 'bottom', args: { dx: 60 }}},
    target: { id: treeHash.id, anchor: { name: 'right', args: { dy: 5 }}},
    labels: createLabels([
        {
            type: 'label-target',
            content: 'right'
        },
        {
            type: 'multiplicity-target',
            content: '0..1'
        }
    ])
});

const transactionBlock = new UMLClass({
    size: { width: 200 },
    position: { x: 380, y: 570 },
    umlName: 'Transaction',
    umlType: 'block'
});

const thTransactionAggregation = new Aggregation({
    source: { id: treeHash.id, anchor: { name: 'top', args: { dx: 60 }}},
    target: {
        id: transactionBlock.id,
        anchor: { name: 'top', args: { dx: -80 }}
    },
    labels: createLabels([
        {
            type: 'label-target',
            content: 'hash'
        },
        {
            type: 'multiplicity-target',
            content: '0,2'
        }
    ])
});

const blockTransactionComposition = new Composition({
    source: { id: block.id, anchor: { name: 'right' }},
    target: {
        id: transactionBlock.id,
        anchor: { name: 'top', args: { dx: -20 }}
    },
    labels: createLabels([
        {
            type: 'label-target',
            content: 'tx'
        },
        {
            type: 'multiplicity-target',
            content: '1..*'
        }
    ])
});

const transactionInLoopAggregation = new Aggregation({
    source: {
        id: transactionBlock.id,
        anchor: { name: 'bottom', args: { dx: -80 }}
    },
    target: {
        id: transactionBlock.id,
        anchor: { name: 'left', args: { dy: 5 }}
    },
    labels: createLabels([
        {
            type: 'label-target',
            content: 'txIn'
        },
        {
            type: 'multiplicity-target',
            content: '1..*'
        }
    ])
});

const transactionOutLoopAggregation = new Aggregation({
    source: {
        id: transactionBlock.id,
        anchor: { name: 'bottom', args: { dx: 80 }}
    },
    target: {
        id: transactionBlock.id,
        anchor: { name: 'right', args: { dy: 5 }}
    },
    labels: createLabels([
        {
            type: 'label-target',
            content: 'txOut'
        },
        {
            type: 'multiplicity-target',
            content: '1..*'
        }
    ])
});

const bitcoinWallet = new UMLClass({
    size: { width: 200 },
    position: { x: 610, y: 440 },
    padding: { bottom: 2 * MARGIN },
    umlName: 'Bitcoin Wallet',
    umlType: 'block',
    attributesHeader: 'values',
    attributes: [
        {
            name: 'pubKey',
            type: 'String[1..*]'
        },
        {
            name: 'pvtKey',
            type: 'String'
        }
    ]
});

const walletAggregation = new Aggregation({
    source: {
        id: transactionBlock.id,
        anchor: { name: 'top', args: { dx: 30 }}
    },
    target: { id: bitcoinWallet.id, anchor: { name: 'left' }},
    labels: createLabels([
        {
            type: 'label-target',
            content: 'pubKey'
        }
    ])
});

const walletComposition = new Composition({
    source: { id: nodeBlock.id, anchor: { name: 'bottom' }},
    target: { id: bitcoinWallet.id, anchor: { name: 'top' }}
});

const bitcoinSw = new UMLComponent({
    size: { width: 200 },
    position: { x: 850, y: 470 },
    padding: { bottom: 2 * MARGIN },
    umlName: 'Bitcoin SW',
    umlType: 'block',
    subComponents: [
        {
            name: 'transaction',
            type: 'Bitcoin',
            subheader: 'Protocol'
        },
        {
            name: 'mine',
            type: 'Mining',
            subheader: 'Protocol[0..1]'
        }
    ]
});

const bitcoinSWAggregation = new Aggregation({
    source: { id: bitcoinSw.id, anchor: { name: 'top', args: { dx: -40 }}},
    target: { id: nodeBlock.id, anchor: { name: 'right', args: { dy: 30 }}},
    labels: createLabels([
        {
            type: 'label-target',
            content: 'seed'
        },
        {
            type: 'multiplicity-target',
            content: '1..*'
        }
    ])
});

const bitcoinSWComposition = new Composition({
    source: { id: bitcoin.id, anchor: { name: 'bottom', args: { dx: 400 }}},
    target: { id: bitcoinSw.id, anchor: { name: 'top' }}
});

graph.addCells([
    bitcoin,
    blockChain,
    bcComposition,
    pool,
    poolComposition,
    bitcoinBlock,
    btcBlockComposition,
    block,
    blockComposition,
    nodeBlock,
    bitcoinNodeBlockComposition,
    poolNodeBlockAggregation,
    nodeLoopAggregation,
    blockChainNodeBlockComposition,
    treeHash,
    treeHashComposition,
    transactionBlock,
    thTransactionAggregation,
    thLeftLoop,
    thRightLoop,
    blockTransactionComposition,
    transactionInLoopAggregation,
    transactionOutLoopAggregation,
    bitcoinWallet,
    walletAggregation,
    walletComposition,
    bitcoinSw,
    bitcoinSWAggregation,
    bitcoinSWComposition
]);

graph.getLinks().forEach((link) => updateLabelsTextAnchor(link));

// -- Tools

class TargetAnchorWithLabels extends linkTools.TargetAnchor {
    updateAnchor() {
        super.updateAnchor();
        updateLabelsTextAnchor(this.relatedView.model);
    }
}

class SourceAnchorWithLabels extends linkTools.SourceAnchor {
    updateAnchor() {
        super.updateAnchor();
        updateLabelsTextAnchor(this.relatedView.model);
    }
}

// Update the link labels position based on the anchor position name stored in
// the link's source/target anchor property.
// This way the link views do not need to be rendered to get the anchor position.
function updateLabelsTextAnchor(link) {
    const labels = util.cloneDeep(link.labels()).map((label) => {
        let anchorDef, element;
        if (label.position.distance < 0) {
            element = link.getTargetCell();
            anchorDef = link.target().anchor;
        } else {
            element = link.getSourceCell();
            anchorDef = link.source().anchor;
        }
        const bbox = element.getBBox();
        const { name = 'topLeft', args = {}} = anchorDef;
        const anchorName = util.toKebabCase(name);
        const anchorOffset = { x: args.dx, y: args.dy };
        const anchor = util
            .getRectPoint(bbox, anchorName)
            .offset(anchorOffset);
        label.attrs.text.textAnchor = getTextAnchor(
            bbox.sideNearestToPoint(anchor)
        );
        return label;
    });
    link.labels(labels);
}

// -- Event handlers

paper.on('element:pointerclick', (elementView) => {
    paper.removeTools();
    const element = elementView.model;
    const toolsView = new dia.ToolsView({
        tools: [
            new elementTools.Boundary({
                attributes: {
                    rx: RADIUS,
                    ry: RADIUS,
                    fill: 'none',
                    stroke: COLORS.outline,
                    'stroke-dasharray': '6,2',
                    'stroke-width': 1,
                    'pointer-events': 'none'
                }
            })
        ]
    });
    elementView.addTools(toolsView);
    const customAnchorAttributes = {
        'stroke-width': 2,
        fill: COLORS.tools,
        stroke: COLORS.outline,
        r: 6
    };
    graph.getConnectedLinks(element).forEach((link) => {
        const tools = [];
        if (link.source().id === element.id) {
            tools.push(
                new SourceAnchorWithLabels({
                    snap: snapAnchorToGrid,
                    anchor: getAbsoluteAnchor,
                    resetAnchor: false,
                    // Hide the area where the anchor can be moved.
                    // We already restrict the movement to the element's boundary with snapAnchor().
                    restrictArea: false,
                    customAnchorAttributes
                })
            );
        }
        if (link.target().id === element.id) {
            tools.push(
                new TargetAnchorWithLabels({
                    snap: snapAnchorToGrid,
                    anchor: getAbsoluteAnchor,
                    resetAnchor: false,
                    // See `SourceAnchorWithLabels` above.
                    restrictArea: false,
                    customAnchorAttributes
                })
            );
        }
        const linkView = paper.findViewByModel(link);
        const toolsView = new dia.ToolsView({ tools });
        linkView.addTools(toolsView);
    });
});

paper.on('blank:pointerdown', () => {
    paper.removeTools();
});

// -- Helpers

// Snap the anchor to the grid
// and to the center of the element if it's close enough.
function snapAnchorToGrid(coords, endView) {
    coords.snapToGrid(UNIT);
    const bbox = endView.model.getBBox();
    // Find the closest point on the bbox border.
    return bbox.pointNearestToPoint(coords);
}

function getAbsoluteAnchor(coords, view, magnet) {
    // Calculate the anchor offset from the magnet's top-left corner.
    return connectionStrategies.pinAbsolute({}, view, magnet, coords).anchor;
}

function getPackagePort(name, type, subheader, color, outlineColor, thickness) {
    return {
        group: 'subComponents',
        label: {
            position: {
                name: 'bottom'
            },
            markup: [
                {
                    tagName: 'text',
                    selector: 'name'
                },
                {
                    tagName: 'text',
                    selector: 'subheader'
                }
            ]
        },
        attrs: {
            body: {
                width: 24,
                height: 24,
                x: -12,
                y: -6,
                stroke: outlineColor,
                fill: color,
                strokeWidth: thickness
            },
            name: {
                text: `${name}: ${type}`,
                fill: COLORS.textColor,
                y: 16,
                fontSize: 12,
                fontFamily: 'sans-serif'
            },
            subheader: {
                text: `${subheader}`,
                fill: COLORS.textColor,
                y: 28,
                fontSize: 12,
                fontFamily: 'sans-serif'
            }
        },
        markup: [
            {
                tagName: 'rect',
                selector: 'body'
            }
        ]
    };
}

function getTextAnchor(side) {
    return side === 'left' || side === 'bottom' ? 'end' : 'start';
}

function createLabels(comments) {
    return comments.map((comment) => {
        const { type, content } = comment;

        const [commentType, position] = type.split('-');

        const isSource = position === 'source';
        const isLabel = commentType === 'label';

        return {
            attrs: {
                text: {
                    text: content,
                    fontSize: 12,
                    fill: COLORS.textColor,
                    fontFamily: 'sans-serif',
                    textVerticalAnchor: 'middle',
                    pointerEvents: 'none'
                    // textAnchor is set in `updateLabelsTextAnchor()`
                },
                rect: {
                    fill: COLORS.background
                }
            },
            position: {
                distance: isSource ? MARGIN : -MARGIN,
                offset: UNIT * (isLabel ? 1 : -1),
                args: {
                    keepGradient: true,
                    ensureLegibility: true
                }
            }
        };
    });
}

// A custom router the find an orthogonal path between two elements.
// Note: it completely ignores vertices

function orthogonalRouter(vertices, opt, linkView) {
    var sourceBBox = linkView.sourceBBox;
    var targetBBox = linkView.targetBBox;
    var sourcePoint = linkView.sourceAnchor;
    var targetPoint = linkView.targetAnchor;
    const { x: tx0, y: ty0 } = targetBBox;
    const { x: sx0, y: sy0 } = sourceBBox;
    const sourceOutsidePoint = sourcePoint.clone();
    const spacing = 28;
    const sourceSide = sourceBBox.sideNearestToPoint(sourcePoint);
    switch (sourceSide) {
        case 'left':
            sourceOutsidePoint.x = sx0 - spacing;
            break;
        case 'right':
            sourceOutsidePoint.x = sx0 + sourceBBox.width + spacing;
            break;
        case 'top':
            sourceOutsidePoint.y = sy0 - spacing;
            break;
        case 'bottom':
            sourceOutsidePoint.y = sy0 + sourceBBox.height + spacing;
            break;
    }
    const targetOutsidePoint = targetPoint.clone();
    const targetSide = targetBBox.sideNearestToPoint(targetPoint);
    switch (targetSide) {
        case 'left':
            targetOutsidePoint.x = targetBBox.x - spacing;
            break;
        case 'right':
            targetOutsidePoint.x = targetBBox.x + targetBBox.width + spacing;
            break;
        case 'top':
            targetOutsidePoint.y = targetBBox.y - spacing;
            break;
        case 'bottom':
            targetOutsidePoint.y = targetBBox.y + targetBBox.height + spacing;
            break;
    }

    const { x: sox, y: soy } = sourceOutsidePoint;
    const { x: tox, y: toy } = targetOutsidePoint;
    const tx1 = tx0 + targetBBox.width;
    const ty1 = ty0 + targetBBox.height;
    const tcx = (tx0 + tx1) / 2;
    const tcy = (ty0 + ty1) / 2;
    const sx1 = sx0 + sourceBBox.width;
    const sy1 = sy0 + sourceBBox.height;

    if (sourceSide === 'left' && targetSide === 'right') {
        if (sox < tox) {
            let y = (soy + toy) / 2;
            if (sox < tx0) {
                if (y > tcy && y < ty1 + spacing) {
                    y = ty0 - spacing;
                } else if (y <= tcy && y > ty0 - spacing) {
                    y = ty1 + spacing;
                }
            }
            return [
                { x: sox, y: soy },
                { x: sox, y },
                { x: tox, y },
                { x: tox, y: toy }
            ];
        } else {
            const x = (sox + tox) / 2;
            return [
                { x, y: soy },
                { x, y: toy }
            ];
        }
    } else if (sourceSide === 'right' && targetSide === 'left') {
        // Right to left
        if (sox > tox) {
            let y = (soy + toy) / 2;
            if (sox > tx1) {
                if (y > tcy && y < ty1 + spacing) {
                    y = ty0 - spacing;
                } else if (y <= tcy && y > ty0 - spacing) {
                    y = ty1 + spacing;
                }
            }
            return [
                { x: sox, y: soy },
                { x: sox, y },
                { x: tox, y },
                { x: tox, y: toy }
            ];
        } else {
            const x = (sox + tox) / 2;
            return [
                { x, y: soy },
                { x, y: toy }
            ];
        }
    } else if (sourceSide === 'top' && targetSide === 'bottom') {
        // analogical to let to right
        if (soy < toy) {
            let x = (sox + tox) / 2;
            if (soy < ty0) {
                if (x > tcx && x < tx1 + spacing) {
                    x = tx0 - spacing;
                } else if (x <= tcx && x > tx0 - spacing) {
                    x = tx1 + spacing;
                }
            }
            return [
                { x: sox, y: soy },
                { x, y: soy },
                { x, y: toy },
                { x: tox, y: toy }
            ];
        }
        const y = (soy + toy) / 2;
        return [
            { x: sox, y },
            { x: tox, y }
        ];
    } else if (sourceSide === 'bottom' && targetSide === 'top') {
        // analogical to right to left
        if (soy >= toy) {
            let x = (sox + tox) / 2;
            if (soy > ty1) {
                if (x > tcx && x < tx1 + spacing) {
                    x = tx0 - spacing;
                } else if (x <= tcx && x > tx0 - spacing) {
                    x = tx1 + spacing;
                }
            }
            return [
                { x: sox, y: soy },
                { x, y: soy },
                { x, y: toy },
                { x: tox, y: toy }
            ];
        }
        const y = (soy + toy) / 2;
        return [
            { x: sox, y },
            { x: tox, y }
        ];
    } else if (sourceSide === 'top' && targetSide === 'top') {
        const y = Math.min(soy, toy);
        return [
            { x: sox, y },
            { x: tox, y }
        ];
    } else if (sourceSide === 'bottom' && targetSide === 'bottom') {
        const y = Math.max(soy, toy);
        return [
            { x: sox, y },
            { x: tox, y }
        ];
    } else if (sourceSide === 'left' && targetSide === 'left') {
        const x = Math.min(sox, tox);
        return [
            { x, y: soy },
            { x, y: toy }
        ];
    } else if (sourceSide === 'right' && targetSide === 'right') {
        const x = Math.max(sox, tox);
        return [
            { x, y: soy },
            { x, y: toy }
        ];
    } else if (sourceSide === 'top' && targetSide === 'right') {
        if (soy > toy) {
            if (sox < tox) {
                let y = (sy0 + toy) / 2;
                if (y > tcy && y < ty1 + spacing && sox < tx0 - spacing) {
                    y = ty0 - spacing;
                }
                return [
                    { x: sox, y },
                    { x: tox, y },
                    { x: tox, y: toy }
                ];
            }
            return [{ x: sox, y: toy }];
        }
        const x = (sx0 + tox) / 2;
        if (x > sx0 - spacing && soy < ty1) {
            const y = Math.min(sy0, ty0) - spacing;
            const x = Math.max(sx1, tx1) + spacing;
            return [
                { x: sox, y },
                { x, y },
                { x, y: toy }
            ];
        }
        return [
            { x: sox, y: soy },
            { x: x, y: soy },
            { x: x, y: toy }
        ];
    } else if (sourceSide === 'top' && targetSide === 'left') {
        if (soy > toy) {
            if (sox > tox) {
                let y = (sy0 + toy) / 2;
                if (y > tcy && y < ty1 + spacing && sox > tx1 + spacing) {
                    y = ty0 - spacing;
                }
                return [
                    { x: sox, y },
                    { x: tox, y },
                    { x: tox, y: toy }
                ];
            }
            return [{ x: sox, y: toy }];
        }
        const x = (sx1 + tox) / 2;
        if (x < sx1 + spacing && soy < ty1) {
            const y = Math.min(sy0, ty0) - spacing;
            const x = Math.min(sx0, tx0) - spacing;
            return [
                { x: sox, y },
                { x, y },
                { x, y: toy }
            ];
        }
        return [
            { x: sox, y: soy },
            { x: x, y: soy },
            { x: x, y: toy }
        ];
    } else if (sourceSide === 'bottom' && targetSide === 'right') {
        if (soy < toy) {
            if (sox < tox) {
                let y = (sy1 + ty0) / 2;
                if (y < tcy && y > ty0 - spacing && sox < tx0 - spacing) {
                    y = ty1 + spacing;
                }
                return [
                    { x: sox, y },
                    { x: tox, y },
                    { x: tox, y: toy }
                ];
            }
            return [
                { x: sox, y: soy },
                { x: sox, y: toy },
                { x: tox, y: toy }
            ];
        }
        const x = (sx0 + tox) / 2;
        if (x > sx0 - spacing && sy1 > toy) {
            const y = Math.max(sy1, ty1) + spacing;
            const x = Math.max(sx1, tx1) + spacing;
            return [
                { x: sox, y },
                { x, y },
                { x, y: toy }
            ];
        }
        return [
            { x: sox, y: soy },
            { x: x, y: soy },
            { x: x, y: toy },
            { x: tox, y: toy }
        ];
    } else if (sourceSide === 'bottom' && targetSide === 'left') {
        if (soy < toy) {
            if (sox > tox) {
                let y = (sy1 + ty0) / 2;
                if (y < tcy && y > ty0 - spacing && sox > tx1 + spacing) {
                    y = ty1 + spacing;
                }
                return [
                    { x: sox, y },
                    { x: tox, y },
                    { x: tox, y: toy }
                ];
            }
            return [
                { x: sox, y: soy },
                { x: sox, y: toy },
                { x: tox, y: toy }
            ];
        }
        const x = (sx1 + tox) / 2;
        if (x < sx1 + spacing && sy1 > toy) {
            const y = Math.max(sy1, ty1) + spacing;
            const x = Math.min(sx0, tx0) - spacing;
            return [
                { x: sox, y },
                { x, y },
                { x, y: toy }
            ];
        }
        return [
            { x: sox, y: soy },
            { x: x, y: soy },
            { x: x, y: toy },
            { x: tox, y: toy }
        ];
    } else if (sourceSide === 'left' && targetSide === 'bottom') {
        if (sox > tox) {
            if (soy < toy) {
                let x = (sx0 + tx1) / 2;
                if (x > tcx && x < tx1 + spacing && soy < ty0 - spacing) {
                    x = Math.max(sx1, tx1) + spacing;
                }
                return [
                    { x, y: soy },
                    { x, y: toy },
                    { x: tox, y: toy }
                ];
            }
            return [{ x: tox, y: soy }];
        }
        const y = (sy0 + ty1) / 2;
        if (y > sy0 - spacing) {
            const x = Math.min(sx0, tx0) - spacing;
            const y = Math.max(sy1, ty1) + spacing;
            return [
                { x, y: soy },
                { x, y },
                { x: tox, y }
            ];
        }
        return [
            { x: sox, y: soy },
            { x: sox, y: y },
            { x: tox, y },
            { x: tox, y: toy }
        ];
    } else if (sourceSide === 'left' && targetSide === 'top') {
        // Analogy to the left - bottom case.
        if (sox > tox) {
            if (soy > toy) {
                let x = (sx0 + tx1) / 2;
                if (x > tcx && x < tx1 + spacing && soy > ty1 + spacing) {
                    x = Math.max(sx1, tx1) + spacing;
                }
                return [
                    { x, y: soy },
                    { x, y: toy },
                    { x: tox, y: toy }
                ];
            }
            return [{ x: tox, y: soy }];
        }
        const y = (sy1 + ty0) / 2;
        if (y < sy1 + spacing) {
            const x = Math.min(sx0, tx0) - spacing;
            const y = Math.min(sy0, ty0) - spacing;
            return [
                { x, y: soy },
                { x, y },
                { x: tox, y }
            ];
        }
        return [
            { x: sox, y: soy },
            { x: sox, y: y },
            { x: tox, y },
            { x: tox, y: toy }
        ];
    } else if (sourceSide === 'right' && targetSide === 'top') {
        // Analogy to the right - bottom case.
        if (sox < tox) {
            if (soy > toy) {
                let x = (sx1 + tx0) / 2;
                if (x < tcx && x > tx0 - spacing && soy > ty1 + spacing) {
                    x = Math.max(sx1, tx1) + spacing;
                }
                return [
                    { x, y: soy },
                    { x, y: toy },
                    { x: tox, y: toy }
                ];
            }
            return [{ x: tox, y: soy }];
        }
        const y = (sy1 + ty0) / 2;
        if (y < sy1 + spacing) {
            const x = Math.max(sx1, tx1) + spacing;
            const y = Math.min(sy0, ty0) - spacing;
            return [
                { x, y: soy },
                { x, y },
                { x: tox, y }
            ];
        }
        return [
            { x: sox, y: soy },
            { x: sox, y: y },
            { x: tox, y },
            { x: tox, y: toy }
        ];
    } else if (sourceSide === 'right' && targetSide === 'bottom') {
        // Analogy to the right - top case.
        if (sox < tox) {
            if (soy < toy) {
                let x = (sx1 + tx0) / 2;
                if (x < tcx && x > tx0 - spacing && soy < ty0 - spacing) {
                    x = Math.min(sx0, tx0) - spacing;
                }
                return [
                    { x, y: soy },
                    { x, y: toy },
                    { x: tox, y: toy }
                ];
            }
            return [
                { x: sox, y: soy },
                { x: tox, y: soy },
                { x: tox, y: toy }
            ];
        }
        const y = (sy0 + ty1) / 2;
        if (y > sy0 - spacing) {
            const x = Math.max(sx1, tx1) + spacing;
            const y = Math.max(sy1, ty1) + spacing;
            return [
                { x, y: soy },
                { x, y },
                { x: tox, y }
            ];
        }
        return [
            { x: sox, y: soy },
            { x: sox, y: y },
            { x: tox, y },
            { x: tox, y: toy }
        ];
    }
}

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

window.addEventListener('resize', () => scaleToFit());
scaleToFit();
