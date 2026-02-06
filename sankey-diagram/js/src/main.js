// The credit for this example goes primarily to Sylwia Zawada from Neoteric

import {
    shapes as defaultShapes,
    dia,
    util,
    highlighters,
    ui,
    mvc,
    V,
    config
} from '@joint/plus';
import './styles.scss';

config.layerAttribute = 'graphLayer';

const logo = `
      <svg version="1.2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 280" fill="#DA3D40" x="20" y="20" width="200" height="50">
          <path opacity="0.05" d="m130.71 225.71l-27.28-27.27q0-0.01 0-0.01h76.41v-103.68h27.28c0 0 0 59.4 0 98.19l-32.77 32.77zm330.37-116.97c10.68 10.41 17.29 25.87 17.29 46.13 0 20.26-6.61 35.71-17.29 46.13-10.69 10.41-25.47 15.79-41.91 15.79-16.44 0-31.22-5.38-41.91-15.79-10.68-10.42-17.29-25.87-17.29-46.13 0-20.26 6.61-35.72 17.29-46.13 10.69-10.41 25.47-15.79 41.91-15.79 16.44 0 31.22 5.38 41.91 15.79zm401.41-18.61q-8.23-7.14-22.76-7.15-11.77 0.01-18.3 5.07-6.59 5.11-6.59 14.42 0 6.67 3.47 10.89 3.42 4.18 10.27 7.59 6.77 3.37 20.96 8.6h0.01q14.98 5.85 23.95 10.62 8.92 4.74 15.31 13.26 6.38 8.48 6.38 21.16 0 12.48-6.28 22.05-6.29 9.58-18.03 14.86-11.78 5.29-27.76 5.29-15.99 0-28.09-5.4-12.05-5.39-18.55-15.18-6.49-9.79-6.49-22.71v-7.66h23.37v6.36q-0.01 10.17 8.71 16.92 8.64 6.7 22.95 6.7 13.05-0.01 19.69-5.74 6.69-5.76 6.69-14.84-0.01-6.23-3.69-10.56-3.63-4.29-10.37-7.81-6.67-3.48-20.01-8.7 0 0-0.01 0-14.98-5.64-24.27-10.63-9.23-4.95-15.42-13.46-6.16-8.49-6.16-21.17 0-18.93 13.39-29.9 13.45-11 35.93-10.99 15.77 0 27.86 5.61 12.07 5.6 18.78 15.62 6.7 10.01 6.7 23.13v5.92h-23.37v-4.61q0-10.38-8.27-17.56zm-318.54 18.35h1.52c7.2-9.6 18.63-15.53 34.94-15.53 14.12 0 25.51 4.23 33.38 12.18 7.88 7.95 12.27 19.65 12.27 34.71v74.96h-21.74v-71.71c0-9.84-2.46-17.37-7.24-22.42-4.78-5.03-11.84-7.55-20.88-7.55-10.09 0-18.19 3.05-23.74 9.4-5.05 5.79-7.99 14.26-8.51 25.47v66.53h-21.83v-119.76h21.83zm-194.95-13.73c0 0 0 63.58 0 98.2l-21.85 21.85c-10.29 0-22.53 0-32.81 0l-21.83-21.83q0 0 0 0h54.66v-98.22zm353.46 98.22l-21.83 21.83c0 0-10.89 0-21.8 0l-21.85-21.85v-130.94h21.83v32.74h32.74v21.83h-32.74v76.39h98.31v-130.96h21.83c0 0 0 88.7 0 130.94l-21.85 21.85c-10.29 0-22.53 0-32.81 0 0 0-21.83-21.83-21.83-21.83zm-213.17-98.22h21.83v119.77h-21.83zm-96.8 29.36c-6.6 7.05-10.44 17.44-10.44 30.75 0 13.3 3.84 23.69 10.44 30.74 6.57 7.02 15.86 10.69 26.68 10.69 10.82 0 20.11-3.67 26.68-10.69 6.61-7.05 10.45-17.44 10.45-30.74 0-13.31-3.84-23.7-10.45-30.75-6.57-7.01-15.86-10.69-26.68-10.69-10.82 0-20.11 3.68-26.68 10.69zm-299.99 63.38l-27.28-27.28q0 0 0 0h76.4v-103.69h27.29c0 0 0 59.4 0 98.2l-32.77 32.77zm396.79-125.48h21.82v21.82h-21.82zm-162.11 0h21.82v21.83h-21.82z" />
      </svg>
  `.trim();

