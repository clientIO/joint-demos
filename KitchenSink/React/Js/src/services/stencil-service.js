import { ui, dia, util } from '@joint/plus';
import { stencilGroups, stencilShapes } from '../config/stencil';
import * as appShapes from '../shapes/app-shapes';
const HIGHLIGHT_COLOR = '#F4F7FB';
// Define a custom highlighter for the stencil hover effect
const StencilBackground = dia.HighlighterView.extend({
    tagName: 'rect',
    attributes: {
        'stroke': 'none',
        'fill': 'transparent',
        'pointer-events': 'none',
        'rx': 4,
        'ry': 4,
    },
    style: {
        transition: 'fill 400ms'
    },
    options: {
        padding: 0,
        color: 'gray',
        width: null,
        height: null,
        layer: dia.Paper.Layers.BACK
    },
    // Method called to highlight a CellView
    highlight(cellView, _node) {
        const { padding, width, height } = this.options;
        const bbox = cellView.model.getBBox();
        // Highlighter is always rendered relatively to the CellView origin
        bbox.x = bbox.y = 0;
        // Custom width and height can be set
        if (Number.isFinite(width)) {
            bbox.x = (bbox.width - width) / 2;
            bbox.width = width;
        }
        if (Number.isFinite(height)) {
            bbox.y = (bbox.height - height) / 2;
            bbox.height = height;
        }
        // Increase the size of the highlighter
        bbox.inflate(padding);
        this.vel.attr(bbox.toJSON());
        // Change the color of the highlighter (allow transition)
        util.nextFrame(() => this.vel.attr('fill', this.options.color));
    }
});
export class StencilService {
    constructor(stencilContainer) {
        this.stencilContainer = stencilContainer;
    }
    create(paperScroller, snaplines) {
        this.stencil = new ui.Stencil({
            paper: paperScroller,
            snaplines: snaplines,
            width: 240,
            height: null,
            groups: this.getStencilGroups(),
            dropAnimation: true,
            groupsToggleButtons: true,
            paperOptions: function () {
                return {
                    model: new dia.Graph({}, {
                        cellNamespace: appShapes
                    }),
                    cellViewNamespace: appShapes
                };
            },
            search: {
                '*': ['type', 'name']
            },
            layout: {
                columns: 4,
                marginX: 10,
                marginY: 24,
                columnGap: 20,
                rowGap: 24,
                rowHeight: 24,
                columnWidth: 36,
                resizeToFit: true
            },
            dragStartClone: (cell) => {
                const clone = this.createFromStencilElement(cell);
                clone.attr({
                    label: {
                        text: cell.get('name')
                    }
                });
                clone.unset('name');
                return clone;
            },
            el: this.stencilContainer
        });
        this.stencil.render();
        this.stencil.on({
            'element:dragstart': () => this.tooltip.disable(),
            'element:dragend': () => this.tooltip.enable(),
        });
        // We create a single tooltip paper that will be reused for all tooltips
        this.tooltipGraph = new dia.Graph({}, { cellNamespace: appShapes });
        this.tooltipPaper = new dia.Paper({
            model: this.tooltipGraph,
            cellViewNamespace: appShapes,
            width: 140,
            height: 120,
            async: true,
            autoFreeze: true,
            overflow: true,
            sorting: dia.Paper.sorting.NONE
        });
        this.initializeStencilTooltip.call(this);
        this.startHoverListener();
    }
    createFromStencilElement(el) {
        const clone = el.clone();
        clone.prop(clone.get('targetAttributes'));
        clone.removeProp('targetAttributes');
        return clone;
    }
    buildTooltipContent(cell) {
        const { tooltipGraph, tooltipPaper } = this;
        // Add a copy of the cell to the tooltip graph
        // Note: We don't have to care about the position of the cell
        // because the tooltip paper will be transformed to fit the cell
        tooltipGraph.resetCells([cell.clone()]);
        const shapeNameEl = document.createElement('span');
        shapeNameEl.append(document.createTextNode(cell.get('name')));
        const documentFragment = document.createDocumentFragment();
        documentFragment.append(tooltipPaper.el, shapeNameEl);
        tooltipPaper.transformToFitContent({
            padding: 5,
            contentArea: cell.getBBox(),
            verticalAlign: 'middle',
            horizontalAlign: 'middle'
        });
        return documentFragment;
    }
    initializeStencilTooltip() {
        this.tooltip = new ui.Tooltip({
            target: '[model-id]',
            rootTarget: this.stencil.el,
            // Tooltip container denotes the area where the tooltip can be shown
            // It's adding a padding on the top and the bottom of the paper area.
            container: this.stencilContainer,
            content: (el) => {
                const groups = Object.keys(this.getStencilGroups());
                const graphs = groups.map(group => this.stencil.getGraph(group));
                let stencilElement = null;
                for (const graph of graphs) {
                    const foundElement = graph.getCell(el.getAttribute('model-id'));
                    if (!foundElement)
                        continue;
                    stencilElement = foundElement;
                }
                if (!stencilElement) {
                    // The element should be always found
                    return false;
                }
                return this.buildTooltipContent(this.createFromStencilElement(stencilElement));
            },
            position: ui.Tooltip.TooltipPosition.Left,
            positionSelector: '.stencil-container',
            padding: 10,
            animation: {
                duration: '250ms'
            }
        });
    }
    setShapes() {
        this.stencil.load(this.getStencilShapes());
    }
    getStencilGroups() {
        return stencilGroups;
    }
    getStencilShapes() {
        return stencilShapes;
    }
    startHoverListener() {
        this.stencil.on({
            'group:element:mouseenter': (_, elementView) => {
                StencilBackground.add(elementView, 'root', 'stencil-highlight', {
                    padding: 4,
                    width: 36,
                    height: 36,
                    color: HIGHLIGHT_COLOR
                });
            },
            'group:element:mouseleave': (groupPaper) => {
                StencilBackground.removeAll(groupPaper);
            },
            // Remove all highlights when the user starts dragging an element
            'group:element:pointerdown': (groupPaper) => {
                StencilBackground.removeAll(groupPaper);
            }
        });
    }
}
