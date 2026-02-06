import { dia, ui, shapes, g, util, V } from '@joint/plus';
import './styles.css';

const units = 'ft';

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 1,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    restrictTranslate: true,
    background: { color: '#dde6ed' },
    defaultLink: () => new shapes.standard.Link()
});

document.getElementById('paper-container').appendChild(paper.el);

const stencil = new ui.Stencil({
    paper,
    usePaperGrid: true,
    width: 100,
    height: '100%',
    paperOptions: () => {
        return {
            model: new dia.Graph({}, { cellNamespace: shapes }),
            cellViewNamespace: shapes,
            background: {
                color: '#fcfcfc'
            }
        };
    },
    paperDragOptions: {
        // Make sure the preview element is always visible even if it is shifted to the side
        // due to snapping. Also the AlignmentLine has to stay visible.
        overflow: true
    },
    layout: {
        columns: 1,
        rowHeight: 'compact',
        rowGap: 10,
        columnWidth: 100,
        marginY: 10,
        // reset defaults
        resizeToFit: false,
        dx: 0,
        dy: 0
    }
});

stencil.render();
document.getElementById('stencil-container').appendChild(stencil.el);

const elements = [
    {
        type: 'standard.Rectangle',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                fill: 'transparent',
                stroke: '#ed2637'
            }
        }
    },
    {
        type: 'standard.Rectangle',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                rx: 10,
                ry: 10,
                fill: 'transparent',
                stroke: '#ed2637'
            }
        }
    },
    {
        type: 'standard.Path',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                d: 'M calc(0.5*w) 0 calc(w) calc(h) H 0 Z',
                fill: 'transparent',
                stroke: '#ed2637'
            }
        }
    },
    {
        type: 'standard.Path',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                d:
                    'M calc(0.5*w) 0 calc(w) calc(0.5*h) calc(0.5*w) calc(h) 0 calc(0.5*h) Z',
                fill: 'transparent',
                stroke: '#ed2637'
            }
        }
    },
    {
        type: 'standard.Circle',
        size: { width: 60, height: 60 },
        attrs: {
            body: {
                fill: 'transparent',
                stroke: '#ed2637'
            }
        }
    },
    {
        type: 'standard.Ellipse',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                fill: 'transparent',
                stroke: '#ed2637'
            }
        }
    }
];

stencil.load(elements);

// Custom Highlighters
// -------------------

// Highlighter to show the alignment lines when the element
// is in the middle of two other elements.
const AlignmentLine = dia.HighlighterView.extend({
    tagName: 'path',

    attributes: function() {
        const { color = 'blue' } = this.options;
        return {
            fill: 'none',
            stroke: color,
            'stroke-width': 2,
            'stroke-dasharray': '5 5'
        };
    },

    highlight(elementView) {
        const { vertical = true, horizontal = true, overflow = 50 } = this.options;
        // Highlighter is always rendered relatively to the CellView origin i.e
        // the top-left corner is always in (0, 0) regardless of the CellView position.
        const bbox = new g.Rect(elementView.model.size());
        const { x, y } = bbox.center();
        let d = '';
        if (vertical) {
            d += `M ${x} ${-overflow} ${x} ${bbox.height + overflow}`;
        }
        if (horizontal) {
            d += `M ${-overflow} ${y} ${bbox.width + overflow} ${y}`;
        }
        if (d) {
            this.el.setAttribute('d', d);
        }
    }
});

