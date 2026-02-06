import type { dia } from '@joint/plus/index';

// Validators

export const validateChangePosition = (graph: dia.Graph) => (err: Error, command: any, next: (...args: any[]) => any): boolean => {
    if (command.options.freeTransform) {
        // Position is changed after resize
        return next(err);
    }
    const cell = graph.getCell(command.data.id) as dia.Element;
    if (!isPositionValid(graph, cell)) {
        return next({ cell, msg: 'positioning error' });
    }
    return next(err);
};

export const validateChangeSize = (graph: dia.Graph) => (err: Error, command: any, next: (...args: any[]) => any): boolean => {
    const cell = graph.getCell(command.data.id) as dia.Element;
    if (!isSizeValid(graph, cell)) {
        return next({ cell, msg: 'resizing error' });
    }
    return next(err);
};

// Checks

export const isSizeValid = (graph: dia.Graph, element: dia.Element): boolean => {
    if (element.get('type') === 'app.Shelf') {
        if (doProductsOverflow(element) || doesShelfOverlap(graph, element)) {
            return false;
        }
    } else {
        if (doesProductOverflow(graph, element) || doesProductOverlap(graph, element)) {
            return false;
        }
    }
    return true;
};

export const isPositionValid = (graph: dia.Graph, element: dia.Element): boolean => {
    if (element.get('type') === 'app.Shelf') {
        if (doesShelfOverlap(graph, element)) {
            return false;
        }
    } else {
        if (doesProductOverlap(graph, element) || doesProductOverflow(graph, element)) {
            return false;
        }
    }
    return true;
};

export const doesProductOverlap = (graph: dia.Graph, product: dia.Element): boolean => {
    const models = graph.findModelsUnderElement(product);
    if (models.length === 0) return true;
    return models.some(el => el.isEmbedded());
};

export const doesShelfOverlap = (graph: dia.Graph, shelf: dia.Element): boolean => {
    return graph.findModelsUnderElement(shelf).length > 0;
};

export const doesProductOverflow = (graph: dia.Graph, product: dia.Element): boolean => {
    let shelf = product.getParentCell();
    const productBBox = product.getBBox();
    if (!shelf) {
        const models = graph.findModelsInArea(productBBox).filter(el => {
            return el !== product && !el.isEmbedded();
        });
        if (models.length !== 1) return true;
        [shelf] = models;
    }
    return !shelf.getBBox().containsRect(productBBox);
};

export const doProductsOverflow = (shelf: dia.Element): boolean => {
    const products = shelf.getEmbeddedCells();
    const shelfBBox = shelf.getBBox();
    return products.some((product: dia.Element) => {
        return !shelfBBox.containsRect(product.getBBox());
    });
};
