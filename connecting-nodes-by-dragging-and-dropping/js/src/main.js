import { dia, ui, shapes, util, highlighters, g } from '@joint/plus';
import './styles.scss';

const PREVIEW_SIZE = 50;
const PREVIEW_GAP = 50;
const PREVIEW_PADDING = 3;

const colors = {
    blue: '#0075f2',
    red: '#ed2637',
    white: '#dde6e9',
    black: '#131e29',
    gray: '#cad8e3'
};

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 1,
    drawGrid: { name: 'mesh' },
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: colors.white },
    defaultConnectionPoint: { name: 'boundary' },
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
                color: colors.gray
            }
        };
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

// Element templates.
const templates = {
    rectangle: {
        type: 'standard.Rectangle',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                stroke: colors.red,
                fill: colors.white
            },
            label: {
                fill: colors.black,
                fontSize: 13,
                fontFamily: 'sans-serif',
                text: 'Lorem ipsum dolor sit amet.',
                textWrap: {
                    width: 'calc(w - 10)',
                    height: 'calc(h - 10)',
                    ellipsis: true
                }
            }
        }
    },
    ellipse: {
        type: 'standard.Ellipse',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                stroke: colors.red,
                fill: colors.white
            },
            label: {
                fill: colors.black,
                fontSize: 13,
                fontFamily: 'sans-serif',
                text: 'Lorem ipsum elit.',
                textWrap: {
                    width: 'calc(w - 20)',
                    height: 'calc(h - 10)',
                    ellipsis: true
                }
            }
        }
    }
};

stencil.load([templates.rectangle, templates.ellipse]);

graph.addCells([
    {
        ...templates.rectangle,
        id: 'el1',
        position: { x: 100, y: 100 }
    },
    {
        ...templates.ellipse,
        id: 'el2',
        position: { x: 400, y: 100 }
    },
    {
        ...templates.rectangle,
        id: 'el3',
        position: { x: 100, y: 300 }
    },
    {
        type: 'standard.Link',
        source: { id: 'el1' },
        target: { id: 'el2' }
    }
]);

// Add event listeners to the paper and stencil.

paper.on({
    'element:pointermove': onPaperElementPointermove,
    'element:pointerup': onPaperElementPointerup
});

stencil.on({
    'element:drag': onStencilElementPointermove,
    // Note: the `element:drop` event is fired after `element:dragend`.
    // The new element is already added to the graph at this point.
    'element:drop': onStencilElementPointerup
});

function onStencilElementPointermove(elementView, evt) {
    const { data } = evt;
    const { pointermoveCalled } = data;
    validateDrop(paper, elementView, evt);
    // Run the code below on the first `pointermove` event only
    if (pointermoveCalled) return;
    data.pointermoveCalled = true;
    // When the paper has the `dragging` class, we increase the link wrapper width to make it easier
    // for the user to drop the element on the link.
    paper.el.classList.add('dragging');
}

function onStencilElementPointerup(elementView, evt) {
    const { data } = evt;
    const { dropView, pointermoveCalled } = data;
    elementView.el.style.visibility = '';
    if (dropView) {
        dropElementView(dropView, elementView, evt);
    }
    if (!pointermoveCalled) return;
    // When the paper has the `dragging` class, we increase the link wrapper width to make it easier
    // for the user to drop the element on the link.
    paper.el.classList.remove('dragging');
}

function onPaperElementPointermove(elementView, evt) {
    const { data } = evt;
    const { pointermoveCalled } = data;
    validateDrop(paper, elementView, evt);
    // Run the code below on the first `pointermove` event only
    if (pointermoveCalled) return;
    data.pointermoveCalled = true;
    paper.el.classList.add('dragging');
    elementView.model.toFront();
}

function onPaperElementPointerup(elementView, evt) {
    const { data } = evt;
    const { dropView, pointermoveCalled } = data;
    elementView.el.style.visibility = '';
    if (dropView) {
        dropElementView(dropView, elementView, evt);
    }
    if (!pointermoveCalled) return;
    paper.el.classList.remove('dragging');
}