// Highlighter to show the distance between the element and the other element.
const DistanceLine = dia.HighlighterView.extend({
    tagName: 'g',
    children: function() {
        const color = this.options.color || 'blue';
        return [
            {
                tagName: 'path',
                selector: 'lineEl',
                attributes: {
                    stroke: color,
                    'stroke-width': 2,
                    'shape-rendering': 'optimizeSpeed'
                }
            },
            {
                tagName: 'text',
                selector: 'labelEl',
                attributes: {
                    stroke: 'none',
                    fill: color,
                    'text-anchor': 'middle',
                    'font-size': 12,
                    'font-family': 'sans-serif'
                }
            }
        ];
    },

    highlight(elementView) {
        const {
            length = 20,
            units = 'px',
            direction = 'right',
            aligned = false,
            margin = 3
        } = this.options;
        const { model } = elementView;

        // Highlighter is always rendered relatively to the CellView origin i.e
        // the top-left corner is always in (0, 0) regardless of the CellView position.
        const bbox = new g.Rect(model.size());

        this.renderChildren();

        let start, end, textAnchor;
        switch (direction) {
            case 'right':
                start = bbox.rightMiddle();
                end = start.clone().offset(length, 0);
                textAnchor = 'middle';
                start.offset(margin, 0);
                end.offset(-margin, 0);
                break;
            case 'left':
                start = bbox.leftMiddle();
                end = start.clone().offset(-length, 0);
                textAnchor = 'middle';
                start.offset(-margin, 0);
                end.offset(margin, 0);
                break;
            case 'top':
                start = bbox.topMiddle();
                end = start.clone().offset(0, -length);
                textAnchor = 'start';
                start.offset(0, -margin);
                end.offset(0, margin);
                break;
            case 'bottom':
                start = bbox.bottomMiddle();
                end = start.clone().offset(0, length);
                textAnchor = 'start';
                start.offset(0, margin);
                end.offset(0, -margin);
                break;
        }

        const { lineEl, labelEl } = this.childNodes;
        let d = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

        labelEl.setAttribute('text-anchor', textAnchor);
        if (direction === 'left' || direction === 'right') {
            labelEl.setAttribute('x', (start.x + end.x) / 2);
            labelEl.setAttribute('y', start.y + 20);
            // Draw the perpendicular lines at the end of the line.
            d += `M ${end.x} ${end.y - 5} L ${end.x} ${end.y + 5}`;
            d += `M ${start.x} ${start.y - 5} L ${start.x} ${start.y + 5}`;
            // Draw the cross line close to the end of the line if
            // the aligned option is enabled.
            if (aligned) {
                const c = end.clone().move(start, -8);
                d += `M ${c.x - 3} ${c.y - 5} L ${c.x + 3} ${c.y + 5}`;
            }
        } else {
            labelEl.setAttribute('x', start.x + 10);
            labelEl.setAttribute('y', (start.y + end.y) / 2);
            // Draw the perpendicular lines at the end of the line.
            d += `M ${end.x - 5} ${end.y} L ${end.x + 5} ${end.y}`;
            d += `M ${start.x - 5} ${start.y} L ${start.x + 5} ${start.y}`;
            // Draw the cross line close to the end of the line if
            // the aligned option is enabled.
            if (aligned) {
                const c = end.clone().move(start, -8);
                d += `M ${c.x - 5} ${c.y - 3} L ${c.x + 5} ${c.y + 3}`;
            }
        }
        labelEl.textContent = `${length} ${units}`;
        lineEl.setAttribute('d', d);
    }
});

const PositionInfo = dia.HighlighterView.extend({
    // by default the highlighter is not updated when the associated element moves
    UPDATE_ATTRIBUTES: ['position'],
    tagName: 'text',
    attributes: {
        fill: '#131e29',
        'stroke-width': 3,
        stroke: '#dde6ed',
        'paint-order': 'stroke',
        'text-anchor': 'middle',
        'font-size': 10,
        'font-family': 'sans-serif'
    },
    highlight(elementView) {
        const { x, y, width, height } = elementView.model.getBBox();
        this.el.setAttribute('x', width / 2);
        this.el.setAttribute('y', height - 13);
        this.el.textContent = `${x.toFixed(0)},${y.toFixed(0)}`;
    }
});

// Events
// ------

stencil.on('element:dragstart', () => {
    // This is the first workaround for the fact that there is no public API
    // for snapping the stencil preview element.
    stencil.listenTo(
        stencil._graphDrag,
        'change:position',
        stencil.onCloneSnapped.bind(stencil)
    );
});

