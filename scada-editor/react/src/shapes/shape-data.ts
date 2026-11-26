import type { ShapeData } from './types';

/** Whether a cell's data is a shape's (an element's or a connection's): it names its kind. */
export function isShapeData(data: unknown): data is ShapeData {
    return typeof data === 'object' && data !== null && 'kind' in data && typeof data.kind === 'string';
}