const shapes = { ...defaultShapes };
const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    width: '100%',
    height: '100%',
    model: graph,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    cellViewNamespace: shapes,
    defaultConnectionPoint: {
        name: 'rectangle'
    },
    interactive: {
        labelMove: true,
        elementMove: false
    },
    defaultConnector: {
        name: 'curve'
    },
    background: {
        color: '#f6f4f4',
        image: `data:image/svg+xml;utf8,${encodeURIComponent(logo)}`,
        // position: '10, 10',
        repeat: 'watermark'
    },
    snapLabels: true,
    labelsLayer: true,
    clickThreshold: 10
});

document.getElementById('paper-container').appendChild(paper.el);

class SourceShape extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'SourceShape',
            dataType: 'source',
            size: {
                width: 30,
                height: 50
            },
            attrs: {
                root: {
                    magnetSelector: 'geometry'
                },
                geometry: {
                    width: 'calc(w)',
                    height: 'calc(h)'
                },
                body: {
                    fill: '#ffffff',
                    stroke: 'none',
                    d: 'M 0 0 H calc(w) L calc(w+5) calc(h/2) calc(w) calc(h) H 0 Z'
                },
                name: {
                    fontSize: 14,
                    fontFamily: 'sans-serif',
                    fill: '#333333',
                    textVerticalAnchor: 'middle',
                    textAnchor: 'end',
                    x: -10,
                    y: 'calc(0.5*h)'
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg`
          <rect @selector="geometry" />
          <path @selector="body" />
          <text @selector="name" />
        `;
    }
}

class TargetShape extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'TargetShape',
            dataType: 'target',
            size: {
                width: 30,
                height: 50
            },
            attrs: {
                root: {
                    magnetSelector: 'geometry'
                },
                geometry: {
                    width: 'calc(w)',
                    height: 'calc(h)'
                },
                body: {
                    fill: '#333',
                    stroke: 'none',
                    d: 'M -5 0 H calc(w) V calc(h) H -5 L 0 calc(h/2) Z'
                },
                name: {
                    fontSize: 14,
                    fontFamily: 'sans-serif',
                    fill: '#333333',
                    textVerticalAnchor: 'middle',
                    textAnchor: 'start',
                    x: 'calc(w + 10)',
                    y: 'calc(0.5*h)'
                },
                label: {
                    pointerEvents: 'none',
                    fontSize: 14,
                    fontFamily: 'sans-serif',
                    fill: '#fff',
                    x: 'calc(w/2)',
                    y: 'calc(h/2)',
                    textAnchor: 'middle',
                    textVerticalAnchor: 0,
                    writingMode: 'vertical-rl'
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg`
          <rect @selector="geometry" />
          <path @selector="body" />
          <text @selector="name" />
          <text @selector="label" />
        `;
    }
}

class MidPointShape extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'MidPointShape',
            dataType: 'midPoint',
            size: {
                width: 15,
                height: 50
            },
            attrs: {
                root: {
                    magnetSelector: 'body'
                },
                body: {
                    fill: '#ffffff',
                    stroke: 'none',
                    width: 'calc(w)',
                    height: 'calc(h)'
                },
                label: {
                    pointerEvents: 'none',
                    fontSize: 14,
                    fontFamily: 'sans-serif',
                    fill: '#333333',
                    x: 'calc(w/2)',
                    y: 'calc(h/2)',
                    textAnchor: 'middle',
                    textVerticalAnchor: 0,
                    writingMode: 'vertical-rl'
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg`
              <rect @selector="body" />
              <text @selector="label" />
          `;
    }
}

