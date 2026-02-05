import { type dia, type shapes, g, V } from '@joint/plus';
import { ShapeTypes } from '../shapes/shapes-typing';

export function isBoundaryEvent(elementView: dia.CellView, parentView: dia.CellView | null) {
    return (
        parentView &&
        parentView.model.get('shapeType') === ShapeTypes.ACTIVITY &&
        elementView.model.get('shapeType') === ShapeTypes.EVENT
    );
}

export function snapToParentPath(elementView: dia.ElementView, parentView: dia.CellView, x: number, y: number) {

    const { model } = elementView;

    const bbox = parentView!.model.getBBox();

    const normalizedPath = V.normalizePathData(V.rectToPath(bbox));
    const path = new g.Path(normalizedPath);

    const snappedPoint = path.closestPoint(new g.Point({ x, y }));

    const { width, height } = model.getBBox();
    snappedPoint?.offset(-width / 2, -height / 2);

    return snappedPoint || { x, y };
}

export function isPoolShared(element1: dia.Cell, element2: dia.Cell) {
    return getPoolParent(element1) === getPoolParent(element2);
}

export function getPoolParent(element?: dia.Cell): shapes.bpmn2.CompositePool | null {

    if (!element) return null;

    const ancestors = element.getAncestors();

    return ancestors.find((ancestor) => ancestor.get('shapeType') === ShapeTypes.POOL) as shapes.bpmn2.CompositePool;
}

export function getSwimlaneParent(element?: dia.Cell): shapes.bpmn2.Swimlane | null {

    if (!element) return null;

    const ancestors = element.getAncestors();

    return ancestors.find((ancestor) => ancestor.get('shapeType') === ShapeTypes.SWIMLANE) as shapes.bpmn2.Swimlane;
}

export function canElementExistOutsidePool(element: dia.Cell) {
    return [
        ShapeTypes.DATA_OBJECT,
        ShapeTypes.DATA_STORE,
        ShapeTypes.POOL,
        ShapeTypes.GROUP,
        ShapeTypes.ANNOTATION
    ].includes(element.get('shapeType'));
}
