import { util, dia, ui, highlighters, graphUtils, g, layout, V } from '@joint/plus';
import './styles.scss';

// generate tree as adjacency list
// where each node has a list of children
// each node is a unique id
function generateTree(options = {}) {
    const { maxDepth = 1, minChildren = 1, maxChildren = 2 } = options;
    let id = 0;
    const tree = {};
    function generateNode(depth) {
        const children = [];
        const currentId = id++;
        tree[currentId] = children;
        if (depth < maxDepth) {
            const currentMinChildren = Array.isArray(minChildren)
                ? minChildren[Math.min(depth, minChildren.length - 1)]
                : minChildren;
            const currentMaxChildren = Array.isArray(maxChildren)
                ? maxChildren[Math.min(depth, maxChildren.length - 1)]
                : maxChildren;
            const numChildren = g.random(
                currentMinChildren || 0,
                currentMaxChildren || 0
            );
            for (let i = 0; i < numChildren; i++) {
                children.push(generateNode(depth + 1));
            }
        }
        return currentId;
    }
    generateNode(0);
    return tree;
}

const BG_COLOR = '#dde6ed';
const FG_COLOR = '#cad8e3';
const FG_LABEL_COLOR = '#6a7c8a';
const NODE_COLOR = '#1a2938';
const LINK_COLOR = '#afc5d5';
const HIGHLIGHT_COLOR = '#0075f2';
const INTERMEDIATE_COLOR = '#7399bf';
const PARENT_GAP = 100;
const LEGEND_WIDTH = 100;
const NODE_SIZE = 10;

const NODE_MARKUP = util.svg`
    <circle @selector="outer" />
    <circle @selector="inner" />
    <text @selector="value" class="value-text" />
`;

class Node extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'Node',
            z: 2,
            size: {
                width: NODE_SIZE,
                height: NODE_SIZE
            },
            attrs: {
                outer: {
                    r: 'calc(l / 2)',
                    cx: 'calc(l / 2)',
                    cy: 'calc(l / 2)',
                    stroke: BG_COLOR,
                    strokeWidth: 2,
                    fill: NODE_COLOR
                },
                inner: {
                    r: 'calc(l / 2 - 3)',
                    cx: 'calc(l / 2)',
                    cy: 'calc(l / 2)',
                    stroke: BG_COLOR,
                    strokeWidth: 1,
                    fill: NODE_COLOR
                },
                value: {
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    x: 'calc(l / 2)',
                    y: `calc(h + ${PARENT_GAP / 2})`,
                    fontSize: 10,
                    fontFamily: 'Arial, sans-serif',
                    fill: HIGHLIGHT_COLOR,
                    stroke: BG_COLOR,
                    strokeWidth: 4,
                    paintOrder: 'stroke'
                }
            }
        };
    }

    preinitialize(...args) {
        super.preinitialize(...args);
        this.markup = NODE_MARKUP;
    }
}

const LINK_MARKUP = util.svg`
    <path @selector="wrapper" fill="none" cursor="pointer" stroke="transparent" stroke-linecap="round"/>
    <path @selector="line" fill="none" pointer-events="none" />
`;

const LABEL_MARKUP = util.svg`
    <text @selector="value" />
`;

class Link extends dia.Link {
    defaults() {
        return {
            ...super.defaults,
            type: 'Link',
            z: 1,
            bidirectional: false,
            attrs: {
                line: {
                    connection: true,
                    stroke: LINK_COLOR,
                    strokeWidth: 2,
                    strokeLinejoin: 'round'
                },
                wrapper: {
                    connection: true,
                    strokeWidth: 10,
                    strokeLinejoin: 'round'
                }
            }
        };
    }

    preinitialize(...args) {
        super.preinitialize(...args);
        this.markup = LINK_MARKUP;
    }
}

const LEGEND_MARKUP = util.svg`
    <rect @selector="border" />
    <rect @selector="bar" />
    <text @selector="minValue" @group-selector="values" />
    <text @selector="maxValue" @group-selector="values" />
`;

class Legend extends dia.Element {
    density = 20;

