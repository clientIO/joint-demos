
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
};

/**
 * Notify the diagram to add an effect (highlighter) to a node or edge.
 */
export function triggerEffect(paper, cell, effect) {
    paper.trigger('effect:add', cell.findView(paper), effect);
}

/**
 * Notify the diagram to remove an effect (highlighter) from all nodes and edges.
 */
export function triggerEffectRemoval(paper, effect) {
    paper.trigger('effect:remove', effect);
}