stencil.on('element:drag', (cloneView, _evt, cloneArea, validDropTarget) => {
    if (!validDropTarget) {
        clearLines(cloneView);
        return;
    }
    drawLines(cloneView, cloneArea, true);
});

stencil.on('element:dragend', (cloneView) => clearLines(cloneView));

paper.on('element:pointerdown', (elementView) => {
    PositionInfo.add(elementView, 'root', 'position-info');
});

paper.on('element:pointermove', (elementView) => {
    drawLines(elementView, elementView.model.getBBox(), false);
});

paper.on('element:pointerup', (elementView) => {
    clearLines(elementView);
    PositionInfo.remove(elementView);
});

// Functions
// ---------

// Draw the distance and alignment lines for the given element.
function drawLines(elementView, elementBBox, isStencilElement) {
    const { model: element } = elementView;

    clearLines(elementView);

    const directions = [
        {
            name: 'left',
            point: elementBBox.leftMiddle(),
            coordinate: 'x'
        },
        {
            name: 'right',
            point: elementBBox.rightMiddle(),
            coordinate: 'x'
        },
        {
            name: 'top',
            point: elementBBox.topMiddle(),
            coordinate: 'y'
        },
        {
            name: 'bottom',
            point: elementBBox.bottomMiddle(),
            coordinate: 'y'
        }
    ];

    const oppositeDirections = {
        left: 'right',
        right: 'left',
        top: 'bottom',
        bottom: 'top'
    };

    const perpendicularAxis = {
        x: 'y',
        y: 'x'
    };

    const neighbors = {};
    const xSnapPoints = [];
    const ySnapPoints = [];

    const snapDistance = 10;
    const maxDistance = 200 + snapDistance;
    const snapStep = 50;
    const minimalLength = 10;

    directions.forEach((directionRecord) => {
        const { point: start, name: direction, coordinate } = directionRecord;
        const oppositeDirection = oppositeDirections[direction];
        const otherCoordinate = perpendicularAxis[coordinate];

        // Define the area in which we will search for the neighbors in the given direction.
        const area = new g.Rect(start);
        switch (direction) {
            case 'left':
                area.x -= maxDistance;
                area.width = maxDistance;
                break;
            case 'right':
                area.width = maxDistance;
                break;
            case 'top':
                area.y -= maxDistance;
                area.height = maxDistance;
                break;
            case 'bottom':
                area.height = maxDistance;
                break;
        }

        // Find all the models in the area that are not the element itself
        // and that do not intersect the element
        // Note: Here's a room for improvement. We could use a quadtree to speed up the search.
        let neighborsInDirection = graph.findCellsInArea(area).filter((model) => {
            return model !== element && !model.getBBox().intersect(elementBBox);
        });

        // Sort the models by their distance from the element.
        neighborsInDirection = util.sortBy(neighborsInDirection, (model) => {
            const end = util.getRectPoint(model.getBBox(), oppositeDirection);
            return Math.abs(start[coordinate] - end[coordinate]);
        });

        // We snap only to the closest neighbor.
        const [closestNeighbor] = neighborsInDirection;
        if (closestNeighbor) {
            const end = util.getRectPoint(
                closestNeighbor.getBBox(),
                oppositeDirection
            );
            const distance = Math.abs(Math.round(start.difference(end)[coordinate]));
            if (distance < minimalLength) return;

            // There is a neighbor in this direction.
            neighbors[direction] = {
                model: closestNeighbor,
                direction: oppositeDirection,
                distance,
                coordinate
            };

            // Snap the center of the element to the center of the neighbor.
            const deltaCenter = end[otherCoordinate] - start[otherCoordinate];
            if (Math.abs(deltaCenter) < snapDistance) {
                const selfSnapPoints = coordinate === 'x' ? ySnapPoints : xSnapPoints;
                selfSnapPoints.push({
                    type: 'align',
                    distance: deltaCenter,
                    direction: oppositeDirection,
                    priority: 2
                });
            }

            // Snap the element to the distance grid.
            const modulo = distance % snapStep;
            if (modulo < snapDistance || modulo > snapStep - snapDistance) {
                const snapLength = Math.round(distance / snapStep) * snapStep;
                let gridDistance = snapLength - distance;
                if (direction === 'right' || direction === 'bottom') {
                    gridDistance = -gridDistance;
                }
                const neighborSnapPoints =
                    coordinate === 'x' ? xSnapPoints : ySnapPoints;
                neighborSnapPoints.push({
                    type: 'grid',
                    distance: gridDistance,
                    direction: oppositeDirection,
                    priority: 3
                });
            }
        }
    });

    // Snap the element in middle of its neighbors.
    // Horizontally if it has neighbors on the left and right side.
    if (neighbors.left && neighbors.right) {
        const neighborCenter =
            (neighbors.right.model.getBBox().leftMiddle().x +
                neighbors.left.model.getBBox().rightMiddle().x) /
            2;
        const centerDistance = neighborCenter - elementBBox.center().x;
        if (Math.abs(centerDistance) < snapDistance) {
            xSnapPoints.unshift({
                type: 'center',
                distance: centerDistance,
                priority: 1
            });
        }
    }
    // Vertically if it has neighbors on the top and bottom side.
    if (neighbors.top && neighbors.bottom) {
        const neighborCenter =
            (neighbors.bottom.model.getBBox().topMiddle().y +
                neighbors.top.model.getBBox().bottomMiddle().y) /
            2;
        const centerDistance = neighborCenter - elementBBox.center().y;
        if (Math.abs(centerDistance) < snapDistance) {
            ySnapPoints.unshift({
                type: 'center',
                distance: centerDistance,
                priority: 1
            });
        }
    }

    const xSnapPoint = findPrioritizedSnapPoint(xSnapPoints);
    const tx = xSnapPoint.type === 'invalid' ? 0 : xSnapPoint.distance;

    const ySnapPoint = findPrioritizedSnapPoint(ySnapPoints);
    const ty = ySnapPoint.type === 'invalid' ? 0 : ySnapPoint.distance;

    if (tx || ty) {
        if (isStencilElement) {
            // This is the second workaround for the stencil elements due to the missing API.
            // The position of the preview element in the graph is actually at 0,0.
            element.position(tx, ty, { snapped: true, tx, ty });
        } else {
            element.translate(tx, ty, { snapped: true });
        }
    }

    const elementTranslation = new g.Point(tx, ty);
    const elementCenter = elementBBox.center().offset(elementTranslation);

    Object.values(neighbors).forEach((neighbor) => {
        const { model, direction, distance, coordinate } = neighbor;

        // Is the element aligned with the neighbor by its center?
        const otherCoordinate = perpendicularAxis[coordinate];
        const aligned =
            model.getBBox().center()[otherCoordinate] ===
            elementCenter[otherCoordinate];

        // Extra distance to the neighbor caused by the element translation.
        let deltaLength = elementTranslation[coordinate];
        if (direction === 'left' || direction === 'top') {
            deltaLength = -deltaLength;
        }

        // Draw the distance line from the neighbor to the element.
        DistanceLine.add(model.findView(paper), 'root', `line-${direction}`, {
            color: '#0075f2',
            units,
            length: distance + deltaLength,
            direction,
            aligned,
            layer: dia.Paper.Layers.FRONT
        });
    });

    // Draw the alignment lines if exists.
    if (xSnapPoint.type === 'center' || ySnapPoint.type === 'center') {
        AlignmentLine.add(elementView, 'root', 'line-center', {
            color: '#0075f2',
            vertical: xSnapPoint.type === 'center',
            horizontal: ySnapPoint.type === 'center'
        });
    }
}

