import type { dia } from '@joint/plus';

/**
 * Enumeration of available system model effects.
 */
export const Effect = {
    /** Highlighting effect for the current connection target */
    ConnectionTarget: 'connection-target',
    /** Highlighting effect for available connection target */
    ConnectionAvailableTarget: 'connection-available-target',
    /** Highlighting effect to indicate sibling elements */
    Sibling: 'sibling'
} as const;

/**
 * Notify the diagram to add an effect (highlighter) to a node or edge.
 */
export function triggerEffect(paper: dia.Paper, cell: dia.Cell, effect: typeof Effect[keyof typeof Effect]) {
    paper.trigger('effect:add', cell.findView(paper), effect);
}

/**
 * Notify the diagram to remove an effect (highlighter) from all nodes and edges.
 */
export function triggerEffectRemoval(paper: dia.Paper, effect: typeof Effect[keyof typeof Effect]) {
    paper.trigger('effect:remove', effect);
}
