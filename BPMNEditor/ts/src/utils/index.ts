import { type dia, shapes, util, g } from '@joint/plus';
import type { AppElement, AppLink, Marker } from '../shapes/shapes-typing';

export function getShapeConstructorByType(type: string): dia.Cell.Constructor<AppElement | AppLink> {
    return util.getByPath(shapes, type, '.');
}

export function constructMarkerContent(marker: Marker) {

    // Create a span with the bpmn class
    const markerIcon = document.createElement('span');
    markerIcon.classList.add(marker.cssClass);

    // Create a span with the marker name
    const content = document.createElement('span');
    content.innerText = marker.name;

    return [markerIcon, content];
}

export function getBoundaryPoint(element: AppElement, coords: g.PlainPoint, snapRadius = 20) {
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

export function isStencilEvent(evt: dia.Event): boolean {
    return !!evt.data?.isStencilEvent;
}

export function isForkEvent(evt: dia.Event): boolean {
    return !!evt.data?.fork;
}

export function setStencilEvent(evt: dia.Event, isStencilEvent: boolean): void {
    if (!evt.data) {
        evt.data = {};
    }
    evt.data.isStencilEvent = isStencilEvent;
}

export function getMidSideAnchor(element: AppElement, point: g.Point) {
    const closestSide = element.getBBox().sideNearestToPoint(point);

    let anchorPoint;
    switch (closestSide) {
        case 'top':
            anchorPoint = element.getBBox().topMiddle();
            break;
        case 'right':
            anchorPoint = element.getBBox().rightMiddle();
            break;
        case 'bottom':
            anchorPoint = element.getBBox().bottomMiddle();
            break;
        case 'left':
            anchorPoint = element.getBBox().leftMiddle();
            break;
    }

    const position = element.position();

    return {
        name: 'topLeft',
        args: {
            dx: anchorPoint.x - position.x,
            dy: anchorPoint.y - position.y
        }
    };
}

export * from './elements';
export * from './links';
export * from './import';
