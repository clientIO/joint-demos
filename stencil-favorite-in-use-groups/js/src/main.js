import { dia, ui, shapes, util, layout, highlighters, elementTools } from '@joint/plus';
import './styles.scss';

const StencilGroup = {
    UsedShapes: 'used-shapes',
    FavoriteShapes: 'favorite-shapes',
    SymbolShapes: 'symbol-shapes'
};

class Placeholder extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'Placeholder',
            position: { x: 10, y: 10 },
            attrs: {
                root: {
                    style: 'cursor:default'
                },
                body: {
                    class: 'jj-placeholder-body',
                    fill: 'transparent',
                    x: 0,
                    y: 0,
                    width: 'calc(w)',
                    height: 'calc(h)'
                },
                label: {
                    class: 'jj-placeholder-label',
                    fontSize: 14,
                    fontFamily: 'sans-serif',
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    x: 'calc(w/2)',
                    y: 'calc(h/2)'
                }
            }
        };
    }

    static isPlaceholder(element) {
        return element.get('type') === 'Placeholder';
    }

    preinitialize() {
        this.markup = [
            {
                tagName: 'rect',
                selector: 'body'
            },
            {
                tagName: 'text',
                selector: 'label'
            }
        ];
    }
}

const favoriteShapesPlaceholder = new Placeholder({
    size: {
        width: 200,
        height: 80
    },
    attrs: {
        body: {
            strokeWidth: 2,
            strokeDasharray: '5,5',
            stroke: '#87A7C0'
        },
        label: {
            text: 'Drop your\nelement here.',
            fill: '#87A7C0'
        }
    }
});

const usedShapesPlaceholder = new Placeholder({
    size: {
        width: 180,
        height: 40
    },
    attrs: {
        label: {
            text: 'There are no shapes\nin the diagram yet.',
            fill: '#87A7C0'
        }
    }
});

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 1,
    async: true,
    clickThreshold: 10,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: '#dde6ed' },
    defaultConnectionPoint: {
        name: 'boundary',
        args: {
            selector: false
        }
    },
    defaultLink: () =>
        new shapes.standard.Link({
            attrs: {
                line: {
                    stroke: '#131e29'
                }
            }
        }),
    linkPinning: false,
    highlighting: {
        connecting: {
            name: 'mask',
            options: {
                attrs: {
                    stroke: '#0075f2',
                    'stroke-width': 2
                }
            }
        }
    }
});

document.getElementById('paper-container').appendChild(paper.el);

const stencil = new ui.Stencil({
    paper,
    usePaperGrid: true,
    width: 100,
    height: '100%',
    dropAnimation: true,
    paperOptions: () => {
        return {
            model: new dia.Graph({}, { cellNamespace: shapes }),
            cellViewNamespace: shapes,
            background: {
                color: '#FFFFFF'
            },
            overflow: true
        };
    },
    search: (cell, keyword) => {
        if (keyword === '') return true;
        if (Placeholder.isPlaceholder(cell)) {
            if (cell === usedShapesPlaceholder) return false;
            return true;
        }
        const keywords = cell.get('keywords') || [];
        return keywords.some(
            (kw) => kw.toLowerCase().indexOf(keyword.toLowerCase()) >= 0
        );
    },
    dragStartClone: (cell) => {
        const dragClone = cell.clone();
        dragClone.attr(['body', 'fill'], '#dde6ed');
        // Make sure the clone know which group it originally belongs to.
        // We will use this information in the `element:drag` event handler
        // to determine whether the element could be saved to the "favorite" group
        dragClone.set('group', cell.graph.get('group'));
        return dragClone;
    },
    contentOptions: {
        useModelGeometry: true
    },
    canDrag: (elementView) => {
        return !Placeholder.isPlaceholder(elementView.model);
    },
    layout: (graph, group) => {
        const groupElements = graph.getElements();
        const layoutElements = graph
            .getElements()
            .filter((element) => !Placeholder.isPlaceholder(element));
        const rowGap = 20;
        const layoutOptions = {
            columns: 3,
            rowHeight: 'compact',
            columnWidth: 75,
            horizontalAlign: 'middle',
            rowGap,
            marginY: rowGap
        };
        // If there was a placeholder element in the group make space for it
        if (groupElements.length !== layoutElements.length) {
            const { height: placeholderHeight } = favoriteShapesPlaceholder.size();
            layoutOptions.marginY = placeholderHeight + 2 * rowGap;
        }
        layout.GridLayout.layout(layoutElements, layoutOptions);
    },
    groups: {
        [StencilGroup.UsedShapes]: {
            index: 1,
            label: 'Shapes In Use'
        },
        [StencilGroup.FavoriteShapes]: {
            index: 2,
            label: 'Favorite Shapes'
        },
        [StencilGroup.SymbolShapes]: {
            index: 3,
            label: 'Symbols'
        }
    }
});