class LinkShape extends dia.Link {
    defaults() {
        return {
            ...super.defaults,
            type: 'LinkShape',
            dataType: 'link',
            attrs: {
                line: {
                    pointerEvents: 'none',
                    connection: true,
                    stroke: '#333',
                    strokeWidth: 1,
                    strokeOpacity: 0.4,
                    strokeLinejoin: 'round',
                    strokeLinecap: 'butt',
                    fill: 'none'
                },
                wrapper: {
                    cursor: 'pointer',
                    connection: true,
                    strokeWidth: 10,
                    fill: 'none',
                    stroke: 'transparent',
                    strokeLinejoin: 'round',
                    strokeLinecap: 'round'
                }
            }
        };
    }

    preinitialize() {
        this.markup = util.svg`
              <path @selector="line" />
              <path @selector="wrapper" />
          `;
        this.defaultLabel = {
            attrs: {
                labelBody: {
                    ref: 'labelText',
                    x: 'calc(x - 4)',
                    y: 'calc(y - 4)',
                    width: 'calc(w + 8)',
                    height: 'calc(h + 8)',
                    stroke: 'none',
                    rx: 5,
                    ry: 5
                },
                labelText: {
                    fontSize: 10,
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    fontFamily: 'sans-serif'
                }
            },
            markup: util.svg/* xml */ `
                  <rect @selector="labelBody" />
                  <text @selector="labelText" />
              `
        };
    }
}

shapes.SourceShape = SourceShape;
shapes.TargetShape = TargetShape;
shapes.MidPointShape = MidPointShape;
shapes.LinkShape = LinkShape;

class DataParser {
    constructor(graph, options = {}) {
        const { unit = '' } = options;
        this.graph = graph;
        this.unit = unit;
    }

    parseFromJSON(data) {
        const { graph } = this;
        const { nodes, edges } = data;
        this.addNodes(graph, nodes);
        this.addEdges(graph, edges);
        this.adjustNodeValues(graph);
        this.assignLayers(graph);
    }

    addNodes(graph, nodes) {
        const elements = nodes.map((node) => {
            const { type, color, name } = node;
            const attributes = {
                id: name,
                name,
                z: 2,
                color
            };
            switch (type) {
                case 'source':
                    return new SourceShape({
                        ...attributes,
                        attrs: {
                            body: { fill: color },
                            name: { text: name }
                        }
                    });
                case 'target':
                    return new TargetShape({
                        ...attributes,
                        attrs: {
                            name: { text: name }
                        }
                    });
                case 'midPoint':
                default:
                    return new MidPointShape({
                        ...attributes,
                        attrs: {
                            body: { fill: color },
                            label: {
                                text: name,
                                fill: this.getTextColor(color)
                            }
                        }
                    });
            }
        });
        graph.addCells(elements);
    }

    addEdges(graph, edges) {
        edges.forEach((edge) => {
            const source = graph.getCell(edge.source);
            const target = graph.getCell(edge.target);
            const color = getMostDistantPredecessor(graph, source).get('color');
            if (source.prop('dataType') !== 'source') {
                source.attr(['body', 'fill'], color);
            }
            const labels = [];
            if (
                source.get('dataType') === 'source' ||
                target.get('dataType') === 'target'
            ) {
                labels.push({
                    position: source.get('dataType') === 'source' ? 0.15 : 0.85,
                    attrs: {
                        labelText: {
                            text: `${edge.value} ${this.unit}`,
                            fill: this.getTextColor(color)
                        },
                        labelBody: {
                            fill: color
                        }
                    }
                });
            }
            const link = new LinkShape({
                source: { id: source.id },
                target: { id: target.id },
                z: 1,
                value: edge.value,
                attrs: {
                    line: {
                        stroke: color,
                        strokeWidth: edge.value
                    },
                    wrapper: {
                        strokeWidth: Math.max(edge.value, 10)
                    }
                },
                labels
            });
            graph.addCell(link);
        });
    }

