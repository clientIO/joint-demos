import { selectElementSize, useCell, useIsCellSelected } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { STEP_RADIUS } from './constants';

/** How far the frame of the selected element stands from its edge. */
const SELECTION_PADDING = 5;

/**
 * The frame of the selected element: a rounded rectangle a little away
 * from its edge, in its shape - the corners of a step (`box`), the round
 * ends of the other pills and the circle of a terminal (`round`, by half
 * the height) - rendered before the element's `HTMLHost`, so under it and
 * under the buttons that overhang it. Nothing for an element that is not
 * selected; the hook re-renders the element when that changes.
 */
export function SelectionFrame({ shape }: { shape: 'box' | 'round' }): ReactNode {
    const selected = useIsCellSelected();
    const { width, height } = useCell(selectElementSize);
    if (!selected) return null;
    const radius = (shape === 'box' ? STEP_RADIUS : height / 2) + SELECTION_PADDING;
    return (
        <rect
            className="selection-frame"
            x={-SELECTION_PADDING}
            y={-SELECTION_PADDING}
            width={width + 2 * SELECTION_PADDING}
            height={height + 2 * SELECTION_PADDING}
            rx={radius}
            ry={radius}
        />
    );
}
