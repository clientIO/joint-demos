import type { CellId } from '@joint/react-plus';
import { createContext, use } from 'react';

/**
 * Which node is being renamed in place, shared with `renderElement`.
 *
 * A context rather than a prop because `renderElement` receives only the cell's
 * `data` — the node has no other channel to learn that it is the one being
 * edited.
 */
export interface NodeEditing {
    /** Node currently under the caret, or `null` when none is. */
    readonly editingId: CellId | null;
    readonly begin: (id: CellId) => void;
    /** Writes the label back to the source and leaves edit mode. */
    readonly commit: (id: CellId, label: string) => void;
    readonly cancel: () => void;
}

export const NodeEditingContext = createContext<NodeEditing | null>(null);

export function useNodeEditing(): NodeEditing | null {
    return use(NodeEditingContext);
}