    assignLayers(graph) {
        const tmpGraph = new dia.Graph();
        const cellToCloneMap = graph.cloneCells(graph.getCells());
        const cloneToCellMap = {};
        Object.keys(cellToCloneMap).forEach((id) => {
            const clone = cellToCloneMap[id];
            cloneToCellMap[clone.id] = graph.getCell(id);
        });
        const cells = Object.values(cellToCloneMap);
        tmpGraph.resetCells(cells);
        const sorted = [];
        let layer = tmpGraph.getSources();
        while (layer.length > 0) {
            sorted.push(layer);
            layer.forEach((el) => el.remove());
            layer = tmpGraph.getSources();
        }
        sorted.forEach((layer, index) => {
            const sortedLayer = util.sortBy(layer, (el) => el.get('totalValue'));
            sortedLayer.forEach((clone, elIndex) => {
                const cell = cloneToCellMap[clone.id];
                let layerIndex;
                let orderIndex = elIndex;
                switch (clone.get('dataType')) {
                    case 'source':
                        layerIndex = 0;
                        break;
                    case 'target':
                        layerIndex = sorted.length - 1;
                        if (index === 0) {
                            // target without incoming links
                            orderIndex = -1;
                        }
                        break;
                    default: {
                        const outboundLinks = graph.getConnectedLinks(cell, {
                            outbound: true
                        });
                        layerIndex = outboundLinks.length === 0 ? sorted.length - 1 : index;
                        break;
                    }
                }
                cell.set({
                    layer: layerIndex,
                    order: orderIndex
                });
            });
        });
    }

    adjustNodeValues(graph) {
        graph.getElements().forEach((el) => {
            const outgoingLinks = graph.getConnectedLinks(el, {
                outbound: true
            });
            const incomingLinks = graph.getConnectedLinks(el, {
                inbound: true
            });
            const outgoingHeight = outgoingLinks
                .map((link) => Number(link.prop('value')))
                .reduce((acc, current) => acc + current, 0);
            const incomingHeight = incomingLinks
                .map((link) => Number(link.prop('value')))
                .reduce((acc, current) => acc + current, 0);
            const totalValue = Math.max(outgoingHeight, incomingHeight);
            const { width } = el.size();
            el.set({
                size: { width, height: Math.max(totalValue, 3) },
                totalValue
            });
            if (el.prop('dataType') !== 'source') {
                const fontSize = Math.min(totalValue / 3, 15);
                const elAttrs = {
                    body: { dataTooltip: `${totalValue} ${this.unit}` }
                };
                if (fontSize > 2) {
                    // Don't show label if it's too small
                    elAttrs.label = {
                        text: `${totalValue}`,
                        fontSize
                    };
                }
                el.attr(elAttrs);
            }
            this.adjustLinksAnchors(outgoingLinks, el, false);
            this.adjustLinksAnchors(incomingLinks, el, true);
        });
    }

    adjustLinksAnchors(links, el, areIncomingLinks) {
        let dy = 0;
        links.forEach((link) => {
            const linkValue = Number(link.prop('value'));
            const anchor = {
                name: areIncomingLinks ? 'topLeft' : 'topRight',
                args: { dy: dy + linkValue / 2, dx: 0 }
            };
            if (areIncomingLinks) {
                link.target(el, { anchor });
            } else {
                link.source(el, { anchor });
            }
            dy += linkValue;
        });
    }

    isLightColor(color) {
        const c = color.substring(1); // strip #
        const rgb = parseInt(c, 16); // convert rrggbb to decimal
        const r = (rgb >> 16) & 0xff; // extract red
        const g = (rgb >> 8) & 0xff; // extract green
        const b = (rgb >> 0) & 0xff; // extract blue
        return r * 0.299 + g * 0.587 + b * 0.114 > 186;
    }

