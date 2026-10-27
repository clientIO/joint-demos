import type { dia } from '@joint/plus';

import { runLayout } from './layout';

/** Whether the graph changed since its last layout, and whether the layout is running now (its own changes don't count). */
interface LayoutState {
    dirty: boolean;
    running: boolean;
}

const states = new WeakMap<dia.Graph, LayoutState>();

/** The layout state of `graph`; it starts dirty, and any change of a cell that is not the layout's own makes it dirty again. */
function getLayoutState(graph: dia.Graph): LayoutState {
    let state = states.get(graph);
    if (!state) {
        const created: LayoutState = { dirty: true, running: false };
        graph.on('add remove change reset', () => {
            if (!created.running) {
                created.dirty = true;
            }
        });
        states.set(graph, created);
        state = created;
    }
    return state;
}

/**
 * Lays out the diagram from `root`, if the graph changed since the last
 * layout - a build of the data or a size measured by React - and marks it
 * laid out. Returns whether it did.
 */
export function layoutIfDirty(graph: dia.Graph, root: dia.Element): boolean {
    const state = getLayoutState(graph);
    if (!state.dirty) {
        return false;
    }
    state.running = true;
    try {
        runLayout(graph, root);
    } finally {
        state.running = false;
    }
    state.dirty = false;
    return true;
}
