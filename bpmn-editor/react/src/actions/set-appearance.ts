import { fieldFor } from '../utils';

import type { dia } from '@joint/plus';
import type { AppearanceRole, BpmnElement, BpmnLink } from '../shapes/shapes-typing';

/**
 * Sets one role across several cells, each at its own path — a task's fill
 * lives at `attrs/background/fill` where a gateway's is `attrs/body/fill`, and
 * a connector's line at `attrs/line/stroke`.
 *
 * One batch, so changing a selection is one thing to undo rather than one per
 * cell. Cells with nothing for the role are skipped, which is how a group (no
 * fill) sits harmlessly in a selection.
 */
export function setAppearanceOnCells(graph: dia.Graph, cells: (BpmnElement | BpmnLink)[], role: AppearanceRole, value: string) {

    const batchName = 'set-appearance';

    graph.startBatch(batchName);

    cells.forEach((cell) => {
        const field = fieldFor(cell, role);
        if (!field) return;

        // A select box's options carry their own type — a font size is a
        // number — and writing the string form would change it.
        const option = field.type === 'select-box'
            ? field.options.find((candidate) => String(candidate.value) === value)
            : null;

        cell.prop(field.path, option ? option.value : value);
    });

    graph.stopBatch(batchName);
}