    getTextColor(color) {
        return this.isLightColor(color) ? '#000' : '#fff';
    }
}

const data = {
    nodes: [
        {
            name: 'Gas',
            color: '#80aaff',
            type: 'source'
        },
        {
            name: 'Electricity1',
            color: '#ff9580',
            type: 'source'
        },
        {
            name: 'Electricity2',
            color: '#48cba4',
            type: 'source'
        },
        {
            name: 'Diesel',
            color: 'gray',
            type: 'source'
        },
        {
            name: 'Office building 1',
            color: 'lightgrey',
            type: 'target'
        },
        {
            name: 'Office building 2',
            color: 'lightgrey',
            type: 'target'
        },
        {
            name: 'Heating station',
            color: 'white',
            type: 'target'
        },
        {
            name: 'Water treatment',
            color: 'lightgrey',
            type: 'target'
        },
        {
            name: 'Scrap metal compactor',
            color: 'lightgrey',
            type: 'target'
        },
        {
            name: 'Compressed air system',
            color: 'white',
            type: 'target'
        },
        {
            name: 'Others',
            color: 'lightgrey',
            type: 'target'
        },
        {
            name: 'Afterburning',
            color: 'white',
            type: 'target'
        },
        {
            name: 'Line 1',
            color: 'white',
            type: 'target'
        },
        {
            name: 'Line 2',
            color: 'white',
            type: 'target'
        },
        {
            name: 'Line 3',
            color: 'white',
            type: 'target'
        },
        {
            name: 'Storage, outdoor area',
            color: 'lightgrey',
            type: 'target'
        },
        {
            name: 'Administration',
            color: 'transparent',
            type: 'midPoint'
        },
        {
            name: 'Production',
            color: 'transparent',
            type: 'midPoint'
        },
        {
            name: 'Production1',
            color: 'transparent',
            type: 'midPoint'
        },
        {
            name: 'Production2',
            color: 'transparent',
            type: 'midPoint'
        },
        {
            name: 'Hall',
            color: 'transparent',
            type: 'midPoint'
        },
        {
            name: 'Hall2',
            color: 'transparent',
            type: 'midPoint'
        },
        {
            name: 'Hall3',
            color: 'transparent',
            type: 'midPoint'
        }
    ],
    edges: [
        {
            source: 'Gas',
            target: 'Hall',
            value: '100'
        },
        {
            source: 'Hall',
            target: 'Heating station',
            value: '50'
        },
        {
            source: 'Hall',
            target: 'Production1',
            value: '50'
        },
        {
            source: 'Production1',
            target: 'Afterburning',
            value: '8'
        },
        {
            source: 'Production1',
            target: 'Line 1',
            value: '14'
        },
        {
            source: 'Production1',
            target: 'Line 2',
            value: '14'
        },
        {
            source: 'Production1',
            target: 'Line 3',
            value: '14'
        },
        {
            source: 'Electricity1',
            target: 'Hall2',
            value: '50'
        },
        {
            source: 'Hall2',
            target: 'Administration',
            value: '40'
        },
        {
            source: 'Hall2',
            target: 'Production2',
            value: '10'
        },
        {
            source: 'Administration',
            target: 'Heating station',
            value: '35.5'
        },
        {
            source: 'Administration',
            target: 'Office building 1',
            value: '2.25'
        },
        {
            source: 'Administration',
            target: 'Office building 2',
            value: '2.25'
        },
        {
            source: 'Production2',
            target: 'Water treatment',
            value: '2.25'
        },
        {
            source: 'Production2',
            target: 'Scrap metal compactor',
            value: '2.25'
        },
        {
            source: 'Production2',
            target: 'Others',
            value: '2.25'
        },
        {
            source: 'Production2',
            target: 'Afterburning',
            value: '3.25'
        },
        {
            source: 'Electricity2',
            target: 'Hall3',
            value: '50'
        },
        {
            source: 'Hall3',
            target: 'Production',
            value: '46.75'
        },
        {
            source: 'Production',
            target: 'Line 1',
            value: '20'
        },
        {
            source: 'Production',
            target: 'Line 2',
            value: '6.25'
        },
        {
            source: 'Production',
            target: 'Line 3',
            value: '20'
        },
        {
            source: 'Hall3',
            target: 'Storage, outdoor area',
            value: '3.25'
        }
    ]
};

