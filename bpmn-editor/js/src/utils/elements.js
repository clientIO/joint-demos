import { g, V } from '@joint/plus';
import { ShapeTypes } from '../shapes/shapes-typing';

export function isBoundaryEvent(elementView, parentView) {
    return (parentView &&
        parentView.model.get('shapeType') === ShapeTypes.ACTIVITY &&
        elementView.model.get('shapeType') === ShapeTypes.EVENT);
}

export function snapToParentPath(elementView, parentView, x, y) {
    
    const { model } = elementView;
    
    const bbox = parentView.model.getBBox();
    
    const normalizedPath = V.normalizePathData(V.rectToPath(bbox));
    const path = new g.Path(normalizedPath);
    
    const snappedPoint = path.closestPoint(new g.Point({ x, y }));
    
    const { width, height } = model.getBBox();
    snappedPoint?.offset(-width / 2, -height / 2);
    
    return snappedPoint || { x, y };
}

export function isPoolShared(element1, element2) {
    return getPoolParent(element1) === getPoolParent(element2);
}

export function getPoolParent(element) {
    
    if (!element)
        return null;
    
    const ancestors = element.getAncestors();
    
    return ancestors.find((ancestor) => ancestor.get('shapeType') === ShapeTypes.POOL);
}

export function getSwimlaneParent(element) {
    
    if (!element)
        return null;
    
    const ancestors = element.getAncestors();
    
    return ancestors.find((ancestor) => ancestor.get('shapeType') === ShapeTypes.SWIMLANE);
}

export function canElementExistOutsidePool(element) {
    return [
        ShapeTypes.DATA_OBJECT,
        ShapeTypes.DATA_STORE,
        ShapeTypes.POOL,
        ShapeTypes.GROUP,
        ShapeTypes.ANNOTATION
    ].includes(element.get('shapeType'));
}