stencil.render();
stencil.el.querySelector('.search').placeholder = 'Find shapes...';

document.getElementById('stencil-container').appendChild(stencil.el);

const shapesJSON = [
    {
        type: 'standard.Rectangle',
        size: { width: 60, height: 40 },
        keywords: ['rect', 'rectangle']
    },
    {
        type: 'standard.Rectangle',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                rx: 10,
                ry: 10
            }
        },
        keywords: ['rounded', 'round', 'rectangle']
    },
    {
        type: 'standard.Circle',
        size: { width: 40, height: 40 },
        keywords: ['circle']
    },
    {
        type: 'standard.Ellipse',
        size: { width: 60, height: 40 },
        keywords: ['ellipse']
    },
    {
        // Triangle pointing up
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d: 'M calc(0.5*w) 0 calc(w) calc(h) H 0 Z'
            }
        },
        keywords: ['triangle', 'up']
    },
    {
        // Triangle pointing down
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d: 'M 0 0 L calc(w) 0 calc(0.5*w) calc(h) Z'
            }
        },
        keywords: ['triangle', 'down']
    },
    {
        // Triangle with Curved Sides
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                refD: null,
                d:
                    'M calc(w / 2) calc(h) L 0 calc(h / 2) A calc(w / 2) calc(h / 2) 0 0 1 calc(w / 2) 0 A calc(w / 2) calc(h / 2) 0 0 1 calc(w) calc(h / 2) Z'
            }
        },
        keywords: ['triangle', 'curved']
    },
    {
        // Rhombus
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d:
                    'M calc(0.5*w) 0 calc(w) calc(0.5*h) calc(0.5*w) calc(h) 0 calc(0.5*h) Z'
            }
        },
        keywords: ['rhombus']
    },
    {
        // Pentagon
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d: `
                    M calc(0.75*w) 0
                    L calc(w) calc(0.5*h)
                    L calc(0.5*w) calc(h)
                    L 0 calc(0.5*h)
                    L calc(0.25*w) 0
                    Z
                `
            }
        },
        keywords: ['pentagon']
    },
    {
        // Hexagon
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d:
                    'M 0 calc(0.5*h) L calc(0.25*w) 0 calc(0.75*w) 0 calc(w) calc(0.5*h) calc(0.75*w) calc(h) calc(0.25*w) calc(h) Z'
            }
        },
        keywords: ['hexagon']
    },
    {
        // Octagon
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d:
                    'M calc(0.3*w) 0 L calc(0.7*w) 0 calc(w) calc(0.3*h) calc(w) calc(0.7*h) calc(0.7*w) calc(h) calc(0.3*w) calc(h) 0 calc(0.7*h) 0 calc(0.3*h) Z'
            }
        },
        keywords: ['octagon']
    },
    {
        // Parallelogram
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d: `
                    M calc(0.3*w) 0
                    L calc(w) 0
                    L calc(0.7*w) calc(h)
                    L 0 calc(h)
                    Z
                `
            }
        },
        keywords: ['parallelogram']
    },
    {
        // Trapezoid
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d: `
                    M calc(0.2*w) 0
                    L calc(0.8*w) 0
                    L calc(w) calc(h)
                    L 0 calc(h)
                    Z
                `
            }
        },
        keywords: ['trapezoid']
    },
    {
        // Star
        type: 'standard.Path',
        size: { width: 40, height: 40 },
        attrs: {
            body: {
                d: `
                    M calc(0.5*w) 0
                    L calc(0.61*w) calc(0.25*h)
                    L calc(w) calc(0.3*h)
                    L calc(0.7*w) calc(0.5*h)
                    L calc(0.75*w) calc(0.79*h)
                    L calc(0.5*w) calc(0.65*h)
                    L calc(0.25*w) calc(0.79*h)
                    L calc(0.3*w) calc(0.5*h)
                    L 0 calc(0.3*h)
                    L calc(0.39*w) calc(0.25*h)
                    Z
                `
            }
        },
        keywords: ['star']
    },
    {
        // Cross
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d: `
                    M calc(0.3*w) 0
                    L calc(0.7*w) 0
                    V calc(0.3*h)
                    L calc(w) calc(0.3*h)
                    L calc(w) calc(0.7*h)
                    H calc(0.7*w)
                    L calc(0.7*w) calc(h)
                    L calc(0.3*w) calc(h)
                    V calc(0.7*h)
                    L 0 calc(0.7*h)
                    L 0 calc(0.3*h)
                    H calc(0.3*w)
                    Z
                `
            }
        },
        keywords: ['cross']
    },
    {
        // Arrow
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d: `
                    M 0 calc(0.5*h)
                    L calc(0.5*w) 0
                    L calc(w) calc(0.5*h)
                    L calc(0.8*w) calc(0.5*h)
                    L calc(0.8*w) calc(h)
                    L calc(0.2*w) calc(h)
                    L calc(0.2*w) calc(0.5*h)
                    Z
                `
            }
        },
        keywords: ['arrow']
    },
    {
        // Pentagon with Curved Sides
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d: `
                    M 0 calc(0.62*h)
                    Q calc(0.2*w) calc(0.15*h) calc(0.5*w) 0
                    Q calc(0.8*w) calc(0.15*h) calc(w) calc(0.62*h)
                    L calc(0.77*w) calc(h)
                    L calc(0.23*w) calc(h)
                    Z
                `
            }
        },
        keywords: ['pentagon', 'curved']
    },
    {
        // Right-Angle Triangle
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                strokeLinejoin: 'butt',
                d: 'M 0 calc(h) L calc(w) calc(h) L 0 0 Z'
            }
        },
        keywords: ['triangle', 'right-angle']
    },
    {
        // L-shape 1
        type: 'standard.Path',
        size: { width: 40, height: 40 },
        attrs: {
            body: {
                d:
                    'M 0 0 L calc(w/2) 0 L calc(w/2) calc(h/2) L calc(w) calc(h/2) L calc(w) calc(h) L 0 calc(h) Z'
            }
        },
        keywords: ['l-shape']
    },
    {
        // L-shape 2
        type: 'standard.Path',
        size: { width: 40, height: 40 },
        attrs: {
            body: {
                d:
                    'M 0 0 L calc(w) 0 L calc(w) calc(h/2) L calc(w/2) calc(h/2) L calc(w/2) calc(h) L 0 calc(h) Z'
            }
        },
        keywords: ['l-shape']
    },
    {
        // L-shape 3
        type: 'standard.Path',
        size: { width: 40, height: 40 },
        attrs: {
            body: {
                d:
                    'M 0 0 L calc(w) 0 L calc(w) calc(h) L calc(w/2) calc(h) L calc(w/2) calc(h/2) L 0 calc(h/2) Z'
            }
        },
        keywords: ['l-shape']
    },
    {
        // L-shape 4
        type: 'standard.Path',
        size: { width: 40, height: 40 },
        attrs: {
            body: {
                d:
                    'M calc(w / 2) 0 L calc(w) 0 L calc(w) calc(h) L 0 calc(h) L 0 calc(h / 2) L calc(w / 2) calc(h / 2) Z'
            }
        },
        keywords: ['l-shape']
    },
    {
        // U-shape 1
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d:
                    'M 0 0 calc(w / 3) 0 calc(w / 3) calc(h / 2) calc(2 * w / 3) calc(h / 2) calc(2 * w / 3) 0 calc(w) 0 calc(w) calc(h) 0 calc(h) Z'
            }
        },
        keywords: ['u-shape']
    },
    {
        // U-shape 2
        type: 'standard.Path',
        size: { width: 60, height: 40 },
        attrs: {
            body: {
                d:
                    'M 0 0 0 calc(h) calc(w / 3) calc(h) calc(w / 3) calc(h / 2) calc(2 * w / 3) calc(h / 2) calc(2 * w / 3) calc(h) calc(w) calc(h) calc(w) 0 Z'
            }
        },
        keywords: ['u-shape']
    }
];

