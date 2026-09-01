import { colorFieldFor } from '../utils';

import type { dia } from '@joint/plus';
import type { AppearanceRole, AppElement } from '../shapes/shapes-typing';

/**
 * Paints one role across several shapes, each at its own path — a task's fill
 * lives at `attrs/background/fill` where a gateway's is `attrs/body/fill`.
 *
 * One batch, so recolouring a selection is one thing to undo rather than one
 * per shape. Shapes with nothing to paint for the role are skipped, which is
 * how a group (no fill) sits harmlessly in a selection.
 */
export function setColorOnCells(graph: dia.Graph, cells: AppElement[], role: AppearanceRole, color: string) {

    const batchName = 'set-appearance-color';

    graph.startBatch(batchName);

    cells.forEach((cell) => {
        const field = colorFieldFor(cell, role);
        if (field) cell.prop(field.path, color);
    });

    graph.stopBatch(batchName);
}
