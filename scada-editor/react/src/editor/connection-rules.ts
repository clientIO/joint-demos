import type { ConnectionStrategy, ValidateConnection } from '@joint/react-plus';
import { isConnectionData } from '../connections/connections';
import { specOf } from '../shapes/registry';
import { isShapeData } from '../shapes/shape-data';
import type { ShapeData } from '../shapes/types';

/*
 * Where a link end connects: to the center of a pipe stub or a terminal (a port), else to a side of the element
 * (in the steps of the grid, or the middle of the side), and an arrow or a conveyor where it is dropped.
 */

/** The grid the elements move on and the ends of the links snap to. */
export const GRID_SIZE = 10;

/** The data of a cell, if it is a shape's. */
function shapeDataOf(data: unknown): ShapeData | undefined {
    return isShapeData(data) ? data : undefined;
}

const percent = (value: number, length: number) => `${length > 0 ? Number(((value / length) * 100).toFixed(3)) : 0}%`;
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));
const snap = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

/**
 * Where the dropped end connects: a port as it is (its center); on an element without one, the side nearest to the
 * drop point (on the grid, or its middle); an arrow anywhere inside, a conveyor where dropped (a chute).
 */
export const connectionStrategy: ConnectionStrategy = ({ end, model, dropPoint, link }) => {
    if (!model.isElement()) {
        return end;
    }
    const element = model;
    const { width, height } = element.size();
    const local = element.getRelativePointFromAbsolute(dropPoint);
    const linkData: unknown = link.get('data');
    const kind = isConnectionData(linkData) ? linkData.kind : undefined;
    if (kind === 'Arrow' || kind === 'Conveyor') {
        const x = kind === 'Arrow' ? clamp(local.x, width) : local.x;
        const y = kind === 'Arrow' ? clamp(local.y, height) : local.y;
        return { ...end, anchor: { name: 'topLeft', args: { dx: percent(x, width), dy: percent(y, height), rotate: true, useModelGeometry: true } } };
    }
    if (end.port !== undefined) {
        // The paper's default anchor: the center of the port.
        return { ...end, anchor: undefined };
    }
    const spec = specOf(shapeDataOf(element.get('data'))?.kind);
    const isMiddles = spec?.anchors === 'middles';
    // The point of the box nearest to the drop point: on a vertical side or a horizontal one.
    const distances = [local.x, width - local.x, local.y, height - local.y];
    const nearest = distances.indexOf(Math.min(...distances));
    const isVertical = nearest < 2;
    const x = isVertical ? (nearest === 0 ? 0 : width) : isMiddles ? width / 2 : clamp(snap(local.x), width);
    const y = isVertical ? (isMiddles ? height / 2 : clamp(snap(local.y), height)) : nearest === 2 ? 0 : height;
    // Relative to the size, kept on the grid when the element is resized (see `gridSide`).
    return { ...end, anchor: { name: 'gridSide', args: { dx: percent(x, width), dy: percent(y, height), rotate: true, useModelGeometry: true } } };
};

// The shapes nothing connects to: the background ones.
const UNCONNECTABLE = new Set(['Screen', 'Group', 'Rectangle', 'Ellipse']);

/**
 * Whether the end may connect there: to an element, not to the screen, a group, a shape of the background or a
 * locked one. Which part of it (a stub, a terminal, the body) depends on the kind of the link, which the callback
 * is not given: any part is accepted.
 */
export const validateConnection: ValidateConnection = ({ source, target, endType }) => {
    const { model } = endType === 'source' ? source : target;
    if (!model.isElement()) {
        return false;
    }
    const data = shapeDataOf(model.get('data'));
    const spec = specOf(data?.kind);
    return data !== undefined && spec !== undefined && !UNCONNECTABLE.has(spec.kind) && data.locked !== true;
};
