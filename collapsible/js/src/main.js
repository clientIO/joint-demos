import { dia, ui, layout, shapes, format, util } from '@joint/plus';
import { Model, Link } from './shapes.js';
import { data } from './data.js';
import { paperStyleSheet } from './stylesheet.js';
import './styles.css';

const namespace = {
    ...shapes,
    Model,
    Link
}

const graph = buildGraphFromObject(data);

const treeLayout = new layout.TreeLayout({
    graph: graph,
    siblingGap: 18,
    parentGap: 50,
    direction: 'R',
    filter: function(siblings) {
        // Layout will skip elements which have been collapsed
        return siblings.filter(function(sibling) {
            return !sibling.isHidden();
        });
    },
    updateAttributes: function(_, model) {
        // Update some presentation attributes during the layout
        model.toggleButtonVisibility(!graph.isSink(model));
        model.toggleButtonSign(!model.isCollapsed());
    }
});

const paper = new dia.Paper({
    gridSize: 1,
    model: graph,
    cellViewNamespace: namespace,
    // Stop all cell rendering for now
    frozen: true,
    async: true,
    autoFreeze: true,
    interactive: false,
    sorting: dia.Paper.sorting.APPROX,
    defaultAnchor: {
        name: 'midSide',
        args: {
            mode: 'horizontal',
            useModelGeometry: true
        }
    },
    defaultConnectionPoint: { name: 'anchor' },
    defaultConnector: { name: 'normal' },
    background: { color: '#F3F7F6' },
    viewManagement: {
        disposeHidden: true,
        initializeUnmounted: true
    }
});

const cellVisibility = (model) => !model.isHidden();

const paperScroller = new ui.PaperScroller({
    paper: paper,
    padding: 50,
    cursor: 'grab',
    inertia: true,
    virtualRendering: {
        margin: 50,
        cellVisibility
    }
});

document.getElementById('canvas').appendChild(paperScroller.el);
paperScroller.render();
paperScroller.zoom(0.8, { absolute: true });

const toolbar = new ui.Toolbar({
    theme: 'modern',
    tools: [{
        type: 'zoom-slider',
        min: 10,
        max: 400,
        step: 10,
        value: paperScroller.zoom() * 100
    }, {
        type: 'button',
        name: 'png',
        text: 'Export PNG'
    }],
    references: {
        paperScroller: paperScroller
    }
});

toolbar.on('png:pointerdown', function(evt) {
    evt.target.style.background = '#D2D2D2';
});

toolbar.on('png:pointerup', async function(evt) {

    const stylesheet = await paperStyleSheet();

    // First dump all views that are not in the viewport but keep
    // the collapsed elements hidden
    paper.updateCellsVisibility({ cellVisibility });
    // Now, when all the elements are rendered, export the paper to PNG

    format.openAsPNG(paper, {
        useComputedStyles: false,
        stylesheet: stylesheet
    });

    evt.target.style.background = null;
});

document.getElementById('tools').appendChild(toolbar.el);
toolbar.render();

// Interactivity

function toggleBranch(root) {
    var shouldHide = !root.isCollapsed();
    root.set({ collapsed: shouldHide });
    graph.getSuccessors(root).forEach(function(successor) {
        successor.set({
            hidden: shouldHide,
            collapsed: false
        });
    });
    layoutAndFocus(paperScroller.getVisibleArea().center());
}

paper.on('element:collapse', function(view, evt) {
    evt.stopPropagation();
    toggleBranch(view.model);
});

paper.on('blank:pointerdown', function(evt, x, y) {
    paperScroller.startPanning(evt, x, y);
});

// Render Elements and Links

const start = new Date().getTime();
layoutAndFocus();
paper.unfreeze({
    afterRender: function() {
        log('Layout and Render Time: <b>', new Date().getTime() - start, 'ms</b>');
        log('Number of Cells: <b>', graph.getCells().length, '</b>');
        // remove the `afterRender` callback
        paper.unfreeze({ batchSize: 500 });
    }
});

// Helpers

function layoutAndFocus(focusPoint) {
    treeLayout.layout();
    const center = focusPoint || treeLayout.getLayoutBBox().center();
    resizePaper();
    paperScroller.center(center.x, center.y);
}

function resizePaper() {
    paper.fitToContent({
        useModelGeometry: true,
        allowNewOrigin: 'any',
        padding: 30,
        contentArea: treeLayout.getLayoutBBox()
    });
}

function buildGraphFromObject(obj) {
    const cells = [];
    buildCellsFromObject(cells, '', obj);
    const cellsGraph = new dia.SearchGraph({}, { cellNamespace: namespace });
    cellsGraph.setQuadTreeLazyMode(true);
    cellsGraph.resetCells(cells);
    return cellsGraph;
}

function buildCellsFromObject(cells, rootName, obj, parent) {

    if (!parent) {
        parent = makeElement(rootName);
        parent.attr({
            body: {
                visibility: 'hidden'
            },
            button: {
                width: 20,
                x: 0
            }
        });
        cells.push(parent);
    }

    Object.keys(obj).forEach(function(key) {
        const value = obj[key];
        let link;
        const keyElement = makeElement(key);
        cells.push(keyElement);

        if (parent) {
            link = makeLink(parent, keyElement);
            cells.push(link);
        }

        if (Array.isArray(value)) {
            value.forEach(function(childValue, childKey) {
                const childValueKeyElement = makeElement(childKey);
                cells.push(childValueKeyElement);
                let childLink = makeLink(keyElement, childValueKeyElement);
                cells.push(childLink);
                if (util.isObject(childValue) || Array.isArray(childValue)) {
                    buildCellsFromObject(cells, rootName, childValue, childValueKeyElement);
                } else {
                    // Leaf.
                    const grandChildElement = makeElement(childValue);
                    cells.push(grandChildElement);
                    childLink = makeLink(childValueKeyElement, grandChildElement);
                    cells.push(childLink);
                }
            });

        } else {
            // Leaf.
            const childKeyElement = makeElement(value);
            cells.push(childKeyElement);
            link = makeLink(keyElement, childKeyElement);
            cells.push(link);
        }
    });
}

function makeElement(label) {
    return new Model({
        attrs: {
            root: {
                title: label
            },
            label: {
                textWrap: {
                    text: label
                }
            },
        },
        size: {
            width: (typeof label === 'number') ? 27 : 70
        }
    });
}

function makeLink(el1, el2) {
    return new Link({
        source: { id: el1.id },
        target: { id: el2.id }
    });
}

function log() {
    const logEl = document.createElement('div');
    logEl.innerHTML = Array.from(arguments).join('');
    document.getElementById('info').appendChild(logEl);
}
