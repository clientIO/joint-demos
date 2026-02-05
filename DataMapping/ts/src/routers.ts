import type { dia } from '@joint/plus';
import { routers, g } from '@joint/plus';

interface RouterOptions {
    padding?: number,
    sourcePadding?: number,
    targetPadding?: number
}

const DEFAULT_PADDING = 10;

function getOutsidePoint(bbox: g.Rect, angle: number, anchor: g.Point, padding: number) {
    const ref = anchor.clone();
    const center = bbox.center();
    if (angle) ref.rotate(center, angle);
    const point = new g.Point(bbox.x, ref.y);
    if (point.equals(anchor)) {
        point.x--;
        padding--;
    }
    point.move(ref, (ref.x < center.x) ? padding : - bbox.width - padding);
    if (angle) point.rotate(center, -angle);
    return point.round();
}

const mapping = function(vertices: Array<g.Point>, opt: RouterOptions, linkView: dia.LinkView) {
    const link = linkView.model;
    const route = [];
    // Target Point
    const source = link.getSourceElement();
    if (source) {
        route.push(getOutsidePoint(
            source.getBBox(),
            source.angle(),
            linkView.sourceAnchor,
            opt.padding || opt.sourcePadding || DEFAULT_PADDING
        ));
    }
    // Vertices
    Array.prototype.push.apply(route, vertices);
    // Source Point
    const target = link.getTargetElement();
    if (target) {
        route.push(getOutsidePoint(
            target.getBBox(),
            target.angle(),
            linkView.targetAnchor,
            opt.padding || opt.targetPadding || DEFAULT_PADDING
        ));
    }
    return route;
};

export const routerNamespace = { ...routers };

Object.assign(routerNamespace, {
    mapping
});
