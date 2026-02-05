/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

(function(joint, window) {

    const COLORS = ['#31d0c6', '#7c68fc', '#fe854f', '#feb663'];
    const DIRECTIONS = ['R', 'BR', 'B', 'BL', 'L', 'TL', 'T', 'TR'];
    const POSITIONS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];

    joint.setTheme('material');

    const graph = new joint.dia.Graph;
    const tree = new joint.layout.TreeLayout({ graph: graph });

    const paper = new joint.dia.Paper({
        width: 500,
        height: 500,
        gridSize: 10,
        model: graph,
        perpendicularLinks: true,
        interactive: false
    });

    const paperScroller = new joint.ui.PaperScroller({
        paper: paper,
        cursor: 'grab',
        baseWidth: 1,
        baseHeight: 1,
        contentOptions: {
            padding: 100,
            allowNewOrigin: 'any'
        }
    });

    paper.on({
        'element:pointerdown': onElementClick,
        'blank:pointerdown': paperScroller.startPanning
    });

    document.getElementById('tree-app').appendChild(paperScroller.render().el);

    const elementTemplate = new joint.shapes.standard.Rectangle({
        size: { height: 30, width: 30 },
        attrs: {
            body: {
                fill: COLORS[0],
                rx: 5,
                ry: 5,
                cursor: 'pointer',
                strokeWidth: 2,
                stroke: '#6a6c8a'
            }
        }
    });

    const linkTemplate = new joint.shapes.standard.Link({
        attrs: {
            line: {
                stroke: '#6a6c8a',
                strokeWidth: 2,
                pointerEvents: 'none',
                targetMarker: null,
            }
        },
        connector: { name: 'rounded' }
    });

    showHalo(elementTemplate.clone().position(250, 250).addTo(graph).findView(paper));

    // Demo functions
    function layout() {
        tree.layout();
        paperScroller.adjustPaper();
    }

    function showHalo(view, opt) {

        const model = view.model;

        if (opt && opt.animation) {
            paperScroller.scrollToElement(model, opt);
        } else {
            paperScroller.centerElement(model);
        }

        const halo = new joint.ui.Halo({
            cellView: view,
            tinyThreshold: 0,
            boxContent: getBoxContent(model),
            handles: DIRECTIONS.map((direction, i) => ({
                name: direction,
                position: POSITIONS[i],
                // Rotate the icon inside the handle based on the position
                attrs: {
                    '.handle': {
                        style: 'transform: rotate(' + (i * 45) + 'deg); background-image: url("images/handle.png")'
                    }
                }
            })),
        });

        // Listen to all halo events and
        // try to parse the direction from the event name.
        halo.on('all', function(eventName) {
            const match = /:(\w+):pointerdown/.exec(eventName);
            const direction = match && match[1];
            if (direction) {
                addElement(model, direction);
                halo.options.boxContent = getBoxContent(model);
                halo.update();
                layout();
                paperScroller.centerElement(model);
            }
        });

        halo.render();
    }

    function getBoxContent(model) {

        let content = '<li>Add new element to an arbitrary side.</li>';

        if (graph.isSource(model)) {
            content += '<li>Double-click to <b>generate</b> a tree.</li>';
        } else if (graph.isSink(model)) {
            content += '<li>Double-click to <b>remove</b> the element.</li>';
        }

        return '<ul>' + content + '</ul>';
    }

    let clickTimerId;

    function onElementClick(view) {

        if (clickTimerId) {
            // double click
            window.clearTimeout(clickTimerId);
            clickTimerId = null;
            onElementDblClick(view);

        } else {
            // single click
            clickTimerId = window.setTimeout(click, 200);
        }

        function click() {
            clickTimerId = null;
            showHalo(view, { animation: true });
        }
    }

    function onElementDblClick(view) {

        const element = view.model;
        if (element.isElement()) {
            if (graph.isSource(element)) {
                generateTree(element, { n: 4, depth: 3, directions: ['T', 'B', 'R', 'L'] });
                layout();
            } else if (graph.isSink(element)) {
                element.remove();
                layout();
            }
        }
    }

    function addElement(element, direction) {
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];

        const newElement = element.clone()
            .set('direction', direction)
            .attr('body/fill', color)
            .addTo(graph);

        linkTemplate.clone().set({
            source: { id: element.id },
            target: { id: newElement.id }
        }).addTo(graph);

        return newElement;
    }

    function generateTree(element, opt) {

        opt = opt || {};

        const n = opt.n || 0;
        const depth = opt.depth || 0;
        const directions = opt.directions || DIRECTIONS;

        for (let i = 0; i < n; i++) {
            const direction = directions[Math.floor(Math.random() * directions.length)];
            const newElement = addElement(element, direction);
            if (depth > 0) {
                generateTree(newElement, {
                    n: n / 2,
                    depth: depth-1,
                    directions: directions
                });
            }
        }
    }
})(joint, window);