const parser = new DataParser(graph, { unit: 'MWh/y' });

parser.parseFromJSON(data);

// eslint-disable-next-line no-unused-vars
const stackLayoutView = new ui.StackLayoutView({
    paper,
    layoutOptions: {
        stackSize: 400,
        stackElementGap: 60,
        topLeft: { x: 20, y: 20 },
        direction: 'BT',
        stackIndexAttributeName: 'layer', // attribute set by the parser
        stackElementIndexAttributeName: 'order' // attribute set by the parser
    },
    validateMoving: ({ sourceStack, targetStack }) => {
        return sourceStack.index === targetStack.index;
    },
    preview: (data, view) => {
        const { sourceElement, invalid } = data;
        const preview = V('rect', {
            fill: sourceElement.attr('body/fill'),
            x: -25,
            y: -8,
            width: 50,
            height: 16,
            display: invalid ? 'none' : 'block'
        });
        return preview.node;
    }
});

const interactions = new mvc.Listener();

interactions.listenTo(paper, {
    'cell:pointerclick': ({ model }) => {
        unhighlightBranch();
        if (model.get('dataType') === 'target') return;
        highlightBranch(graph, getMostDistantPredecessor(graph, model));
    },
    'blank:pointerclick': () => {
        unhighlightBranch();
    },
    'element:pointerdown': (elementView) => {
        paper.el.classList.add('dragging');
    },
    'element:pointerup': (elementView) => {
        paper.el.classList.remove('dragging');
    }
});

// Utility functions

function getMostDistantPredecessor(graph, cell) {
    const element = cell.isLink() ? cell.getSourceCell() : cell;
    const [mostDistantPredecessor = element] = graph
        .getPredecessors(element)
        .reverse();
    return mostDistantPredecessor;
}

function highlightBranch(graph, branch) {
    const elements = [branch, ...graph.getSuccessors(branch)];
    const cells = graph.getSubgraph(elements);
    const links = cells.filter((cell) => cell.isLink());
    const maxZ = graph.maxZIndex();
    elements.forEach((cell) => cell.set('z', maxZ + 2));
    links.forEach((link) => link.set('z', maxZ + 1));
    links.forEach((link) => {
        const linkView = paper.findViewByModel(link);
        highlighters.addClass.add(linkView, 'line', 'highlight', {
            className: 'highlighted'
        });
    });
}

function unhighlightBranch() {
    highlighters.addClass.removeAll(paper);
}

// Auto scale

function scaleToFit() {
    const graphBBox = graph.getBBox();
    paper.transformToFitContent({
        contentArea: graphBBox.clone().inflate(180, 20)
    });
    const { sy } = paper.scale();
    const area = paper.getArea();
    const yTop = area.height / 2 - graphBBox.y - graphBBox.height / 2;
    const xLeft = area.width / 2 - graphBBox.x - graphBBox.width / 2;
    paper.translate(xLeft * sy, yTop * sy);
}

window.addEventListener('resize', () => scaleToFit());
scaleToFit();

// Tooltips

// eslint-disable-next-line no-unused-vars
const tooltip = new ui.Tooltip({
    theme: 'material',
    rootTarget: paper.el,
    container: paper.el,
    target: '[data-tooltip]',
    position: 'top',
    direction: 'auto',
    padding: 10,
    animation: true
});
