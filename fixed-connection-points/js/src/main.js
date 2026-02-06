import {
    dia,
    shapes as defaultShapes,
    elementTools,
    linkTools,
    mvc,
    util,
    highlighters,
    routers,
    g
} from '@joint/plus';
import './styles.css';

function findClosestAnchor(x, y) {
    const relAnchors = this.getLinkAnchors();
    const relPoint = this.getRelativePointFromAbsolute({ x, y });
    const distances = relAnchors.map((anchor) => {
        return g.Point(relPoint).squaredDistance(anchor);
    });
    const minDistance = Math.min(...distances);
    return relAnchors[distances.indexOf(minDistance)];
}

const Rectangle = defaultShapes.standard.Path.define(
    'Rectangle',
    {
        size: { width: 320, height: 40 },
        attrs: {
            body: {
                d: 'M 10 0 H calc(w - 10) l 10 10 V calc(h - 10) l -10 10 H 10 l -10 -10 V 10 Z',
                fill: '#131e29',
                stroke: '#ed2637',
                rx: 5,
                ry: 5,
                // reset the default legacy `refD` attribute
                refD: null,
            },
            label: {
                fill: '#dde6ed',
                fontFamily: 'sans-serif',
                fontSize: 20,
            },
        },
    },
    {
        findClosestAnchor,
        getLinkAnchors() {
            const { width, height } = this.size();
            const anchors = [];
            for (let x = 20; x < width; x += 20) {
                anchors.push({ x, y: 0 });
                anchors.push({ x, y: height });
            }
            return anchors;
        },
    }
);

const Square = Rectangle.define(
    'Square',
    {
        size: { width: 80, height: 80 },
    },
    {
        getLinkAnchors() {
            const { width, height } = this.size();
            // 3 anchors on each side
            return [
                { x: width / 4, y: 0 },
                { x: width / 2, y: 0 },
                { x: (width / 4) * 3, y: 0 },
                { x: width, y: height / 4 },
                { x: width, y: height / 2 },
                { x: width, y: (height / 4) * 3 },
                { x: (width / 4) * 3, y: height },
                { x: width / 2, y: height },
                { x: width / 4, y: height },
                { x: 0, y: (height / 4) * 3 },
                { x: 0, y: height / 2 },
                { x: 0, y: height / 4 },
            ];
        },
    }
);

const Ellipse = defaultShapes.standard.Ellipse.define(
    'Ellipse',
    {
        size: { width: 80, height: 80 },
        attrs: {
            body: {
                fill: '#131e29',
                stroke: '#ed2637',
            },
            label: {
                fill: '#dde6ed',
                fontFamily: 'sans-serif',
                fontSize: 20,
            },
        },
    },
    {
        findClosestAnchor,
        getLinkAnchors() {
            const { width, height } = this.size();
            // 1 anchors on each side
            return [
                { x: width / 2, y: 0 },
                { x: width, y: height / 2 },
                { x: width / 2, y: height },
                { x: 0, y: height / 2 },
            ];
        },
    }
);

const Link = defaultShapes.standard.Link.define('Link', {
    attrs: {
        line: {
            stroke: '#dde6ed',
            strokeWidth: 2,
        },
        wrapper: {
            strokeWidth: 20,
        },
    },
});

// A custom highlighter that highlights the anchors of an element.
// This highlighter is used in the `highlighting.connecting` configuration below.
// The `anchor` points are defined in the `getLinkAnchors` method of element models.
const Anchors = dia.HighlighterView.extend({
    tagName: 'g',
    attributes: {
        stroke: '#131e29',
        fill: '#f6f740',
        strokeWidth: 2,
    },

    highlight(cellView) {
        const anchors = cellView.model.getLinkAnchors();
        const children = anchors.map((anchor) => {
            return {
                tagName: 'circle',
                attributes: { cx: anchor.x, cy: anchor.y, r: 5 },
            };
        });
        this.renderChildren(children);
    },
});

// Paper

const paperContainer = document.getElementById('paper-container');
const shapes = { ...defaultShapes, Square, Ellipse, Link };
const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 20,
    linkPinning: false,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: '#131e29' },
    // configuration for links
    defaultConnector: {
        name: 'straight',
        args: {
            cornerType: 'line',
        },
    },
    defaultRouter: function(vertices, _options, linkView) {
        if (!linkView.sourceView || !linkView.targetView) {
            return [];
        }
        return routers.rightAngle(
            vertices,
            {
                // Another experimental feature from v3.7.7 that takes the user defined
                // vertices into account when calculating the route.
                useVertices: true,
                margin: 40,
            },
            linkView
        );
    },
    defaultLink: () => new Link(),
    defaultConnectionPoint: { name: 'anchor', args: { offset: 10 }},
    connectionStrategy: function(end, view, _magnet, coords) {
        const size = view.model.size();
        const anchor = view.model.findClosestAnchor(coords.x, coords.y);
        return {
            anchor: {
                name: 'modelCenter',
                args: {
                    dx: anchor.x - size.width / 2,
                    dy: anchor.y - size.height / 2,
                },
            },
            magnet: 'body',
            id: end.id,
        };
    },
    snapLinks: true,
    // Allow only one link (directed) between two elements
    // multiLinks: false,
    highlighting: {
        // Whenever a link is connected to an element, highlight the anchors of the element
        // (with a custom `anchors` highlighter defined above)
        connecting: {
            name: 'anchors',
        },
    },
    // We need to extend the default highlighters to add our custom `anchors` highlighter
    highlighterNamespace: {
        ...highlighters,
        anchors: Anchors,
    },
    validateConnection(sv, _, tv) {
        return sv.model.isElement() && tv.model.isElement() && sv !== tv;
    },
});
paperContainer.appendChild(paper.el);

