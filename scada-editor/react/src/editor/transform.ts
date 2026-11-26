import type { FreeTransformProps } from '@joint/react-plus';
import { GRID_SIZE } from './connection-rules';
import type { ResizeOptions, ShapeSpec } from '../shapes/types';

type Direction = NonNullable<ResizeOptions['directions']>[number];

const ALL_DIRECTIONS: readonly Direction[] = ['top-left', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left'];
// An element can be made this much smaller than its default size, unless its kind says otherwise.
const MIN_SIZE_RATIO = 0.5;
// The size changes in two steps of the grid: the center of the element stays on the grid too.
const SIZE_STEP = 2 * GRID_SIZE;
const RESIZE_GRID = { width: SIZE_STEP, height: SIZE_STEP };

/** A part of the default size, in the steps of the size (one step at least). */
const minSize = (size: number) => Math.max(SIZE_STEP, Math.round((size * MIN_SIZE_RATIO) / SIZE_STEP) * SIZE_STEP);

/** The resize handles: the kind's, or all of them unless the width or the height can't change. */
function directionsOf({ minWidth, maxWidth, minHeight, maxHeight, directions }: ResizeOptions): readonly Direction[] {
    if (directions) {
        return directions;
    }
    const isWidthFixed = minWidth !== undefined && minWidth === maxWidth;
    const isHeightFixed = minHeight !== undefined && minHeight === maxHeight;
    if (isWidthFixed && isHeightFixed) {
        return [];
    }
    if (isWidthFixed) {
        return ['top', 'bottom'];
    }
    if (isHeightFixed) {
        return ['left', 'right'];
    }
    return ALL_DIRECTIONS;
}

/**
 * The transform handles of an element of the kind: resized within its constraints (or not at all) - not shorter
 * than its connected ports take (see `ShapeSpec.minWidthOf`) - rotated or not.
 */
export function transformPropsOf(spec: ShapeSpec, connectedPorts: readonly string[] = []): Omit<FreeTransformProps, 'cell'> {
    if (spec.resizable === false) {
        return { allowRotation: spec.rotatable, resizeDirections: [], resizeGrid: RESIZE_GRID };
    }
    const options: ResizeOptions = {
        minWidth: minSize(spec.size.width),
        minHeight: minSize(spec.size.height),
        ...(spec.resizable === true ? {} : spec.resizable),
    };
    return {
        allowRotation: spec.rotatable,
        resizeGrid: RESIZE_GRID,
        minWidth: Math.max(options.minWidth ?? 0, spec.minWidthOf?.(connectedPorts) ?? 0),
        minHeight: options.minHeight,
        maxWidth: options.maxWidth,
        maxHeight: options.maxHeight,
        preserveAspectRatio: options.preserveAspectRatio,
        resizeDirections: [...directionsOf(options)],
    };
}
