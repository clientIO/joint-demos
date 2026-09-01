import { type dia, shapes, g } from '@joint/plus';
import { ShapeTypes, type BpmnElement } from '../shapes/shapes-typing';
import type { BpmnPool, BpmnSwimlane } from '../shapes/pool/pool-shapes';

/**
 * Whether the dragged element is an event over an activity, i.e. it should
 * become a boundary event when dropped on the activity's border.
 */
export function isBoundaryEvent(elementView: dia.CellView, parentView: dia.CellView | null) {
    return (
        !!parentView &&
        isActivity(parentView.model) &&
        isEvent(elementView.model)
    );
}

/**
 * The position (top-left) placing the element's center on the closest point
 * of the parent's boundary.
 */
export function snapToParentBoundary(child: dia.Element, parent: dia.Element, x: number, y: number) {

    const snappedPoint = parent.getBBox().pointNearestToPoint({ x, y });

    const { width, height } = child.getBBox();
    return snappedPoint.offset(-width / 2, -height / 2);
}

/**
 * Grows the pool of the element's swimlane so the lane still contains the
 * element. No-op for elements that are not embedded in a swimlane.
 */
export function adjustPoolToContainElement(element: dia.Element) {
    const lane = element.getParentCell();
    if (!lane || !isSwimlane(lane)) return;
    const pool = lane.getParentCell();
    if (!pool || !isPool(pool)) return;
    pool.adjustToContainElements(lane);
}

/**
 * Moves the focus to the cell's view.
 *
 * The keyboard paths hand the focus back to the shape they were opened from —
 * a picker, the inspector, the label editor — and any of them may be closing
 * because the cell went away, so a missing paper or view is not an error.
 */
export function focusCell(paper: dia.Paper | null | undefined, cell: dia.Cell | null | undefined, options?: FocusOptions) {
    if (!paper || !cell) return;

    paper.findViewByModel(cell)?.el.focus(options);
}

/**
 * Whether the element is a pool swimlane.
 */
export function isSwimlane(cell: dia.Cell): cell is BpmnSwimlane {
    return shapes.bpmn2.Swimlane.isSwimlane(cell);
}

/**
 * Whether the element is a pool.
 */
export function isPool(cell: dia.Cell): cell is BpmnPool {
    return shapes.bpmn2.CompositePool.isPool(cell);
}

/**
 * Whether the element is an activity (a task, sub-process, call activity, ...).
 */
export function isActivity(cell: dia.Cell): boolean {
    return cell.get('shapeType') === ShapeTypes.ACTIVITY;
}

/**
 * Whether the element is an event (start, end, intermediate or boundary).
 */
export function isEvent(cell: dia.Cell): boolean {
    return cell.get('shapeType') === ShapeTypes.EVENT;
}

/**
 * Whether the element is a gateway.
 */
export function isGateway(cell: dia.Cell): boolean {
    return cell.get('shapeType') === ShapeTypes.GATEWAY;
}

/**
 * Whether the element is a group.
 */
export function isGroup(cell: dia.Cell): boolean {
    return cell.get('shapeType') === ShapeTypes.GROUP;
}

/**
 * Whether both elements belong to the same pool (or both to none).
 */
export function isPoolShared(element1: dia.Cell, element2: dia.Cell) {
    return getPoolParent(element1) === getPoolParent(element2);
}

/**
 * The pool the element is embedded in, or `null`.
 */
export function getPoolParent(element?: dia.Cell): BpmnPool | null {

    if (!element) return null;

    const ancestors = element.getAncestors();

    return ancestors.find(isPool) ?? null;
}

/**
 * The swimlane the element is embedded in, or `null`.
 */
export function getSwimlaneParent(element?: dia.Cell): BpmnSwimlane | null {

    if (!element) return null;

    const ancestors = element.getAncestors();

    return ancestors.find(isSwimlane) ?? null;
}

/**
 * Whether the element type is allowed to live outside of a pool once pools
 * are present in the diagram.
 */
export function canElementExistOutsidePool(element: dia.Cell) {
    return [
        ShapeTypes.DATA_OBJECT,
        ShapeTypes.DATA_STORE,
        ShapeTypes.POOL,
        ShapeTypes.GROUP,
        ShapeTypes.ANNOTATION
    ].includes(element.get('shapeType'));
}

/**
 * The point on the element's boundary closest to `coords` (both relative to
 * the element's unrotated bbox), snapped to a side midpoint within the radius.
 */
export function getClosestElementBoundaryPoint(element: BpmnElement, coords: g.PlainPoint, snapRadius = 20) {
    const point = new g.Point(coords);
    const bbox = element.getBBox();
    const angle = element.angle();
    // Relative to the element's position
    const relPoint = point.clone().rotate(bbox.center(), angle).difference(bbox.topLeft());

    const relBBox = new g.Rect(0, 0, bbox.width, bbox.height);

    if (!relBBox.containsPoint(relPoint)) {
        const relCenter = relBBox.center();
        const relTop = relBBox.topMiddle();
        const relLeft = relBBox.leftMiddle();
        if (Math.abs(relTop.x - relPoint.x) < snapRadius) {
            return (relCenter.y > relPoint.y) ? relTop : relBBox.bottomMiddle();
        }
        if (Math.abs(relLeft.y - relPoint.y) < snapRadius) {
            return (relCenter.x > relPoint.x) ? relLeft : relBBox.rightMiddle();
        }
    }

    return element.getClosestBoundaryPoint(relBBox, relPoint)!;
}
