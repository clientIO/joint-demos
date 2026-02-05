import type { dia, shapes } from '@joint/plus';
import { HorizontalSwimlane, VerticalSwimlane } from '../shapes';
import { swimlaneAttributes, fontAttributes, DEFAULT_POOL_WIDTH } from '../theme';

export function onPoolDragStart(_paper: dia.Paper, _poolView: dia.ElementView, _evt: dia.Event, _x: number, _y: number) {
    // no-op
}

export function onPoolDrag(_paper: dia.Paper, _poolView: dia.ElementView, _evt: dia.Event, _x: number, _y: number) {
    // no-op
}

export function onPoolDragEnd(_paper: dia.Paper, _poolView: dia.ElementView, _evt: dia.Event, _x: number, _y: number) {
    // no-op
}

export function onPoolDrop(_paper: dia.Paper, poolView: dia.ElementView, _evt: dia.Event, _x: number, _y: number) {
    // When the user drops a new pool on the paper, we add a new swimlane to it.
    const pool = poolView.model as shapes.bpmn2.CompositePool;
    pool.prop(['size', 'width'], DEFAULT_POOL_WIDTH);
    const swimlane = (pool.isHorizontal() ? new HorizontalSwimlane() : new VerticalSwimlane());
    swimlane.prop({
        ...swimlaneAttributes,
        attrs: {
            headerText: fontAttributes
        }
    });
    pool.addSwimlane(swimlane as shapes.bpmn2.Swimlane);
}