function validateDrop(paper, elementView, evt) {
    const { model: graph } = paper;
    const { dropView } = evt.data;
    const dragElement = elementView.model;

    const viewFromPoint = findViewFromPoint(paper, elementView, evt);
    const point = paper.clientToLocalPoint(evt.clientX, evt.clientY);

    let valid = true;
    let PreviewClass;
    let targetFrameSelector;

    if (viewFromPoint === dropView) {
        const dropElement = dropView.model;
        if (dropElement.isElement()) {
            // If the drop view is an element, we check if the element neighborhood is empty.
            if (
                !validateNeighborhood(
                    paper,
                    dragElement,
                    dropElement,
                    dropElement.getBBox().sideNearestToPoint(point)
                )
            ) {
                valid = false;
            }
        }

        if (valid) {
            // The view under the pointer remains the same.
            PreviewClass = dropView.model.isElement() ? PreviewElement : PreviewLink;
            // In case the view under the pointer is an element, we update the preview link direction.
            // In case the view under the pointer is a link, we update the preview position on the link..
            PreviewClass.addFromPoint(viewFromPoint, point, 'preview');
            return;
        }
    }

    // Clear the previous preview.
    dia.HighlighterView.removeAll(paper, 'target-frame');
    dia.HighlighterView.removeAll(paper, 'preview');
    delete evt.data.dropView;

    if (viewFromPoint) {
        // Run validation below to check if the drop is valid.
        // The logic for the element and link drop is different.
        if (viewFromPoint.model.isLink()) {
            const dropLink = viewFromPoint.model;
            targetFrameSelector = 'line';
            PreviewClass = PreviewLink;

            if (valid && graph.getConnectedLinks(dragElement).includes(dropLink)) {
                // The element being dragged is already connected to the link.
                valid = false;
            }

            if (
                valid &&
                util.intersection(graph.getNeighbors(dragElement), [
                    dropLink.getSourceCell(),
                    dropLink.getTargetCell()
                ]).length > 0
            ) {
                // The link's source or target is already connected to the element being dragged.
                valid = false;
            }

            if (valid && viewFromPoint.getConnectionLength() < 2 * PREVIEW_SIZE) {
                // The link is too short.
                valid = false;
            }
        } else {
            const dropElement = viewFromPoint.model;
            const direction = dropElement.getBBox().sideNearestToPoint(point);
            targetFrameSelector = 'body';
            PreviewClass = PreviewElement;

            if (valid && graph.isNeighbor(dragElement, dropElement)) {
                // The element being dragged is already connected to the element under the pointer.
                valid = false;
            }

            if (
                valid &&
                !validateNeighborhood(paper, dragElement, dropElement, direction)
            ) {
                // The element under the pointer is too close to the paper edge or to another element.
                valid = false;
            }
        }
    } else {
        // There is no view under the pointer.
        valid = false;
    }

    if (!valid) {
        // Invalid drop. Show the element being dragged.
        elementView.el.style.visibility = '';
        return;
    }

    // Valid drop. Show the preview.
    highlighters.mask.add(
        viewFromPoint,
        targetFrameSelector,
        'target-frame',
        {
            layer: dia.Paper.Layers.FRONT,
            padding: PREVIEW_PADDING,
            attrs: {
                stroke: colors.blue,
                'stroke-width': 2,
                'stroke-linecap': 'round'
            }
        }
    );
    PreviewClass.addFromPoint(viewFromPoint, point, 'preview');
    // Hide the element being dragged.
    elementView.el.style.visibility = 'hidden';
    evt.data.dropView = viewFromPoint;
}