const shapesJSONMap = {};

shapesJSON.forEach((shapeJSON, index) => {
    // Add unique key to the elements in the all groups
    // We can not use the `type` as a unique key because
    // the same type can be used in more than one instance
    shapeJSON.uniqueKey = index + 1;
    // Note: we use `util.setByPath` instead of `shapeJSON.attrs.body.d = ...`
    // because the `attrs` object can be empty and we need to create it first
    // Title
    util.setByPath(
        shapeJSON,
        ['attrs', 'root', 'title'],
        String(shapeJSON.keywords)
    );
    // Selectors
    util.setByPath(shapeJSON, ['attrs', 'root', 'magnetSelector'], 'body');
    util.setByPath(shapeJSON, ['attrs', 'root', 'highlighterSelector'], 'body');
    // Color
    util.setByPath(shapeJSON, ['attrs', 'body', 'stroke'], '#ed2637');
    util.setByPath(shapeJSON, ['attrs', 'body', 'strokeWidth'], 1);
    // Add shape to the map
    shapesJSONMap[shapeJSON.uniqueKey] = shapeJSON;
});

stencil.load({
    // `UsedShapes` group is populated automatically
    // by the `resetInUseStencilElements` function
    //
    // `FavoriteShapes` group is populated from the local storage
    //
    [StencilGroup.SymbolShapes]: [...shapesJSON]
});

