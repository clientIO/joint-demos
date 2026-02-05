
// Validators

export const validateChangePosition = (graph) => (err, command, next) => {
    if (command.options.freeTransform) {
        // Position is changed after resize
        return next(err);
    }
    const cell = graph.getCell(command.data.id);
    if (!isPositionValid(graph, cell)) {
        return next({ cell, msg: 'positioning error' });
    }
    return next(err);
};

export const validateChangeSize = (graph) => (err, command, next) => {
    const cell = graph.getCell(command.data.id);
    if (!isSizeValid(graph, cell)) {
        return next({ cell, msg: 'resizing error' });
    }
    return next(err);
};

// Checks

export const isSizeValid = (graph, element) => {
    if (element.get('type') === 'app.Shelf') {
        if (doProductsOverflow(element) || doesShelfOverlap(graph, element)) {
            return false;
        }
    }
    else {
        if (doesProductOverflow(graph, element) || doesProductOverlap(graph, element)) {
            return false;
        }
    }
    return true;
};

export const isPositionValid = (graph, element) => {
    if (element.get('type') === 'app.Shelf') {
        if (doesShelfOverlap(graph, element)) {
            return false;
        }
    }
    else {
        if (doesProductOverlap(graph, element) || doesProductOverflow(graph, element)) {
            return false;
        }
    }
    return true;
};

export const doesProductOverlap = (graph, product) => {
    const models = graph.findModelsUnderElement(product);
    if (models.length === 0)
        return true;
    return models.some(el => el.isEmbedded());
};

export const doesShelfOverlap = (graph, shelf) => {
    return graph.findModelsUnderElement(shelf).length > 0;
};

export const doesProductOverflow = (graph, product) => {
    let shelf = product.getParentCell();
    const productBBox = product.getBBox();
    if (!shelf) {
        const models = graph.findModelsInArea(productBBox).filter(el => {
            return el !== product && !el.isEmbedded();
        });
        if (models.length !== 1)
            return true;
        [shelf] = models;
    }
    return !shelf.getBBox().containsRect(productBBox);
};

export const doProductsOverflow = (shelf) => {
    const products = shelf.getEmbeddedCells();
    const shelfBBox = shelf.getBBox();
    return products.some((product) => {
        return !shelfBBox.containsRect(product.getBBox());
    });
};
