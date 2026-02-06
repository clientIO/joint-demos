import { dia, ui, linkTools, shapes, connectors, g } from '@joint/plus';
import './styles.css';

const SEGMENT_LENGTH = 50;
const MIN_DISTANCE = 600;

const graph = new dia.Graph();

const paper = new dia.Paper({
    gridSize: 10,
    drawGrid: true,
    model: graph,
    defaultAnchor: {
        name: 'midSide',
        args: {
            useModelGeometry: true,
            mode: 'prefer-horizontal'
        }
    },
    defaultConnectionPoint: {
        name: 'anchor'
    },
    defaultRouter: {
        name: 'rightAngle'
    },
    // Override the default connector to create gaps in the link when the
    // distance between the connected elements is large enough.
    defaultConnector: function(
        sourcePoint,
        targetPoint,
        routePoints,
        _,
        linkView
    ) {
        const sourceCenter = this.sourceView.model.getCenter();
        const targetCenter = this.targetView.model.getCenter();
        const distance = sourceCenter.distance(targetCenter);
        if (distance > MIN_DISTANCE) {
            const path = new g.Path();
            const sourceEndPoint = sourcePoint
                .clone()
                .move(sourceCenter, SEGMENT_LENGTH);
            path.appendSegment(g.Path.createSegment('M', sourcePoint));
            path.appendSegment(g.Path.createSegment('L', sourceEndPoint));
            const targetStartPoint = targetPoint
                .clone()
                .move(targetCenter, SEGMENT_LENGTH);
            path.appendSegment(g.Path.createSegment('M', targetStartPoint));
            path.appendSegment(g.Path.createSegment('L', targetPoint));
            return path;
        }
        return connectors.straight(sourcePoint, targetPoint, routePoints, {
            cornerType: 'cubic',
            cornerRadius: 10
        });
    }
});

const paperScroller = new ui.PaperScroller({
    theme: 'modern',
    paper,
    baseWidth: 1000,
    baseHeight: 1000,
    autoResizePaper: true,
    cursor: 'grab',
    inertia: true
});

document.getElementById('paper-container').appendChild(paperScroller.el);
paperScroller.render().center();

paperScroller.centerContent({ useModelGeometry: true });

// Paper Scroller interaction

paper.on('paper:pan', (evt, tx, ty) => {
    evt.preventDefault();
    paperScroller.el.scrollLeft += tx;
    paperScroller.el.scrollTop += ty;
});

paper.on('paper:pinch', (evt, ox, oy, scale) => {
    const zoom = paperScroller.zoom();
    paperScroller.zoom(zoom * scale, {
        min: 0.2,
        max: 5,
        ox,
        oy,
        absolute: true
    });
});

paper.on('blank:pointerdown', (evt) => {
    paperScroller.startPanning(evt);
});

// Link Teleports Interaction
paper.on('teleport:source', (linkView) => {
    paperScroller.scrollToElement(linkView.model.getSourceElement(), {
        animation: true
    });
});

paper.on('teleport:target', (linkView) => {
    paperScroller.scrollToElement(linkView.model.getTargetElement(), {
        animation: true
    });
});

// Example diagram

function createElement(x, y, label) {
    return new shapes.standard.Rectangle({
        position: { x, y },
        size: { width: 100, height: 40 },
        attrs: {
            body: {
                fill: '#C2E5FF',
                strokeWidth: 2,
                rx: 5,
                ry: 5
            },
            label: {
                text: label,
                fontFamily: 'sans-serif',
                fontSize: 14
            }
        }
    });
}

function createLink(source, target) {
    return new shapes.standard.Link({
        source: { id: source.id },
        target: { id: target.id },
        attrs: {
            line: {
                strokeWidth: 2
            }
        }
    });
}

const r1 = createElement(100, 200, 'Element 1');
const r2 = createElement(600, 200, 'Element 2');
const r3 = createElement(250, 50, 'Element 3');
const r4 = createElement(1500, 2000, 'Element 4');
const l1 = createLink(r1, r2);
const l2 = createLink(r3, r4);

graph.resetCells([r1, r2, r3, r4, l1, l2]);

paperScroller.positionElement(r1, 'left', {
    useModelGeometry: true,
    padding: 40
});

// Link Teleports

function getTeleportButtonMarkup(text) {
    return [
        {
            tagName: 'rect',
            selector: 'button',
            className: 'teleport-button',
            attributes: {
                x: -30,
                y: -10,
                width: 60,
                height: 20,
                rx: 5,
                ry: 5,
                fill: '#9CE8B8',
                stroke: '#33334F',
                strokeWidth: 1,
                cursor: 'pointer'
            }
        },
        {
            tagName: 'text',
            selector: 'label',
            textContent: text,
            attributes: {
                x: 0,
                textAnchor: 'middle',
                dominantBaseline: 'central',
                fill: '#33334F',
                fontSize: 10,
                fontFamily: 'Arial, helvetica, sans-serif',
                pointerEvents: 'none'
            }
        }
    ];
}

function getEndDistance(link) {
    const sourceCenter = link.getSourceElement().getCenter();
    const targetCenter = link.getTargetElement().getCenter();
    return sourceCenter.distance(targetCenter);
}

// The teleport button
const TeleportButton = linkTools.Button.extend({
    name: 'teleport',
    options: {
        // end: 'source' | 'target'
        distance: function() {
            return this.isAtSource() ? -SEGMENT_LENGTH : SEGMENT_LENGTH;
        },
        markup: getTeleportButtonMarkup('Teleport'),
        visibility: (view) => getEndDistance(view.model) > MIN_DISTANCE,
        action: (evt, view, tool) => {
            const end = tool.options.end;
            view.notify(`teleport:${end}`, evt);
        }
    },
    isAtSource() {
        return this.options.end === 'source';
    },
    update() {
        linkTools.Button.prototype.update.apply(this, arguments);
        const link = this.relatedView.model;
        const endElement = this.isAtSource()
            ? link.getSourceElement()
            : link.getTargetElement();
        this.childNodes.label.textContent = `${endElement.attr('label/text')}`;
    }
});

// Add link teleport buttons to each link
graph.getLinks().forEach((link) => {
    const linkView = link.findView(paper);
    linkView.addTools(
        new dia.ToolsView({
            tools: [
                new TeleportButton({ end: 'source' }),
                new TeleportButton({ end: 'target' })
            ]
        })
    );
});