// Whenever a new element is added or removed from the graph
// we need to update the `UsedShapes` group
graph.on('add remove', (cell) => {
    if (cell.isLink()) return;
    resetUsedShapes(graph, stencil);
});
// In case the graph is reset, we also update the `UsedShapes` group
graph.on('reset', () => resetUsedShapes(graph, stencil));

const placeholderPaper = stencil.getPaper(StencilGroup.FavoriteShapes);
const placeholderGraph = stencil.getGraph(StencilGroup.FavoriteShapes);

// Add remove button to the elements in the "saved" group

placeholderGraph.on('reset', () => {
    addToolsToStencilFavoriteGroup(
        stencil,
        placeholderPaper,
        placeholderGraph.getElements()
    );
});

stencil.on('filter', (filteredGraph, group) => {
    if (group !== StencilGroup.FavoriteShapes) return;
    addToolsToStencilFavoriteGroup(
        stencil,
        placeholderPaper,
        filteredGraph.getElements()
    );
});

function addToolsToStencilFavoriteGroup(stencil, favoriteGroupPaper, elements) {
    placeholderPaper.removeTools();
    elements.forEach((element) => {
        if (Placeholder.isPlaceholder(element)) return;
        const toolsView = new dia.ToolsView({
            tools: [
                new elementTools.Remove({
                    useModelGeometry: true,
                    x: 'calc(w - 10)',
                    y: 'calc(h + 10)',
                    action: () => removeFavoriteElement(element, stencil)
                })
            ]
        });
        favoriteGroupPaper.findViewByModel(element).addTools(toolsView);
    });
}

// Add remove button to the elements in the main paper

paper.on('element:pointerclick', (elementView) => {
    paper.removeTools();
    const toolsView = new dia.ToolsView({
        tools: [
            new elementTools.Boundary({
                useModelGeometry: true
            }),
            new elementTools.Connect({
                useModelGeometry: true,
                x: 'calc(w + 10)',
                y: 'calc(h / 2)'
            }),
            new elementTools.Remove({
                useModelGeometry: true,
                x: -10,
                y: -10
            })
        ]
    });
    elementView.addTools(toolsView);
});

paper.on('blank:pointerdown', () => {
    paper.removeTools();
});

// Add drag & drop functionality for the elements to be dropped into the "saved" group

const favoriteGroupEl = stencil.el.querySelector(
    '.group[data-name="favorite-shapes"]'
);