    defaults() {
        return {
            ...super.defaults,
            type: 'Legend',
            z: 2,
            size: {
                width: LEGEND_WIDTH,
                height: 20
            },
            attrs: {
                border: {
                    stroke: FG_COLOR,
                    strokeWidth: 1,
                    fill: 'transparent',
                    width: 'calc(w)',
                    height: 'calc(h)'
                },
                bar: {
                    cursor: 'pointer',
                    stroke: FG_COLOR,
                    x: 2,
                    y: 2,
                    width: 'calc(w - 4)',
                    height: 'calc(h - 4)'
                },
                values: {
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    y: 'calc(h / 2)',
                    fontSize: 10,
                    fontFamily: 'Arial, sans-serif',
                    fill: FG_LABEL_COLOR,
                    stroke: BG_COLOR,
                    strokeWidth: 4,
                    paintOrder: 'stroke'
                },
                minValue: {
                    x: -10,
                    text: '0'
                },
                maxValue: {
                    x: 'calc(w + 10)',
                    text: '1'
                }
            }
        };
    }

    setBarColor(opt) {
        const { density = 100, interpolate } = opt;
        this.attr(
            ['bar', 'fill'],
            {
                type: 'linearGradient',
                stops: Array.from({ length: density }, (_, i) => {
                    return {
                        offset: i / density,
                        color: interpolate(i / density)
                    };
                })
            },
            { rewrite: true }
        );
    }

    preinitialize(...args) {
        super.preinitialize(...args);
        this.markup = LEGEND_MARKUP;
    }
}

class LabelHighlighter extends dia.HighlighterView {
    preinitialize() {
        this.tagName = 'text';
        this.attributes = {
            'font-size': 10,
            'text-anchor': 'middle',
            'font-family': 'Arial, sans-serif',
            fill: HIGHLIGHT_COLOR,
            stroke: BG_COLOR,
            'stroke-width': 6,
            'paint-order': 'stroke'
        };
    }

    highlight(linkView) {
        const point = linkView.getPointAtRatio(0.5);
        this.vel.attr('x', point.x);
        this.vel.attr('y', point.y);
        this.vel.text(linkView.model.getSourceCell().get('value').toFixed(4), {
            textVerticalAnchor: 'middle'
        });
    }
}

const cellNamespace = {
    Node,
    Legend,
    Link
};

const maxDepth = 6;
const minChildren = [2, 2, 3, 2, 0];
const maxChildren = [2, 2, 3, 6, 1];
const list = generateTree({
    maxDepth,
    minChildren,
    maxChildren
});

const graph = new dia.Graph({}, { cellNamespace });

const cells = graphUtils.constructTree(0, {
    makeElement: (label) => {
        const childCount = list[label].length;
        return new Node({
            id: label.toString(),
            siblingRank: childCount,
            attrs: {
                inner: {
                    fill: childCount > 0 ? INTERMEDIATE_COLOR : NODE_COLOR
                }
            }
        });
    },
    makeLink: (parentElement, childElement) => {
        return new Link({
            source: { id: parentElement.id },
            target: { id: childElement.id }
        });
    },
    children: (root) => list[root]
});

graph.resetCells(cells);

graph.getElements().forEach((element) => {
    const value = Math.random();
    element.set({
        // sibling rank will be normalized to a natural number when the layout is applied
        siblingRank: value,
        value
    });
});

// Set bfs index (the index of the element in the bfs traversal, taking the sibling rank into account)
// Node: getNeighbors() returns the neighbors in the order they were added to the graph
function sortedBfs(node) {
    let i = 0;
    const queue = [node];
    const sorted = [];
    while (queue.length > 0) {
        const current = queue.shift();
        current.set('bfsIndex', i++);
        queue.push(
            ...util.sortBy(graph.getNeighbors(current, { outbound: true }), (el) =>
                el.get('siblingRank')
            )
        );
    }
    return sorted;
}

sortedBfs(graph.getCell('0'));

// Set sibling labels (average value)
graph.getElements().forEach((element) => {
    const childNodes = graph.getNeighbors(element, { outbound: true });
    if (childNodes.length === 0) return;
    const sumValue = childNodes.reduce(
        (acc, neighbor) => acc + neighbor.get('value'),
        0
    );
    const averageValue = sumValue / childNodes.length;
    const singleChild = childNodes.length === 1;
    element.attr('value', {
        writingMode: singleChild ? 'vertical-lr' : 'lr',
        text: averageValue.toFixed(2),
        fontSize: 9 + (singleChild ? 0 : Math.round(averageValue * 10)),
        y:
            !singleChild && element.get('bfsIndex') % 2 === 0
                ? `calc(h + ${PARENT_GAP / 2 + 10})`
                : `calc(h + ${PARENT_GAP / 2 - 10})`
    });
});

