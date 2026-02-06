/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

(function(joint) {

    var PREVIEW_PADDING = 10;
    var ADD_TO_STENCIL_ICON = '../assets/add-to-stencil.svg';

    var SubgraphShape = joint.shapes.standard.BorderedImage;

    var rectangle = new joint.shapes.standard.Rectangle({
        z: 1,
        size: {
            width: 60,
            height: 60
        },
        removable: false,
        attrs: {
            root: {
                magnet: false
            },
            body: {
                fill: '#FFFFFF',
                stroke: '#A0A0A0'
            }
        },
        ports: {
            items: [{
                id: 'out-port',
                group: 'out'
            }],
            groups: {
                out: {
                    markup: [{
                        tagName: 'circle',
                        selector: 'portBody'
                    }],
                    position: {
                        name: 'right'
                    },
                    attrs: {
                        portBody: {
                            r: 10,
                            magnet: 'active',
                            fill: '#187BD3',
                            stroke: '#187BD3'
                        }
                    }
                }
            }
        }
    });

    var ellipse = new joint.shapes.standard.Ellipse({
        z: 2,
        size: {
            width: 60,
            height: 60
        },
        removable: false,
        attrs: {
            root: {
                magnet: false
            },
            body: {
                fill: '#FFFFFF',
                stroke: '#A0A0A0',
                pointerEvents: 'bounding-box'
            }
        },
        ports: {
            items: [{
                id: 'in-port',
                group: 'in'
            }],
            groups: {
                in: {
                    markup: [{
                        tagName: 'circle',
                        selector: 'portBody'
                    }],
                    position: {
                        name: 'left'
                    },
                    attrs: {
                        portBody: {
                            r: 10,
                            magnet: 'passive',
                            fill: '#FFFFFF',
                            stroke: '#187BD3',
                            strokeWidth: 2
                        }
                    }
                }
            }
        }
    });

    var stencilShapes = [
        rectangle.position(20, 10),
        ellipse.position(120, 10)
    ];

    // Element Tools

    var removeTools = new joint.dia.ToolsView({
        tools: [
            new joint.elementTools.Remove({
                useModelGeometry: true,
                action: function(_evt, view) {
                    var model = view.model;
                    var index = stencilShapes.indexOf(model);
                    if (index > -1) {
                        // Removing Stencil Shape
                        stencilShapes.splice(index, 1);
                        updateStencil();
                    } else {
                        // Removing Paper Shape
                        model.remove();
                        selection.collection.remove(model);
                    }
                }
            })
        ]
    });

    // Paper & Graph

    var graph = new joint.dia.Graph;

    var paper = new joint.dia.Paper({
        el: document.getElementById('paper'),
        width: 800,
        height: 600,
        model: graph,
        async: true,
        sorting: joint.dia.Paper.sorting.APPROX,
        linkPinning: false,
        background: { color: '#F3F7F6' },
        validateConnection: function(view1, _magnet1, view2, _magnet2) {
            // Do not allow loop links (Element to Link, Element A to Element B is valid).
            return view1 !== view2;
        },
        highlighting: {
            'default': {
                name: 'stroke',
                options: {
                    padding: 8,
                    attrs: {
                        'stroke': '#187BD3',
                        'stroke-width': 3
                    }
                }
            }
        },
        defaultLink: function() {
            return new joint.shapes.standard.Link({
                attrs: {
                    line: {
                        stroke: '#707070'
                    }
                }
            });
        }
    });

    paper.on({
        'blank:pointerdown': function(evt) {
            selection.startSelecting(evt);
        },
        'element:mouseenter': function(elementView) {
            elementView.addTools(removeTools);
        },
        'element:mouseleave': function(elementView) {
            elementView.removeTools();
        }
    });

    // Stencil

    var stencil = new joint.ui.Stencil({
        paper: paper,
        width: 200,
        height: 100,
        dropAnimation: { duration: 200, easing: 'swing' },
        layout: function(stencilGraph) {
            var elements = stencilGraph.getElements().filter(function(el) {
                return el.get('removable');
            });
            // Automatically layout the removable elements only.
            joint.layout.GridLayout.layout(elements, {
                marginY: 80,
                marginX: 20,
                columns: 1,
                rowHeight: 'compact',
                rowGap: 10,
                columnGap: 20,
            });
        }
    });

    stencil.on('element:dragend', function(cloneView, evt, cloneArea, validDropTarget) {
        var cell = cloneView.model;
        if (validDropTarget && cell instanceof SubgraphShape) {
            stencil.cancelDrag({ dropAnimation: false });
            var subgraph = cell.get('subgraph');
            var position =  cloneArea.center();
            addSubgraphJSON(graph, subgraph, position.x, position.y);
        }
    });

    document.getElementById('stencil').appendChild(stencil.render().el);
    stencil.getPaper().on({
        'element:mouseenter': function(elementView) {
            if (elementView.model.get('removable')) {
                elementView.addTools(removeTools);
            }
        },
        'element:mouseleave': function(elementView) {
            elementView.removeTools();
        }
    });

    // Selection

    var selection = new joint.ui.Selection({
        theme: 'material',
        paper: paper,
        useModelGeometry: true,
        boxContent: function() {
            return [
                '<p>Use ',
                '<span style="background: white; border-radius: 3px; margin: 1px; display: inline-block;">',
                '<img width="18" height="18" src="' + ADD_TO_STENCIL_ICON + '" style="vertical-align: middle;">',
                '</span>',
                ' to save this selection to the stencil</p>'
            ].join('');
        }
    });

    selection.addHandle({
        name: 'add-to-stencil',
        position: 'ne',
        icon: ADD_TO_STENCIL_ICON
    });

    selection.on('action:add-to-stencil:pointerdown', function() {
        addShapesToStencil(this.collection.models);
        this.collection.reset([]);
    });

    // Application code

    addExample();

    stencil.load(stencilShapes);

    selection.collection.reset(graph.getElements());

    // Functions

    function addShapesToStencil(elements) {
        var subgraphJSON = graph.getSubgraph(elements).map(function(model) {
            return model.toJSON();
        });
        joint.format.toPNG(paper, function(dataURI) {
            addStencilShapeWithPreview(subgraphJSON, dataURI);
        }, {
            backgroundColor: 'transparent',
            area: graph.getCellsBBox(elements).inflate(PREVIEW_PADDING),
            useComputedStyles: false,
            // Make sure no other element is visible in the exported PNG
            stylesheet: [
            // Hide all elements and links
                '.joint-cell { display: none; }'
            ].concat(subgraphJSON.map(function(cell) {
            // Show selected elements and links
                return '.joint-cell[model-id="' + cell.id + '"] { display: block; }';
            })).join(' ')
        });
    }

    function addExample() {
        var el1 = rectangle.clone().position(100, 100);
        var el2 = ellipse.clone().position(200, 100);
        var l12 = paper.getDefaultLink().source(el1, { port: 'out-port' }).target(el2, { port: 'in-port' });
        graph.resetCells([el1, el2, l12]);
        // We're in the async mode, make sure all the views are rendered for the PNG export
        paper.dumpViews();
        addShapesToStencil([el1, el2]);
    }

    function addStencilShapeWithPreview(subgraphJSON, dataURI) {
        var shape = new SubgraphShape({
            size: {
                width: 160,
                height: 100
            },
            removable: true,
            subgraph: subgraphJSON,
            attrs: {
                image: {
                    xlinkHref: dataURI
                },
                border: {
                    stroke: '#A0A0A0',
                    strokeDasharray: '8,1'
                },
                background: {
                    fill: '#F3F7F6'
                }
            }
        });
        stencilShapes.push(shape);
        updateStencil();
    }

    function updateStencil() {
        stencil.load(stencilShapes);
        stencil.getPaper().fitToContent({ padding: 10 });
    }

    function addSubgraphJSON(targetGraph, cellsJSON, x, y) {
        var tmpGraph = new joint.dia.Graph();
        tmpGraph.fromJSON({ cells: cellsJSON }, { sort: false });
        var bbox = tmpGraph.getBBox();
        tmpGraph.translate(x - bbox.x - bbox.width / 2, y - bbox.y - bbox.height / 2);
        var clonesHash = tmpGraph.cloneCells(tmpGraph.getCells());
        var clonesArray = Object.keys(clonesHash).map(function(id) { return clonesHash[id]; });
        targetGraph.addCells(clonesArray);
    }

})(joint);