stencil.on('element:drag', (dragView, evt, cloneArea, validArea) => {
    evt.data.save = false;
    highlighters.addClass.removeAll(placeholderPaper, 'hgl-favorite');
    if (validArea) return;
    if (dragView.model.get('group') === StencilGroup.FavoriteShapes) return;
    if (stencil.isGroupOpen(StencilGroup.FavoriteShapes)) {
        const placeholderArea = placeholderPaper.clientToLocalRect(
            paper.localToClientRect(cloneArea)
        );
        if (placeholderArea.intersect(favoriteShapesPlaceholder.getBBox())) {
            evt.data.save = true;
            highlighters.addClass.add(
                favoriteShapesPlaceholder.findView(placeholderPaper),
                'root',
                'hgl-favorite',
                {
                    className: 'jj-hgl-favorite'
                }
            );
        }
    } else {
        if (evt.target.matches('.group-label')) {
            const groupEl = evt.target.closest('.group');
            if (groupEl === favoriteGroupEl) {
                evt.data.save = true;
                favoriteGroupEl.classList.add('group-hgl-favorite');
                return;
            }
        }
        favoriteGroupEl.classList.remove('group-hgl-favorite');
    }
});

stencil.on('element:dragend', (dragView, evt) => {
    favoriteGroupEl.classList.remove('group-hgl-favorite');
    highlighters.addClass.removeAll(placeholderPaper);
    if (!evt.data.save) return;
    addFavoriteElement(dragView.model, stencil);
    stencil.cancelDrag({ dropAnimation: false });
});

// Functions

// Reset the "used" group based on the current elements in the graph
function resetUsedShapes(graph, stencil) {
    const usedElementsKeys = Object.keys(
        util.groupBy(graph.getElements(), getElementUniqueKey)
    );
    const usedElements = [...mapUniqueKeysToShapes(usedElementsKeys)];
    if (usedElements.length === 0) {
        usedElements.push(usedShapesPlaceholder);
    }
    stencil.load({ [StencilGroup.UsedShapes]: usedElements });
}

// Get unique key of the element
// The key is used to identify whether the element is already in the "favorite" or "used" group
function getElementUniqueKey(element) {
    return element.get('uniqueKey');
}

// Add an element to the "favorite" group
function addFavoriteElement(element, stencil) {
    const favoriteShapeKeys = readFavoriteShapesUniqueKeys();
    const elementUniqueKey = getElementUniqueKey(element);
    if (favoriteShapeKeys.includes(elementUniqueKey)) return;
    const favoriteShapes = mapUniqueKeysToShapes([
        ...favoriteShapeKeys,
        elementUniqueKey
    ]);
    stencil.load({
        [StencilGroup.FavoriteShapes]: [
            favoriteShapesPlaceholder,
            ...favoriteShapes
        ]
    });
    saveFavoriteShapes();
    refreshStencilSearch(stencil);
}

// Remove an element from the "favorite" group
function removeFavoriteElement(element, stencil) {
    const elementUniqueKey = getElementUniqueKey(element);
    const favoriteShapes = mapUniqueKeysToShapes(
        readFavoriteShapesUniqueKeys().filter((id) => id !== elementUniqueKey)
    );
    stencil.load({
        [StencilGroup.FavoriteShapes]: [
            favoriteShapesPlaceholder,
            ...favoriteShapes
        ]
    });
    saveFavoriteShapes();
    refreshStencilSearch(stencil);
}

// Save favorite shapes to local storage
// We only keep an array of unique keys of the elements
function saveFavoriteShapes() {
    const favoriteShapes = stencil
        .getGraph(StencilGroup.FavoriteShapes)
        .getElements()
        .filter((element) => !Placeholder.isPlaceholder(element))
        .map((element) => element.get('uniqueKey'));
    localStorage.setItem('favoriteShapes', JSON.stringify(favoriteShapes));
}

function loadFavoriteShapes() {
    const favoriteShapes = mapUniqueKeysToShapes(readFavoriteShapesUniqueKeys());
    stencil.load({
        [StencilGroup.FavoriteShapes]: [
            favoriteShapesPlaceholder,
            ...favoriteShapes
        ]
    });
}

// Rad favorite shapes from the local storage
function readFavoriteShapesUniqueKeys() {
    return JSON.parse(localStorage.getItem('favoriteShapes')) || [];
}

// Map unique keys to the shapes JSON
function mapUniqueKeysToShapes(shapeUniqueKeys) {
    return shapeUniqueKeys
        .map((uniqueKey) => shapesJSONMap[uniqueKey])
        .filter(Boolean);
}

// Refresh the search results in the stencil
function refreshStencilSearch(stencil) {
    stencil.filter(stencil.el.querySelector('.search').value);
}

resetUsedShapes(graph, stencil);
loadFavoriteShapes();