// Set mesh grid on paper when paper is attached so the dimensions are known.
paper.setGrid({ name: 'mesh', args: { color: '#1a2938' }});

// Interactions

const controller = new mvc.Listener();

controller.listenTo(paper, {
    'cell:mouseenter': (cellView) => addTools(cellView),
    'blank:mouseover': () => scheduleToolsRemoval(),
    'element:pointermove': (elementView, evt) => {
        if (!elementView.hasTools()) return;
        elementView.removeTools();
    }
});

// Example

const square1 = new Square({
    id: 'square1',
    attrs: {
        label: {
            text: 'S1',
        },
    },
});
square1.position(100, 100);

const square2 = new Square({
    id: 'square2',
    attrs: {
        label: {
            text: 'S2',
        },
    },
});
square2.position(340, 100);

const ellipse1 = new Ellipse({
    id: 'ellipse1',
    attrs: {
        label: {
            text: 'E',
        },
    },
});
ellipse1.position(220, 300);
ellipse1.addTo(graph);

const rectangle1 = new Rectangle({
    id: 'rectangle1'
});
rectangle1.position(100, 500);
rectangle1.addTo(graph);

graph.addCells([square1, square2, ellipse1, rectangle1]);

graph.addCells([
    {
        type: 'Link',
        source: {
            anchor: {
                name: 'modelCenter',
                args: {
                    dx: 40,
                    dy: -20,
                },
            },
            magnet: 'body',
            id: 'square1',
        },
        target: {
            anchor: {
                name: 'modelCenter',
                args: {
                    dx: -40,
                    dy: -20,
                },
            },
            magnet: 'body',
            id: 'square2',
        },
    },
    {
        type: 'Link',
        source: {
            anchor: {
                name: 'modelCenter',
                args: {
                    dx: -40,
                    dy: 0,
                },
            },
            magnet: 'body',
            id: 'ellipse1',
        },
        target: {
            anchor: {
                name: 'modelCenter',
                args: {
                    dx: -80,
                    dy: -20,
                },
            },
            magnet: 'body',
            id: 'rectangle1',
        },
    },
    {
        type: 'Link',
        source: {
            anchor: {
                name: 'modelCenter',
                args: {
                    dx: 80,
                    dy: -20,
                },
            },
            magnet: 'body',
            id: 'rectangle1',
        },
        target: {
            anchor: {
                name: 'modelCenter',
                args: {
                    dx: 40,
                    dy: 0,
                },
            },
            magnet: 'body',
            id: 'ellipse1',
        },
    },
    {
        type: 'Link',
        source: {
            anchor: {
                name: 'modelCenter',
                args: {
                    dx: -40,
                    dy: 20,
                },
            },
            magnet: 'body',
            id: 'square2',
        },
        target: {
            anchor: {
                name: 'modelCenter',
                args: {
                    dx: 0,
                    dy: -40,
                },
            },
            magnet: 'body',
            id: 'ellipse1',
        },
    },
    {
        type: 'Link',
        source: {
            anchor: {
                name: 'modelCenter',
                args: {
                    dx: -40,
                    dy: 0,
                },
            },
            magnet: 'body',
            id: 'square2',
        },
        target: {
            anchor: {
                name: 'modelCenter',
                args: {
                    dx: 40,
                    dy: 0,
                },
            },
            magnet: 'body',
            id: 'square1',
        },
    },
]);

// Tools

let toolsTimerId;
let currentToolsView;

function scheduleToolsRemoval() {
    toolsTimerId = setTimeout(() => paper.removeTools(), 1000);
    if (!currentToolsView) return;
    currentToolsView.el.classList.add('fading-out');
    currentToolsView = null;
}

function addTools(cellView) {
    paper.removeTools();
    clearTimeout(toolsTimerId);
    toolsTimerId = null;
    const tools = cellView.model.isLink() ? getLinkTools(cellView) : getElementTools(cellView);
    const toolsView = new dia.ToolsView({ tools });
    cellView.addTools(toolsView);
    currentToolsView = toolsView;
}

const anchorButtonMarkup = util.svg/* xml */ `
    <circle r="6" stroke="#131e29" stroke-width="4" fill="#f6f740" cursor="pointer" />
`;

const removeButtonMarkup = util.svg/* xml */ `
    <g cursor="pointer">
        <circle r="11" fill="#131e29" stroke="#dde6ed" stroke-width="2" />
        <g transform="translate(-5, -5)">
            <line x1="0" y1="0" x2="10" y2="10" stroke="#dde6ed" stroke-width="2" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="#dde6ed" stroke-width="2" />
        </g>
    </g>
`;

function getElementTools(elementView) {
    const anchors = elementView.model.getLinkAnchors();
    const tools = anchors.map((anchor) => {
        return new elementTools.Connect({
            markup: anchorButtonMarkup,
            x: anchor.x,
            y: anchor.y,
        });
    });
    return tools;
}

function getLinkTools(linkView) {
    const tools = [
        new linkTools.Vertices({
            handleClass: linkTools.Vertices.VertexHandle.extend({
                attributes: {
                    r: 6,
                    fill: '#f6f740',
                    stroke: '#131e29',
                    strokeWidth: 2,
                    cursor: 'move',
                },
            }),
        }),
        new linkTools.Remove({
            distance: -40,
            markup: removeButtonMarkup,
        }),
    ];
    if (linkView.getConnectionLength() > 200) {
        tools.push(
            new linkTools.Remove({
                distance: 40,
                markup: removeButtonMarkup,
            })
        );
    }
    return tools;
}
