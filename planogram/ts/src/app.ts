import { dia, layout, shapes, ui } from '@joint/plus';
import { ShelfElement, ProductElement, getAllProducts, getAllShelves, ProductCategories, storeItemsConfig } from './shapes';
import { addElementTools, removeElementTools } from './tools';
import { validateChangePosition, validateChangeSize, isSizeValid, isPositionValid } from './validators';
import exampleGraph from '../assets/example.json';

const { grid } = storeItemsConfig;

let selectedCellView: dia.CellView = null;

export const init = (): void => {

    const canvasElement = document.getElementById('canvas') as HTMLDivElement;
    const stencilElement = document.getElementById('products-stencil') as HTMLDivElement;
    const shelvesStencilElement = document.getElementById('shelves-stencil') as HTMLDivElement;

    const graph = new dia.Graph({}, { cellNamespace: shapes });

    const paper = new dia.Paper({
        width: 25 * grid,
        height: 20 * grid,
        model: graph,
        gridSize: grid,
        drawGrid: { name: 'mesh', color: '#d4d4d4' },
        background: { color: '#FBFBFB' },
        embeddingMode: true,
        moveThreshold: 10,
        clickThreshold: 10,
        validateEmbedding: function(childView, parentView) {
            if (childView.model instanceof ShelfElement) {
                return false;
            }
            if (parentView.model instanceof ProductElement) {
                return false;
            }
            return true;
        },
        frontParentOnly: true,
        findParentBy: (elementView: dia.ElementView) => {
            const area = elementView.model.getBBox();
            return graph.findModelsInArea(area).filter((model: dia.Element) => {
                if (model instanceof ProductElement) {
                    return true;
                }
                return model.getBBox().containsRect(area);
            });
        },
        async: true,
        sorting: dia.Paper.sorting.APPROX,
        cellViewNamespace: shapes,
        highlighting: {
            embedding: {
                name: 'stroke',
                options: {
                    layer: 'front',
                    padding: 0,
                    attrs: {
                        'stroke': '#0058FF',
                        'stroke-width': 3
                    }
                }
            }
        },
        interactive: ({ model }) => {
            const isChildOfSelectedElement = selectedCellView
                ? model.isEmbeddedIn(selectedCellView.model)
                : false;
            return {
                stopDelegation: !isChildOfSelectedElement
            };
        }
    });

    const scroller = new ui.PaperScroller({
        paper,
        autoResizePaper: true,
        cursor: 'grab',
        baseWidth: 25 * grid,
        baseHeight: 20 * grid,
        scrollWhileDragging: true,
        borderless: true,
        padding: 300
    });

    canvasElement.appendChild(scroller.render().el);

    const commandManager = new dia.CommandManager({
        graph
    });

    const validator = new dia.Validator({
        commandManager,
        cancelInvalid: true
    });

    const createStencilGroups = (): Record<string, ui.Stencil.Group> => {

        const { products } = storeItemsConfig;
        const groups: { [key: string]: any } = {};
        const getLayoutOptions = (columnsCount: number): layout.GridLayout.Options => {
            return {
                columns: columnsCount,
                columnWidth: 200 / columnsCount,
                rowHeight: 'compact'
            };
        };

        Object.keys(products).forEach((categoryName: string, idx: number) => {
            const maxWidth = products[categoryName].reduce(
                (acc, product) => Math.max(acc, product.width),
                0
            );
            groups[categoryName] = {
                layout: getLayoutOptions(5 - maxWidth),
                closed: idx > 3,
                index: idx + 1,
                label: (ProductCategories as any)[categoryName].toLowerCase()
            };
        });

        return groups;
    };

    const getStencilPaperOptions = () => {
        return {
            model: new dia.Graph({}, { cellNamespace: shapes }),
            sorting: dia.Paper.sorting.NONE,
            cellViewNamespace: shapes
        };
    };

    const productsStencil = new ui.Stencil({
        paper: scroller,
        width: 240,
        scaleClones: true,
        dropAnimation: true,
        usePaperGrid: true,
        theme: 'modern',
        groups: createStencilGroups(),
        paperOptions: () => getStencilPaperOptions(),
        layout: (groupGraph: dia.Graph, group: ui.Stencil.Group) => {
            return layout.GridLayout.layout(groupGraph, {
                marginY: 20,
                marginX: 20,
                rowGap: 20,
                ...group.layout as object
            } as layout.GridLayout.Options);
        },
        search: (product: ProductElement, keyword: string, group: string): boolean => {
            return product.match(group, keyword);
        }
    });

    stencilElement.appendChild(productsStencil.el);
    productsStencil.render();
    productsStencil.load(getAllProducts());

    const shelvesStencil = new ui.Stencil({
        paper: scroller,
        width: 340,
        height: 850,
        scaleClones: true,
        dropAnimation: true,
        usePaperGrid: true,
        theme: 'modern',
        layout: false,
        paperOptions: () => getStencilPaperOptions()
    });

    shelvesStencilElement.appendChild(shelvesStencil.el);
    shelvesStencil.render();
    shelvesStencil.load(getAllShelves());

    graph.fromJSON(exampleGraph);
    scroller.centerContent({ useModelGeometry: true });

    // Register Events

    validator.validate('change:position', validateChangePosition(graph));

    validator.validate('change:size', validateChangeSize(graph));

    validator.on('invalid', (err: { cell: dia.Cell, msg: string }): void => {
        const cellView = err.cell.findView(paper);
        if (cellView) {
            cellView.vel.removeClass('invalid');
        }
    });

    graph.on({
        'batch:stop': (batch: Record<string, any>): void => {
            const { cell, batchName } = batch;
            if (batchName !== 'resize') return;
            const cellView = cell.findView(paper);
            cellView.vel.toggleClass('invalid', !isSizeValid(graph, cell));
        }
    });

    paper.on({
        'blank:pointerdown': (evt: dia.Event): void => {
            unsetElement(paper);
            scroller.startPanning(evt);
        },
        'element:pointermove': (elementView: dia.ElementView, evt: dia.Event): void => {
            const { data } = evt;
            if (!data.moved) {
                data.currentCellView = elementView.getDelegatedView();
                data.moved = true;
                unsetElement(paper);
            }
            const delegatedView = data.currentCellView;
            delegatedView.vel.toggleClass('invalid', !isPositionValid(graph, delegatedView.model));
        },
        'element:pointerup': (elementView: dia.ElementView, evt: dia.Event): void => {
            if (evt.data.moved) {
                setElement(evt.data.currentCellView);
            } else {
                setElement(elementView);
            }
        },
        'element:pointerdblclick': (elementView: dia.ElementView): void => {
            const { model: element } = elementView;
            const parent = element.getParentCell();
            if (parent) {
                setElement(parent.findView(paper));
            }
        }
    });

    const stencilEventMap = (stencil: ui.Stencil) => {
        return {
            'element:dragstart': function() {
                unsetElement(paper);
            },
            'element:drag': function(cloneView: dia.ElementView, evt: dia.Event, _dropArea: dia.BBox, validDropTarget: boolean) {
                if (validDropTarget) {
                    cloneView.vel.toggleClass('invalid', !isPositionValid(graph, cloneView.model));
                    cloneView.vel.removeAttr('opacity');
                } else {
                    cloneView.vel.removeClass('invalid');
                    cloneView.vel.attr('opacity', 0.5);
                }
            },
            'element:dragend': function(cloneView: dia.ElementView, _evt: dia.Event) {
                if (cloneView.vel.hasClass('invalid')) {
                    stencil.cancelDrag({ dropAnimation: true });
                }
            },
            'element:drop': function(elementView: dia.ElementView) {
                setElement(elementView);
            }
        };
    };

    productsStencil.on(stencilEventMap(productsStencil));
    shelvesStencil.on(stencilEventMap(shelvesStencil));
};

const setElement = (cellView: dia.CellView): void => {
    selectedCellView = cellView;
    addElementTools(cellView);
};

const unsetElement = (paper: dia.Paper): void => {
    selectedCellView = null;
    removeElementTools(paper);
};