// Clear all the distance and alignment lines.
function clearLines(elementView) {
    DistanceLine.removeAll(paper);
    AlignmentLine.remove(elementView);
}

// Find the most suitable snap point based on the distance and priority.
function findPrioritizedSnapPoint(snapPoints) {
    return snapPoints.reduce(
        (acc, val) => {
            if (val.distance === null || val.distance === undefined) return acc;
            if (val.priority < acc.priority) return val;
            if (val.priority > acc.priority) return acc;
            return Math.abs(val.distance) < Math.abs(acc.distance) ? val : acc;
        },
        { priority: Infinity, distance: Infinity, type: 'invalid' }
    );
}

graph.fromJSON({
    cells: [
        {
            type: 'standard.Rectangle',
            position: {
                x: 280,
                y: 45
            },
            size: {
                width: 80,
                height: 60
            },
            angle: 0,
            id: 'de03eb94-66ba-4fe5-a589-79b1ebb8440a',
            z: 2,
            attrs: {
                body: {
                    stroke: '#ed2637',
                    fill: 'transparent',
                    rx: 10,
                    ry: 10
                }
            }
        },
        {
            type: 'standard.Path',
            position: {
                x: 510,
                y: 45
            },
            size: {
                width: 80,
                height: 60
            },
            angle: 0,
            id: 'aa63f31f-7328-4277-b5c5-36e764524f5a',
            z: 3,
            attrs: {
                body: {
                    stroke: '#ed2637',
                    fill: 'transparent',
                    d: 'M calc(0.5*w) 0 calc(w) calc(h) H 0 Z'
                }
            }
        },
        {
            type: 'standard.Circle',
            position: {
                x: 520,
                y: 365
            },
            size: {
                width: 60,
                height: 60
            },
            angle: 0,
            id: '38b54c47-f855-4e32-87ed-a0b0a3a8cc85',
            z: 5,
            attrs: {
                body: {
                    stroke: '#ed2637',
                    fill: 'transparent'
                }
            }
        },
        {
            type: 'standard.Path',
            position: {
                x: 49,
                y: 205
            },
            size: {
                width: 80,
                height: 60
            },
            angle: 0,
            id: '24dc8430-45e2-452c-b68d-dba8d8d5ec1e',
            z: 8,
            attrs: {
                body: {
                    stroke: '#ed2637',
                    fill: 'transparent',
                    d: 'M calc(0.5*w) 0 calc(w) calc(h) H 0 Z'
                }
            }
        }
    ]
});

