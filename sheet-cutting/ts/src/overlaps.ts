import type { dia } from '@joint/plus';
import { highlighters, g } from '@joint/plus';
import { Polygon } from './polygon';
import type { AbsGeometryOptions } from './polygon';

// Overlaps
// --------

const overlapHighlighter = highlighters.addClass;

const overlapHighlighterOptions = {
    className: 'overlapped-shape'
};

const overlapHighlighterId = 'overlap';

export function unhighlightOverlaps(paper: dia.Paper) {
    overlapHighlighter.removeAll(paper, overlapHighlighterId);
}

export function highlightOverlap(elementView: dia.CellView) {
    overlapHighlighter.add(
        elementView,
        Polygon.selector,
        overlapHighlighterId,
        overlapHighlighterOptions
    );
}

export function unhighlightOverlap(elementView: dia.CellView) {
    overlapHighlighter.remove(elementView, overlapHighlighterId);
}

export function findOverlappingElements(el: Polygon, targetGraph: dia.Graph, options: AbsGeometryOptions = {}) {
    const area = el.getBBox();
    const {
        angle,
        position = area.topLeft()
    } = options;
    // A custom position is provided
    area.x = position.x;
    area.y = position.y;
    const elementGeometry = el.getGeometryAbsolute({ angle, position }).round();
    return targetGraph.findModelsInArea(area).filter((e: Polygon) => {
        if (e === el) return false;
        return g.intersection.exists(elementGeometry, e.getGeometryAbsolute().round());
    });
}

export function highlightOverlaps(elementView: dia.ElementView, targetPaper: dia.Paper, options: AbsGeometryOptions = {}) {
    const el = elementView.model as Polygon;
    const graph = targetPaper.model;
    unhighlightOverlaps(targetPaper);
    const sourcePaper = elementView.paper;
    if (sourcePaper !== targetPaper) {
        unhighlightOverlaps(sourcePaper);
    }
    const overlappedElements = findOverlappingElements(el, graph, options);
    if (overlappedElements.length > 0) {
        highlightOverlap(elementView);
        overlappedElements.forEach((el) => highlightOverlap(el.findView(targetPaper)));
    }
}

// Overflow
// --------

const overflowHighlighter = highlighters.addClass;

const overflowHighlighterOptions = {
    className: 'overflown-shape'
};

const overflowHighlighterId = 'overflow';

export function highlightOverflow(elementView: dia.CellView) {
    overflowHighlighter.add(
        elementView,
        Polygon.selector,
        overflowHighlighterId,
        overflowHighlighterOptions
    );
}

export function unhighlightOverflow(elementView: dia.CellView) {
    overflowHighlighter.remove(elementView, overflowHighlighterId);
}
