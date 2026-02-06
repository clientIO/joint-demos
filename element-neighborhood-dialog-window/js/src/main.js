import {
    dia,
    shapes,
    ui,
    util,
    alg,
    setTheme,
    highlighters,
    graphUtils
} from '@joint/plus';
import { DirectedGraph } from '@joint/layout-directed-graph';

import './styles.scss';

setTheme('material');

const items = {
    'organic-compound': {
        id: 'organic-compound',
        label: 'Organic compound',
        children: {
            hydrocarbon: {
                label: 'Hydrocarbon',
                children: {
                    saturated: {
                        label: 'Saturated',
                        children: {
                            methane: {
                                label: 'Methane',
                                formula: 'CH4'
                            },
                            pentane: {
                                label: 'Pentane',
                                formula: 'C5H12'
                            },
                            hexane: {
                                label: 'Hexane',
                                formula: 'C6H14'
                            },
                            heptane: {
                                label: 'Heptane',
                                formula: 'C7H16'
                            }
                        }
                    },
                    unsaturated: {
                        label: 'Unsaturated',
                        children: {
                            ethylene: {
                                label: 'Ethylene',
                                formula: 'C2H4'
                            },
                            benzene: {
                                label: 'Benzene',
                                formula: 'C6H6'
                            },
                            acetylene: {
                                label: 'Acetylene',
                                formula: 'C2H2'
                            }
                        }
                    }
                }
            },
            'ring-system': {
                id: 'ring-system',
                label: 'Ring system',
                children: {
                    monocycle: {
                        label: 'Monocycle',
                        children: {
                            benzene: {
                                label: 'Benzene',
                                formula: 'C6H6'
                            },
                            cyclohexane: {
                                label: 'Cyclohexane',
                                formula: 'C6H12'
                            },
                            cycloheptane: {
                                label: 'Cycloheptane',
                                formula: 'C7H14'
                            },
                            furane: {
                                label: 'Furane',
                                formula: 'C4H4O'
                            }
                        }
                    },
                    polycycle: {
                        id: 'polycycle',
                        label: 'Polycycle',
                        children: {
                            naphthalene: {
                                label: 'Naphthalene',
                                formula: 'C10H8'
                            },
                            anthracene: {
                                label: 'Anthracene',
                                formula: 'C14H10'
                            },
                            phenanthrene: {
                                label: 'Phenanthrene',
                                formula: 'C14H10',
                                children: {
                                    chrysene: {
                                        label: 'Chrysene',
                                        formula: 'C18H12'
                                    },
                                    pyrene: {
                                        label: 'Pyrene',
                                        formula: 'C16H10'
                                    }
                                }
                            }
                        }
                    }
                }
            },

            'functional-group': {
                label: 'Functional group',
                children: {
                    'o-compound': {
                        label: 'O-compound',
                        children: {
                            alcohol: {
                                label: 'Alcohol',
                                formula: 'R-OH',
                                children: {
                                    methanol: {
                                        label: 'Methanol',
                                        formula: 'CH3OH'
                                    },
                                    ethanol: {
                                        label: 'Ethanol',
                                        formula: 'C2H5OH'
                                    },
                                    glycerol: {
                                        label: 'Glycerol',
                                        formula: 'C3H8O3'
                                    }
                                }
                            },
                            phenol: {
                                label: 'Phenol',
                                formula: 'C6H5OH'
                            },
                            ether: {
                                label: 'Ether',
                                formula: 'R-O-R',
                                children: {
                                    'dimethyl-ether': {
                                        label: 'Dimethyl ether',
                                        formula: 'CH3-O-CH3'
                                    },
                                    'diethyl-ether': {
                                        label: 'Diethyl ether',
                                        formula: 'C2H5-O-C2H5'
                                    }
                                }
                            },
                            ester: {
                                label: 'Ester',
                                formula: 'R-COO-R',
                                children: {
                                    'methyl-acetate': {
                                        label: 'Methyl acetate',
                                        formula: 'CH3-COO-CH3'
                                    },
                                    'ethyl-acetate': {
                                        label: 'Ethyl acetate',
                                        formula: 'C2H5-COO-C2H5'
                                    }
                                }
                            }
                        }
                    },
                    'n-compound': {
                        label: 'N-compound',
                        children: {
                            amine: {
                                label: 'Amine',
                                formula: 'R-NH2'
                            },
                            aniline: {
                                label: 'Aniline',
                                formula: 'C6H5NH2'
                            },
                            amide: {
                                label: 'Amide',
                                formula: 'R-CONH2'
                            }
                        }
                    },
                    's-compound': {
                        label: 'S-compound',
                        children: {
                            sulfide: {
                                label: 'Sulfide',
                                formula: 'R-S-R'
                            },
                            sulfoxide: {
                                label: 'Sulfoxide',
                                formula: 'R-SO-R'
                            },
                            sulfone: {
                                label: 'Sulfone',
                                formula: 'R-SO2-R'
                            }
                        }
                    },
                    'p-compound': {
                        label: 'P-compound',
                        children: {
                            ether: {
                                label: 'Ether',
                                formula: 'R-O-R',
                                children: {
                                    'dimethyl-ether': {
                                        label: 'Dimethyl ether',
                                        formula: 'CH3-O-CH3'
                                    },
                                    'diethyl-ether': {
                                        label: 'Diethyl ether',
                                        formula: 'C2H5-O-C2H5'
                                    }
                                }
                            },
                            ester: {
                                label: 'Ester',
                                formula: 'R-COO-R',
                                children: {
                                    'methyl-acetate': {
                                        label: 'Methyl acetate',
                                        formula: 'CH3-COO-CH3'
                                    },
                                    'ethyl-acetate': {
                                        label: 'Ethyl acetate',
                                        formula: 'C2H5-COO-C2H5'
                                    }
                                }
                            },
                            amide: {
                                label: 'Amide',
                                formula: 'R-CONH2',
                                children: {
                                    acetamide: {
                                        label: 'Acetamide',
                                        formula: 'CH3-CONH2'
                                    },
                                    benzamide: {
                                        label: 'Benzamide',
                                        formula: 'C6H5-CONH2'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

const dialogs = {};
let selectedElement = null;

const graph = new dia.Graph({}, { cellNamespace: shapes });

const cells = graphUtils.constructTree(items['organic-compound'], {
    makeElement: function(item) {
        const { formula = '', label = '', id } = item;
        const fontSize = formula ? 12 : 16;
        const width = Math.max(formula.length, label.length) * fontSize * 0.8;
        if (formula) {
            return new shapes.standard.HeaderedRectangle({
                id,
                size: { width, height: 60 },
                label,
                attrs: {
                    header: {
                        stroke: `var(--compound-stroke-color)`,
                        fill: `var(--compound-fill-color)`,
                        height: 20
                    },
                    body: {
                        rx: 5,
                        ry: 5,
                        stroke: `var(--compound-stroke-color)`,
                        fill: `var(--compound-fill-color)`
                    },
                    headerText: {
                        fill: 'var(--shape-font-color)',
                        fontSize: 12,
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                        text: label,
                        refY: null,
                        y: 10
                    },
                    bodyText: {
                        fill: 'var(--shape-font-color)',
                        fontSize: 12,
                        fontFamily: 'monospace',
                        text: formula,
                        annotations: annotateFormula(formula),
                        textVerticalAnchor: 'middle',
                        y: 'calc(h / 2 + 5)',
                        refY: null
                    }
                }
            });
        } else {
            return new shapes.standard.Rectangle({
                id,
                size: { width, height: 40 },
                label,
                attrs: {
                    root: {
                        magnetSelector: 'body'
                    },
                    label: {
                        text: label,
                        fill: 'var(--shape-font-color)',
                        fontSize: 'var(--shape-font-size)',
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                        refY: null,
                        y: 'calc(h / 2)'
                    },
                    body: {
                        rx: 5,
                        ry: 5,
                        stroke: `var(--group-stroke-color)`,
                        fill: `var(--group-fill-color)`
                    }
                }
            });
        }
    },
    makeLink: function(parentElement, childElement) {
        return new shapes.standard.Link({
            source: {
                id: parentElement.id,
                anchor: { name: 'bottom', args: { dy: 2 }}
            },
            target: {
                id: childElement.id,
                anchor: { name: 'top', args: { dy: -2 }}
            },
            z: -1,
            attrs: {
                line: {
                    targetMarker: null
                }
            }
        });
    },
    children: (root) => root.children
});

// Create paper and populate the graph.
// ------------------------------------

const paper = new dia.Paper({
    model: graph,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    defaultAnchor: {
        name: 'perpendicular'
    },
    defaultConnector: {
        name: 'rounded'
    },
    interactive: false,
    overflow: true
});

const scroller = new ui.PaperScroller({
    paper,
    contentOptions: {
        useModelGeometry: true
    }
});

document.getElementById('paper').appendChild(scroller.el);
scroller.render().center();

paper.on('paper:pinch', (evt, ox, oy, scale) => {
    evt.preventDefault();
    scroller.zoom(scale - 1, { min: 0.2, max: 5, ox, oy });
});

paper.on('paper:pan', (evt, tx, ty) => {
    evt.preventDefault();
    scroller.el.scrollLeft += tx;
    scroller.el.scrollTop += ty;
});

paper.on('blank:pointerdown', (evt) => {
    scroller.startPanning(evt);
});

graph.resetCells(cells);
const rootElement = graph.getCell('organic-compound');
const focusElement = graph.getCell('polycycle');
DirectedGraph.layout(graph, {
    setLinkVertices: true
});

selectElement(focusElement.findView(paper));
scroller.adjustPaper();
scroller.zoom(1.1);
scroller.centerElement(focusElement, { useModelGeometry: true });

const dialogTypes = {
    Neighbors: 'neighbors',
    Successors: 'successors',
    Predecessors: 'predecessors',
    Siblings: 'siblings',
    PathFromElement: 'path-to-element'
};

const dialogTitles = {
    [dialogTypes.Neighbors]: 'Neighbors',
    [dialogTypes.Successors]: 'Successors',
    [dialogTypes.Predecessors]: 'Predecessors',
    [dialogTypes.Siblings]: 'Siblings',
    [dialogTypes.PathFromElement]: 'Path from Element'
};

function createDialog(name, getContent, options = {}) {
    const {
        x = '0',
        y = '0',
        width = 300,
        height = 200,
        title = dialogTitles[name],
        select = null
    } = options;
    const dialogGraph = new dia.Graph({}, { cellNamespace: shapes });
    const dialogPaper = new dia.Paper({
        model: dialogGraph,
        width: '100%',
        height,
        async: true,
        autoFreeze: true,
        cellViewNamespace: shapes,
        background: { color: '#fff' },
        interactive: false,
        sorting: dia.Paper.sorting.APPROX,
        clickThreshold: 10
    });

    dialogPaper.el.style.border = '1px solid lightgray';
    dialogPaper.el.style.boxSizing = 'border-box';

    // Export the dialog paper to SVG
    dialogPaper.on('blank:pointerclick', () => {
        dialogPaper.toSVG(
            function(svg, error) {
                if (error) {
                    console.error(error.message);
                }
                new ui.Lightbox({
                    title,
                    image: 'data:image/svg+xml,' + encodeURIComponent(svg),
                    downloadable: true,
                    fileName: 'Rappid'
                }).open();
            },
            {
                backgroundColor: 'white',
                preserveDimensions: true,
                useComputedStyles: false,
                stylesheet: `
                  :root {
                      --selection-color: #cad8e3;
                      --compound-stroke-color: none;
                      --compound-fill-color: transparent;
                      --group-stroke-color: none;
                      --group-fill-color: transparent;
                      --shape-font-color: #ed2637;
                  }
              `
            }
        );
    });
    // Scroll to the element in the main paper
    dialogPaper.on('element:pointerclick', (elementView) => {
        const sourceElement = graph.getCell(elementView.model.get('sourceId'));
        if (!sourceElement) return;
        scroller.scrollToElement(sourceElement, {
            animation: true
        });
        selectElement(sourceElement.findView(paper));
    });

    // Update the dialog paper content (graph cells)
    const updateDialogPaper = () => {
        if (!selectedElement) {
            dialogGraph.resetCells([]);
            return;
        }
        const selectValue = dialogSelect ? dialogSelect.getSelectionValue() : null;
        const content = getContent(selectedElement, graph, selectValue);
        resetDialogContent(graph, dialogPaper, content, selectedElement);
    };
    // Create the dialog HTML content
    const dialogPaperContainer = document.createElement('div');
    dialogPaperContainer.appendChild(dialogPaper.el);
    let dialogSelect;
    if (select) {
        dialogSelect = new ui.SelectBox({
            ...select,
            width
        });
        dialogSelect.render();
        dialogSelect.on('option:select', () => updateDialogPaper());
        dialogPaperContainer.appendChild(dialogSelect.el);
    }
    // Create the dialog
    const dialog = new ui.Dialog({
        content: dialogPaperContainer,
        title,
        modal: false,
        width: width + 20,
        draggable: true
    });
    dialog.on('close', () => {
        dialogPaper.remove();
        if (dialogSelect) {
            dialogSelect.remove();
        }
        dialogs[name] = null;
        updateButtons();
    });
    dialog.open();
    // add to the dialogs map
    dialogs[name] = dialog;
    // Position the dialog (an API for this is needed)
    const dialogForeground = dialog.el.querySelector('.fg');
    dialogForeground.style.left = x;
    dialogForeground.style.top = y;
    dialogForeground.style.margin = '0';

    // content
    updateDialogPaper();
    dialog.listenTo(paper, 'selection:change', () => updateDialogPaper());
    return dialog;
}

function getDialog(name) {
    return dialogs[name] || null;
}

function getActiveDialogNames() {
    return Object.keys(dialogs).filter((name) => dialogs[name]);
}

function resetDialogContent(sourceGraph, targetPaper, elements, sourceElement) {
    const targetGraph = targetPaper.model;
    if (elements.length === 0) {
        targetGraph.resetCells([
            {
                type: 'standard.Rectangle',
                size: { width: 100, height: 40 },
                attrs: {
                    label: {
                        fontFamily: 'monospace',
                        text: 'Not found'
                    },
                    body: {
                        stroke: 'none',
                        fill: 'none'
                    }
                }
            }
        ]);
    } else {
        const cloneMap = sourceGraph.cloneSubgraph(elements);
        Object.keys(cloneMap).forEach((sourceId) => {
            cloneMap[sourceId].set('sourceId', sourceId);
        });
        const targetElement = cloneMap[sourceElement.id];
        targetGraph.resetCells(Object.values(cloneMap));
        layoutGraph(targetGraph);
        highlighters.mask.add(
            targetElement.findView(targetPaper),
            'body',
            'selection-frame',
            {
                padding: 1,
                attrs: {
                    stroke: 'var(--selection-color)',
                    'stroke-width': 3
                }
            }
        );
    }
    targetPaper.transformToFitContent({
        useModelGeometry: true,
        padding: 10,
        verticalAlign: 'middle',
        horizontalAlign: 'middle',
        maxScale: 1.5
    });
}

function layoutGraph(graph) {
    graph.getLinks().forEach((link) => link.vertices([]));
    DirectedGraph.layout(graph);
}

paper.on('element:pointerdown', (elementView) => {
    selectElement(elementView);
});

function selectElement(elementView) {
    const { model: element, paper } = elementView;
    selectedElement = element;
    highlighters.mask.removeAll(paper, 'selection-frame');
    highlighters.mask.add(elementView, 'root', 'selection-frame', {
        deep: true,
        attrs: {
            stroke: 'var(--selection-color)',
            'stroke-width': 3
        }
    });
    paper.trigger('selection:change', element);
}

// Dialog buttons

const dialogsButtons = new ui.SelectButtonGroup({
    options: Object.values(dialogTypes).map((name) => {
        return {
            content: dialogTitles[name],
            value: name
        };
    }),
    multi: true
});

dialogsButtons.render();
document.getElementById('toolbar').appendChild(dialogsButtons.el);

dialogsButtons.on('option:select', (selectedOptions, _, opt) => {
    if (!opt.ui) return;
    const activeDialogNames = selectedOptions.map((option) => option.value);
    toggleDialogs(activeDialogNames);
});

toggleDialogs([
    dialogTypes.Successors,
    dialogTypes.Neighbors,
    dialogTypes.Predecessors
]);

function updateButtons() {
    dialogsButtons.deselect();
    dialogsButtons.selectByValue(getActiveDialogNames());
}

// Toggle dialogs

function toggleDialogs(activeDialogNames) {
    // Successors
    toggleSuccessors(activeDialogNames.includes(dialogTypes.Successors));
    // Neighbors
    toggleNeighbors(activeDialogNames.includes(dialogTypes.Neighbors));
    // Predecessors
    togglePredecessors(activeDialogNames.includes(dialogTypes.Predecessors));
    // Path from element
    togglePathFromElement(
        activeDialogNames.includes(dialogTypes.PathFromElement)
    );
    // Siblings
    toggleSiblings(activeDialogNames.includes(dialogTypes.Siblings));
    // update buttons
    updateButtons();
}

function toggleNeighbors(active) {
    const dialog = getDialog(dialogTypes.Neighbors);
    if (active) {
        if (dialog) return;
        createDialog(dialogTypes.Neighbors, getNeighbors, {
            x: 'calc(100% - 340px)',
            y: '620px',
            select: {
                openPolicy: 'coverAbove',
                options: [
                    {
                        content: 'Depth 1',
                        value: 1
                    },
                    {
                        content: 'Depth 2',
                        value: 2
                    },
                    {
                        content: 'Any Depth',
                        value: Infinity
                    }
                ]
            }
        });
    } else {
        if (!dialog) return;
        dialog.close();
    }
}

function toggleSuccessors(active) {
    const dialog = getDialog(dialogTypes.Successors);
    if (active) {
        if (dialog) return;
        createDialog(dialogTypes.Successors, getSuccessors, {
            x: 'calc(100% - 340px)',
            y: '20px',
            select: {
                openPolicy: 'coverAbove',
                options: [
                    {
                        content: 'Depth 1',
                        value: 1
                    },
                    {
                        content: 'Depth 2',
                        value: 2
                    },
                    {
                        content: 'Any Depth',
                        value: Infinity
                    }
                ]
            }
        });
    } else {
        if (!dialog) return;
        dialog.close();
    }
}

function togglePredecessors(active) {
    const dialog = getDialog(dialogTypes.Predecessors);
    if (active) {
        if (dialog) return;
        createDialog(dialogTypes.Predecessors, getPredecessors, {
            x: 'calc(100% - 340px)',
            y: '320px',
            select: {
                openPolicy: 'coverAbove',
                options: [
                    {
                        content: 'Depth 1',
                        value: 1
                    },
                    {
                        content: 'Depth 2',
                        value: 2
                    },
                    {
                        content: 'Any Depth',
                        value: Infinity
                    }
                ]
            }
        });
    } else {
        if (!dialog) return;
        dialog.close();
    }
}

function togglePathFromElement(active) {
    const dialog = getDialog(dialogTypes.PathFromElement);
    if (active) {
        if (dialog) return;
        createDialog(dialogTypes.PathFromElement, getPathFromElement, {
            x: '20px',
            y: '240px',
            width: 200,
            height: 400,
            select: {
                openPolicy: 'coverAbove',
                options: util.sortBy(
                    graph.getElements().map((element) => {
                        return {
                            content: element.get('label'),
                            value: element.id,
                            selected: element.id === rootElement.id
                        };
                    }),
                    'content'
                )
            }
        });
    } else {
        if (!dialog) return;
        dialog.close();
    }
}

function toggleSiblings(active) {
    const dialog = getDialog(dialogTypes.Siblings);
    if (active) {
        if (dialog) return;
        createDialog(dialogTypes.Siblings, getSiblings, {
            x: '20px',
            y: '60px',
            width: 400,
            height: 100
        });
    } else {
        if (!dialog) return;
        dialog.close();
    }
}

// Get content elements for the dialogs

function getNeighbors(element, graph, depth) {
    const neighbors = [
        ...getSuccessors(element, graph, depth),
        ...getPredecessors(element, graph, depth)
    ];
    return neighbors;
}

function getPredecessors(element, graph, depth) {
    const predecessors = [];
    graph.search(
        element,
        (el, distance) => {
            if (distance > depth) return false;
            predecessors.push(el);
            return true;
        },
        { inbound: true }
    );
    return predecessors;
}

function getSuccessors(element, graph, depth) {
    const successors = [];
    graph.search(
        element,
        (el, distance) => {
            if (distance > depth) return false;
            successors.push(el);
            return true;
        },
        { outbound: true }
    );
    return successors;
}

function getPathFromElement(element, graph, rootId = 'Xa') {
    const result = alg.Dijkstra(graphUtils.toAdjacencyList(graph), rootId);
    const pathElements = [];
    let current = element.id;
    while (current !== rootId) {
        const next = result[current];
        if (!next) break;
        pathElements.push(graph.getCell(next));
        current = next;
    }
    if (pathElements.length > 0) {
        return [element, ...pathElements];
    }
    return pathElements;
}

function getSiblings(element, graph) {
    const siblings = [element];
    const parents = graph.getNeighbors(element, { inbound: true });
    parents.forEach((parent) => {
        // it's ok here if the same element is pushed multiple times
        siblings.push(...graph.getNeighbors(parent, { outbound: true }));
    });
    return util.sortBy(siblings, 'attributes.label');
}

// Utilities

function annotateFormula(formula) {
    const matches = formula.matchAll(/[\dR-]/g);
    const annotations = [];
    for (const match of matches) {
        const attrs = {};
        if (match.at(0) === 'R') {
            attrs['fill'] = '#ED2637';
        } else if (match.at(0) === '-') {
            attrs['fill'] = '#F9B4B9';
        } else {
            attrs['baseline-shift'] = 'sub';
        }
        annotations.push({
            start: match.index,
            end: match.index + 1,
            attrs
        });
    }
    return annotations;
}
