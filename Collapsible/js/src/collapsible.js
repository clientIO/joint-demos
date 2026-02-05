/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

var graph = buildGraphFromObject(window.json);

var treeLayout = new joint.layout.TreeLayout({
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

var paper = new joint.dia.Paper({
    gridSize: 1,
    model: graph,
    cellViewNamespace: joint.shapes,
    // Stop all cell rendering for now
    frozen: true,
    async: true,
    autoFreeze: true,
    interactive: false,
    sorting: joint.dia.Paper.sorting.APPROX,
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

var cellVisibility = (model) => !model.isHidden();

var paperScroller = new joint.ui.PaperScroller({
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

var toolbar = new joint.ui.Toolbar({
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

toolbar.on('png:pointerup', function(evt) {

    // First dump all views that are not in the viewport but keep
    // the collapsed elements hidden
    paper.updateCellsVisibility({ cellVisibility });
    // Now, when all the elements are rendered, export the paper to PNG
    joint.format.openAsPNG(paper, {
        useComputedStyles: false,
        stylesheet: window.paperStyleSheet
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

var start = new Date().getTime();
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
    var center = focusPoint || treeLayout.getLayoutBBox().center();
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
    var cells = [];
    buildCellsFromObject(cells, '', obj);
    var cellsGraph = new joint.dia.SearchGraph({}, { cellNamespace: joint.shapes });
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
        var value = obj[key];
        var link;
        var keyElement = makeElement(key);
        cells.push(keyElement);

        if (parent) {
            link = makeLink(parent, keyElement);
            cells.push(link);
        }

        if (Array.isArray(value)) {
            value.forEach(function(childValue, childKey) {
                var childValueKeyElement = makeElement(childKey);
                cells.push(childValueKeyElement);
                var childLink = makeLink(keyElement, childValueKeyElement);
                cells.push(childLink);
                if (joint.util.isObject(childValue) || Array.isArray(childValue)) {
                    buildCellsFromObject(cells, rootName, childValue, childValueKeyElement);
                } else {
                    // Leaf.
                    var grandChildElement = makeElement(childValue);
                    cells.push(grandChildElement);
                    childLink = makeLink(childValueKeyElement, grandChildElement);
                    cells.push(childLink);
                }
            });

        } else {
            // Leaf.
            var childKeyElement = makeElement(value);
            cells.push(childKeyElement);
            link = makeLink(keyElement, childKeyElement);
            cells.push(link);
        }
    });
}

function makeElement(label) {
    return new joint.shapes.collapsible.Model({
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
    return new joint.shapes.collapsible.Link({
        source: { id: el1.id },
        target: { id: el2.id }
    });
}

function log() {
    const logEl = document.createElement('div');
    logEl.innerHTML = Array.from(arguments).join('');
    document.getElementById('info').appendChild(logEl);
}