// Set link colors
const interpolateColor = util.interpolate.hexColor('#FFC857', '#ED2637');
let interpolationTiming = util.timing.quad;
const interpolate = (t) => interpolateColor(interpolationTiming(t));

const paper = new dia.Paper({
    el: document.getElementById('paper'),
    width: 1000,
    height: 800,
    model: graph,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    cellViewNamespace: cellNamespace,
    interactive: false,
    clickThreshold: 10,
    background: {
        color: '#dde6ed'
    },
    defaultAnchor: {
        name: 'modelCenter'
    },
    defaultConnectionPoint: {
        name: 'anchor'
    }
});

// Lay out the tree and transform the paper to fit the content
const contentArea = runLayout(paper, {
    parentGap: PARENT_GAP,
    maxDepth,
    nodeSize: NODE_SIZE
});
paper.transformToFitContent({ contentArea });

// Add legend element
const legend = new Legend({
    position: { x: contentArea.topRight().x - 115, y: 15 }
});
graph.addCell(legend);

colorTree(graph, interpolate);

paper.on('element:pointerclick', (legendView) => {
    if (legendView.model.get('type') !== 'Legend') return;

    const contextToolbar = new ui.ContextToolbar({
        target: legendView.el,
        root: paper.el,
        vertical: true,
        anchor: 'top',
        padding: 3,
        scale: paper.scale().sx,
        tools: [
            {
                action: 'linear',
                content: 'Linear'
            },
            {
                action: 'quad',
                content: 'Quadratic'
            },
            {
                action: 'exponential',
                content: 'Exponential'
            },
            {
                action: 'clamped',
                content: 'Clamped <i>(0.3-0.7)</i>'
            },
            {
                action: 'threshold',
                content: 'Threshold <i>(0.8)</i>'
            }
        ]
    });

    contextToolbar.el.style.width = `${LEGEND_WIDTH}px`;
    contextToolbar.el.classList.add('timing-context-toolbar');

    contextToolbar.on('all', (eventName) => {
        if (!eventName.includes('action')) return;
        const [, timingFunctionName] = eventName.split(':');
        switch (timingFunctionName) {
            case 'clamped':
                interpolationTiming = (t) => (t < 0.3 || t > 0.7 ? 0 : 1);
                break;
            case 'threshold':
                interpolationTiming = (t) => (t < 0.8 ? 0 : 1);
                break;
            default:
                interpolationTiming = util.timing[timingFunctionName];
                break;
        }
        colorTree(graph, interpolate);
        contextToolbar.remove();
    });

    contextToolbar.render();
});

// Functions

function colorTree(graph, interpolate) {
    legend.setBarColor({ density: 100, interpolate });
    graph.getLinks().forEach((link) => {
        link.attr(
            ['line', 'stroke'],
            interpolate(link.getTargetCell().get('value'))
        );
    });
}

function runLayout(
    paper,
    { siblingGap = 0, startDepth = 0, parentGap, maxDepth, nodeSize }
) {
    const graph = paper.model;
    const tree = new layout.TreeLayout({
        graph,
        siblingGap,
        parentGap,
        direction: 'B',
        updateVertices: false,
        updateAttributes: (layoutArea, node) => {
            node.set('depth', layoutArea.level);
        }
    });
    tree.layout();
    const area = tree.getLayoutBBox().moveAndExpand({
        x: -80,
        y: -20,
        width: 80 + 20,
        height: 20 + 20
    });
    // Draw depth lines.
    const backLayerEl = paper.getLayerNode(dia.Paper.Layers.BACK);
    Array.from({ length: maxDepth - startDepth + 1 }).forEach((_, i) => {
        const y = nodeSize / 2 + (nodeSize + parentGap) * i;
        const lineVEl = V('line', {
            x1: area.x,
            y1: y,
            x2: area.x + area.width,
            y2: y,
            stroke: FG_COLOR
        });
        const textVEL = V('text', {
            x: area.x + 10,
            y: y - 5,
            fill: FG_LABEL_COLOR,
            'font-size': 12,
            'font-family': 'Arial'
        });
        textVEL.text(`depth ${startDepth + i}`);
        lineVEl.appendTo(backLayerEl);
        textVEL.appendTo(backLayerEl);
    });
    return area;
}

