import type { CellId } from '@joint/react-plus';
import { TreeData } from './tree-data';
import type { IndexCell, IndexElement, IndexLink, SourceDiagram } from './tree-data';

export type { IndexCell, IndexElement, IndexLink, NodeData, NodeKind } from './tree-data';

/*
 * Tree item ids compose the diagram id and the cell id with `':'` — a
 * character neither id scheme uses. A bare diagram id is the diagram's own
 * (root) tree item.
 */
export function toItemId(diagramId: string, cellId?: CellId): string {
    // Cell ids are `string | number` in JointJS; the composite is always a string.
    return cellId === undefined ? diagramId : `${diagramId}:${cellId}`;
}

export function parseItemId(itemId: string): { diagramId: string; cellId: string | null } {
    const separator = itemId.indexOf(':');
    if (separator === -1) return { diagramId: itemId, cellId: null };
    return { diagramId: itemId.slice(0, separator), cellId: itemId.slice(separator + 1) };
}

/** One leaf of the tree: a cell of a diagram. */
export interface TreeLeaf {
    readonly itemId: string;
    readonly label: string;
    readonly isElement: boolean;
}

export interface DiagramSource extends SourceDiagram {
    readonly leaves: readonly TreeLeaf[];
}

function toLeaf(diagramId: string, cell: IndexCell): TreeLeaf {
    const isElement = cell.type === 'element';
    return {
        itemId: toItemId(diagramId, cell.id),
        isElement,
        label: isElement
            ? ((cell as IndexElement).data.label || `Element (${cell.id})`)
            : ((cell as IndexLink).labelMap?.text?.text ?? `Link (${cell.id})`),
    };
}

/** The saved diagrams plus the tree leaves derived from their cells. */
export const DIAGRAMS: readonly DiagramSource[] = TreeData.map((diagram) => ({
    ...diagram,
    leaves: diagram.cells.map((cell) => toLeaf(diagram.id, cell)),
}));