function dropElementView(sourceView, targetView, evt) {
    const source = sourceView.model;
    const target = targetView.model;
    if (source.isElement()) {
        // Add element next to element.
        const preview = PreviewElement.get(sourceView, 'preview');
        if (preview) {
            const { direction } = preview.options;
            addElementNextToElement(source, target, direction, PREVIEW_GAP);
        }
    } else {
        // Drop the element on the link i.e. split the link and add the element in between.
        addElementOnLink(target, source);
    }
    // Clear the previews.
    dia.HighlighterView.removeAll(paper, 'target-frame');
    dia.HighlighterView.removeAll(paper, 'preview');
}

function addElementOnLink(element, link) {
    const { model: graph } = paper;
    const source = link.source();
    const clone = link.clone();
    // Batch all the changes for the undo/redo functionality.
    graph.startBatch('add-element-on-link');
    link.source(element);
    clone.source(source);
    clone.target(element);
    graph.addCell(clone);
    graph.stopBatch('add-element-on-link');
}

function addElementNextToElement(source, target, direction, distance = 0) {
    const sourceBBox = source.getBBox();
    const targetBBox = target.getBBox();
    const center = sourceBBox.center();
    const position = util.getRectPoint(sourceBBox, direction);
    position.move(
        center,
        distance + Math.max(targetBBox.width, targetBBox.height) / 2
    );
    // Batch all the changes for the undo/redo functionality.
    graph.startBatch('add-element-next-to-element');
    target.position(
        position.x - targetBBox.width / 2,
        position.y - targetBBox.height / 2
    );
    // add link
    const link = new shapes.standard.Link();
    link.source(source);
    link.target(target);
    graph.addCell(link);
    graph.stopBatch('add-element-next-to-element');
}

function getNeighborPoint(element, direction, distance = PREVIEW_GAP) {
    const bbox = element.getBBox();
    const center = bbox.center();
    const point = util.getRectPoint(bbox, direction);
    point.move(center, distance);
    return point;
}

function validateNeighborhood(paper, dragElement, dropElement, direction) {
    const neighborPoint = getNeighborPoint(dropElement, direction);
    if (!paper.getArea().containsPoint(neighborPoint)) return false;
    const neighborArea = new g.Rect(neighborPoint);
    neighborArea.inflate(PREVIEW_SIZE / 2);
    return (
        paper.model
            .findModelsInArea(neighborArea)
            .filter((el) => el !== dragElement).length === 0
    );
}

function findViewFromPoint(paper, elementView, evt) {
    const nodesFromPoint = Array.from(
        document.elementsFromPoint(evt.clientX, evt.clientY)
    );
    while (nodesFromPoint.length > 0) {
        const el = nodesFromPoint.shift();
        const view = paper.findView(el);
        if (view && view !== elementView) {
            return view;
        }
    }
    return null;
}

// Custom preview for the element drop.
// It will show a preview of a rectangular element with a text next to the element.
// The position is determined by the `direction` option.
const PreviewElement = dia.HighlighterView.extend(
    {
        tagName: 'g',
        attributes: {
            fill: colors.white,
            stroke: colors.blue,
            'stroke-width': 2
        },
        children: util.svg`
        <path @selector="line" class="preview-line"/>
        <g @selector="target" class="preview-element">
            <rect class="preview-body" x="-${PREVIEW_SIZE / 2}" y="-${PREVIEW_SIZE / 2
}" width="${PREVIEW_SIZE}" height="${PREVIEW_SIZE}"/>
            <path class="preview-text" stroke="${colors.red
}" d="M -20 -10 H 20 M -20 0 H 10 M -20 10 H 15" />
        </g>
    `,

        // Method called to highlight a CellView
        highlight(cellView) {
            const { direction = 'top' } = this.options;
            this.updatePreview(cellView, direction);
        },

        updatePreview(elementView, direction) {
            const markerId = 'preview-line-arrow';
            if (!this.childNodes) {
                const { paper } = elementView;
                this.renderChildren();
                paper.defineMarker({
                    id: markerId,
                    markup: util
                        .svg`<path d="M -10 -5 0 0 -10 5 z" fill="${colors.blue}" />`
                });
            }

            this.options.direction = direction;
            const { length = 0, lineOffset = 0 } = this.options;
            const bbox = new g.Rect(elementView.model.size());
            const center = bbox.center();
            const start = util.getRectPoint(bbox, direction);
            start.move(center, lineOffset);
            const end = start.clone().move(center, length);
            const targetCenter = end.clone().move(center, PREVIEW_SIZE / 2);

            this.childNodes.line.setAttribute(
                'd',
                `M ${start.x} ${start.y} L ${end.x} ${end.y}`
            );
            this.childNodes.line.setAttribute('marker-end', `url(#${markerId})`);
            this.childNodes.target.setAttribute(
                'transform',
                `translate(${targetCenter.x}, ${targetCenter.y})`
            );
        }
    },
    {
        addFromPoint(elementView, point, id) {
            const direction = elementView.model.getBBox().sideNearestToPoint(point);
            const preview = this.get(elementView, id);
            if (preview) {
                preview.updatePreview(elementView, direction);
            } else {
                this.add(elementView, 'root', id, {
                    length: PREVIEW_GAP,
                    lineOffset: PREVIEW_PADDING + 1,
                    direction,
                    layer: dia.Paper.Layers.FRONT
                });
            }
        }
    }
);

