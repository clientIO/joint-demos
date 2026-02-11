import { dia, elementTools, format, layout, shapes, ui } from '@joint/plus';
import './styles.css';
import addToStencilIcon from '../assets/add-to-stencil.svg?no-inline';

const PREVIEW_PADDING = 10;

const SubgraphShape = shapes.standard.BorderedImage;

const rectangle = new shapes.standard.Rectangle({
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

const ellipse = new shapes.standard.Ellipse({
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

const stencilShapes = [
    rectangle.position(20, 10),
    ellipse.position(120, 10)
];

// Element Tools

const removeTools = new dia.ToolsView({
    tools: [
        new elementTools.Remove({
            useModelGeometry: true,
            action: function(_evt, view) {
                const model = view.model;
                const index = stencilShapes.indexOf(model);
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

const graph = new dia.Graph({}, { cellNamespace: shapes });

const paper = new dia.Paper({
    el: document.getElementById('paper'),
    width: 800,
    height: 600,
    model: graph,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    linkPinning: false,
    cellViewNamespace: shapes,
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
        return new shapes.standard.Link({
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

const stencil = new ui.Stencil({
    paper: paper,
    width: 200,
    height: 100,
    dropAnimation: { duration: 200, easing: 'swing' },
    layout: function(stencilGraph) {
        var elements = stencilGraph.getElements().filter(function(el) {
            return el.get('removable');
        });
        // Automatically layout the removable elements only.
        layout.GridLayout.layout(elements, {
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
    const cell = cloneView.model;
    if (validDropTarget && cell instanceof SubgraphShape) {
        stencil.cancelDrag({ dropAnimation: false });
        const subgraph = cell.get('subgraph');
        const position =  cloneArea.center();
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

const selection = new ui.Selection({
    theme: 'material',
    paper: paper,
    useModelGeometry: true,
    boxContent: function() {
        return [
            '<p>Use ',
            '<span style="background: white; border-radius: 3px; margin: 1px; display: inline-block;">',
            '<img width="18" height="18" src="' + addToStencilIcon + '" style="vertical-align: middle;">',
            '</span>',
            ' to save this selection to the stencil</p>'
        ].join('');
    }
});

selection.addHandle({
    name: 'add-to-stencil',
    position: 'ne',
    icon: addToStencilIcon
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
    const subgraphJSON = graph.getSubgraph(elements).map(function(model) {
        return model.toJSON();
    });
    format.toPNG(paper, function(dataURI) {
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
    const el1 = rectangle.clone().position(100, 100);
    const el2 = ellipse.clone().position(200, 100);
    const l12 = paper.getDefaultLink().source(el1, { port: 'out-port' }).target(el2, { port: 'in-port' });
    graph.resetCells([el1, el2, l12]);
    // We're in the async mode, make sure all the views are rendered for the PNG export
    paper.once('render:done', function() {
         addShapesToStencil([el1, el2]);
    });
}

function addStencilShapeWithPreview(subgraphJSON, dataURI) {
    const shape = new SubgraphShape({
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
    const tmpGraph = new dia.Graph({}, { cellNamespace: shapes });
    tmpGraph.fromJSON({ cells: cellsJSON }, { sort: false });
    const bbox = tmpGraph.getBBox();
    tmpGraph.translate(x - bbox.x - bbox.width / 2, y - bbox.y - bbox.height / 2);
    const clonesHash = tmpGraph.cloneCells(tmpGraph.getCells());
    const clonesArray = Object.keys(clonesHash).map(function(id) { return clonesHash[id]; });
    targetGraph.addCells(clonesArray);
}