const paperArea = graph.getBBox().inflate(50);

paper.transformToFitContent({
    contentArea: paperArea.clone().inflate(10),
    verticalAlign: true,
    horizontalAlign: true
});

// Axis
// ----

const containerEl = paper.getLayerView(dia.Paper.Layers.BACK).el;
const step = 50;
const paperBottomRight = paperArea.bottomRight();
const width = Math.floor(paperBottomRight.x / step) * step;
const height = Math.floor(paperBottomRight.y / step) * step;
const axisTextAttributes = {
    fill: '#3A5C7E',
    'font-size': 9,
    'font-family': 'sans-serif',
    'text-anchor': 'middle'
};
const xAxis = V('path', {
    fill: 'none',
    stroke: '#3A5C7E'
});

let d = `M 0 0 L ${width} 0`;
for (let i = 0; i <= width; i += step) {
    d += `M ${i} 0 L ${i} 10`;
    if (i > 0) {
        V('text', {
            x: i,
            y: 20,
            ...axisTextAttributes
        })
            .text(`${i}`)
            .appendTo(containerEl);
    }
}
xAxis.attr('d', d);
xAxis.appendTo(containerEl);

const yAxis = V('path', {
    fill: 'none',
    stroke: '#3A5C7E'
});
d = `M 0 0 L 0 ${height}`;
for (let i = 0; i <= height; i += step) {
    d += `M 0 ${i} L 10 ${i}`;
    if (i > 0) {
        V('text', {
            x: 20,
            y: i,
            ...axisTextAttributes
        })
            .text(`${i}`, { textVerticalAnchor: 'middle' })
            .appendTo(containerEl);
    }
}
yAxis.attr('d', d);
yAxis.appendTo(containerEl);

V('text', {
    x: width,
    y: 30,
    ...axisTextAttributes
})
    .text(units, { textVerticalAnchor: 'middle' })
    .appendTo(containerEl);