// Custom preview for the link drop.
// It will show a preview of a rectangular element with a text on the link.
// The position is determined by the `length` option.
const PreviewLink = dia.HighlighterView.extend(
    {
        attributes: {
            fill: colors.white,
            stroke: colors.blue,
            'stroke-width': 2
        },
        children: util.svg`
        <g @selector="target">
            <rect class="preview-body" x="-${PREVIEW_SIZE / 2}" y="-${PREVIEW_SIZE / 2
}" width="${PREVIEW_SIZE}" height="${PREVIEW_SIZE}"/>
            <path class="preview-text" stroke="${colors.red
}" d="M -20 -10 H 20 M -20 0 H 10 M -20 10 H 15" />
        </g>
    `,

        highlight(linkView) {
            const { length = 0 } = this.options;
            this.updatePreview(linkView, length);
        },

        updatePreview(linkView, length) {
            if (!this.childNodes) {
                this.renderChildren();
            }
            this.options.length = length;
            const point = linkView.getPointAtLength(length);
            this.childNodes.target.setAttribute(
                'transform',
                `translate(${point.x}, ${point.y})`
            );
        }
    },
    {
        addFromPoint(linkView, point, id) {
            const space = PREVIEW_SIZE / 2 + PREVIEW_PADDING;
            const maxLength = linkView.getConnectionLength();
            const length = Math.max(
                space,
                Math.min(maxLength - space, linkView.getClosestPointLength(point))
            );
            const preview = this.get(linkView, id);
            if (preview) {
                preview.updatePreview(linkView, length);
            } else {
                this.add(linkView, 'root', id, {
                    length,
                    layer: dia.Paper.Layers.FRONT
                });
            }
        }
    }
);

// Undo / Redo

const commandManager = new dia.CommandManager({
    graph: graph
});

const toolbar = new ui.Toolbar({
    tools: [{ type: 'undo' }, { type: 'redo' }],
    autoToggle: true,
    references: {
        commandManager
    }
});

document.getElementById('toolbar-container').appendChild(toolbar.el);
toolbar.render();

// Message

const message1 = new ui.FlashMessage({
    theme: 'modern',
    content:
        '<i>1.</i> Try dragging elements from the stencil and dropping them onto the <b>elements</b> on the paper.',
    closeAnimation: {
        delay: 10000
    }
});

message1.on('close', () => {
    const message2 = new ui.FlashMessage({
        theme: 'modern',
        content:
            '<i>2.</i> Try dragging elements from the stencil and dropping them onto the <b>links</b> on the paper.',
        closeAnimation: {
            delay: 10000
        }
    });

    message2.open();
});

message1.open();