paper.on('element:mouseenter', (elementView) => {
    if (elementView.model.get('type') === 'Legend') return;
    inspectNode(elementView);
});
paper.on('element:mouseleave', (elementView) => {
    if (elementView.model.get('type') === 'Legend') return;
    leaveNode();
});

const scheduleShowSubgraph = util.debounce(showSubgraph, 100);
inspectNode(graph.getCell('0').findView(paper));

function showSubgraph(elementView, depth = 3) {
    const { model: element } = elementView;
    const popupGraph = new dia.Graph({}, { cellNamespace });
    const subgraphCells = getSubgraph(graph, element, depth);
    const clonesMap = graph.cloneSubgraph(subgraphCells);
    const popupCells = Object.values(clonesMap);
    popupGraph.resetCells(popupCells);
    popupGraph.getLinks().forEach((link) => {
        link.labels([
            {
                attrs: {
                    value: {
                        text: link.getTargetCell().get('value').toFixed(2),
                        textAnchor: 'middle',
                        textVerticalAnchor: 'middle',
                        fontSize: 10,
                        fontFamily: 'Arial, sans-serif',
                        fill: HIGHLIGHT_COLOR,
                        stroke: BG_COLOR,
                        strokeWidth: 2,
                        paintOrder: 'stroke'
                    }
                },
                markup: LABEL_MARKUP,
                position: {
                    distance: 1,
                    offset: { y: -5 }
                }
            }
        ]);
    });

    clonesMap[element.id].position(0, 0);

    const popupPaper = new dia.Paper({
        model: popupGraph,
        frozen: true,
        async: false,
        sorting: dia.Paper.sorting.APPROX,
        cellViewNamespace: cellNamespace,
        interactive: false,
        labelsLayer: true,
        background: {
            color: '#dde6ed'
        }
    });

    const startDepth = element.get('depth');
    const area = runLayout(popupPaper, {
        parentGap: 50,
        siblingGap: 20,
        startDepth,
        maxDepth: startDepth + depth,
        nodeSize: NODE_SIZE
    });

    let { width, height } = area;
    if (width > window.innerWidth / 2) {
        width /= 2;
        height /= 2;
    } else if (width < window.innerWidth / 4) {
        width *= 2;
        height *= 2;
    }

    popupPaper.setDimensions(width, height);
    popupPaper.transformToFitContent({ contentArea: area });

    const popup = new ui.Popup({
        content: popupPaper.el,
        target: elementView.el,
        anchor: 'left',
        position: 'right',
        padding: 12
    });

    popup.el.classList.add('close-up-popup');
    popup.el.style.pointerEvents = 'none';

    popup.on('popup:close', () => popupPaper.remove());

    popup.render();
    popupPaper.unfreeze();
}

function getSubgraph(graph, element, maxDepth) {
    const successors = [element];
    graph.search(
        element,
        (el, depth) => {
            if (depth <= maxDepth) {
                successors.push(el);
            }
        },
        { outbound: true }
    );
    return graph.getSubgraph(successors);
}

// Highlighting

function inspectNode(elementView) {
    const { model: element } = elementView;
    leaveNode();
    if (graph.isSink(element)) {
        highlightPath(elementView);
    } else if (graph.isSource(element)) {
        paper.el.classList.add('show-average-values');
    } else {
        scheduleShowSubgraph(elementView);
    }
    highlightNode(elementView);
}

function leaveNode() {
    if (scheduleShowSubgraph) {
        scheduleShowSubgraph.cancel();
    }
    dia.HighlighterView.removeAll(paper, 'close-up');
    LabelHighlighter.removeAll(paper);
    ui.Popup.close();
    paper.el.classList.remove('show-average-values');
}

function highlightPath(elementView) {
    const [link] = graph.getConnectedLinks(elementView.model, { inbound: true });
    if (!link) return;
    highlightLink(link.findView(paper));
    highlightPath(link.getSourceCell().findView(paper));
}

function highlightLink(linkView) {
    highlighters.addClass.add(linkView, 'line', 'close-up', {
        className: 'close-up-line'
    });
    LabelHighlighter.add(linkView, 'root', 'close-up-label', {
        layer: dia.Paper.Layers.FRONT
    });
}

function highlightNode(elementView) {
    highlighters.mask.add(elementView, 'outer', 'close-up', {
        layer: dia.Paper.Layers.FRONT,
        padding: 0,
        attrs: {
            stroke: HIGHLIGHT_COLOR,
            'stroke-width': 2
        }
    });
}
