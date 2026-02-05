import { HorizontalSwimlane, VerticalSwimlane } from '../shapes';
import { swimlaneAttributes, fontAttributes, DEFAULT_POOL_WIDTH } from '../theme';

export function onPoolDragStart(_paper, _poolView, _evt, _x, _y) {
    // no-op
}

export function onPoolDrag(_paper, _poolView, _evt, _x, _y) {
    // no-op
}

export function onPoolDragEnd(_paper, _poolView, _evt, _x, _y) {
    // no-op
}

export function onPoolDrop(_paper, poolView, _evt, _x, _y) {
    // When the user drops a new pool on the paper, we add a new swimlane to it.
    const pool = poolView.model;
    pool.prop(['size', 'width'], DEFAULT_POOL_WIDTH);
    const swimlane = (pool.isHorizontal() ? new HorizontalSwimlane() : new VerticalSwimlane());
    swimlane.prop(Object.assign(Object.assign({}, swimlaneAttributes), { attrs: {
            headerText: fontAttributes
        } }));
    pool.addSwimlane(swimlane);
}
