import type { dia } from '@joint/plus';

import { getDeletedCells } from './actions';
import type { GroupModel } from './shapes';
import { AddButtonModel, DecisionModel, GroupStartModel } from './shapes';

/**
 * The state of the picture that is not the data: the marks on the cells -
 * a deletion about to happen, what a collapse would hide, what a move would
 * take, and a move in progress. Each function returns the marks a state
 * puts on the cells, by id; the editor holds the current marks, and a cell's
 * component reads its own with `useCellMark()` and wears it as a class,
 * which the stylesheet paints (see `index.css`).
 */

/**
 * A mark on a cell: red for a deletion about to happen, light for what a
 * collapse would hide, teal for what a move would take (`to-be-moved`) or
 * takes (`moving`: out of reach too), and `no-drop` on a button that cannot
 * take the move, or on the link to such a button - hidden.
 */
export type Mark = 'to-be-deleted' | 'faded' | 'to-be-moved' | 'moving' | 'no-drop';

export type Marks = ReadonlyMap<dia.Cell.ID, Mark>;

export const NO_MARKS: Marks = new Map();

function markAll(cells: Iterable<dia.Cell>, mark: Mark, marks = new Map<dia.Cell.ID, Mark>()): Map<dia.Cell.ID, Mark> {
    for (const cell of cells) marks.set(cell.id, mark);
    return marks;
}

/** The cells a deletion of `target` would remove, red - the add buttons among them left alone: buttons do not turn red. */
export function getDeletionMarks(graph: dia.Graph, target: dia.Element): Marks {
    return markAll(getDeletedCells(graph, target).filter((cell) => !AddButtonModel.isAddButton(cell)), 'to-be-deleted');
}

/**
 * What a collapse of `group` would hide, faded - its content, nested groups
 * included, and the links of the content. The start of the group stays: it
 * stands in for the collapsed group. Nothing for a group already collapsed.
 */
export function getCollapseMarks(graph: dia.Graph, group: GroupModel): Marks {
    if (group.isCollapsed()) return NO_MARKS;
    const start = group.getStart();
    const content = group.getEmbeddedCells({ deep: true }).filter((cell) => cell !== start);
    const links = content.filter((cell) => cell.isElement()).flatMap((cell) => graph.getConnectedLinks(cell));
    return markAll([...content, ...links], 'faded');
}

/** What a move would take along, marked as about to move. */
export function getMoveMarks(cells: Iterable<dia.Cell>): Marks {
    return markAll(cells, 'to-be-moved');
}

/**
 * The marks of a move in progress: the subtree that moves - `moving`, its
 * links and buttons included - and the buttons that cannot take it, with
 * the link into such an add button - `no-drop`: a link into nothing would
 * hang from the leaf.
 */
export function getMovingMarks(graph: dia.Graph, movedCells: dia.Cell[], canDropBelow: (parent: dia.Element) => boolean): Marks {
    const marks = markAll(movedCells, 'moving');
    for (const element of graph.getElements()) {
        const hasPillButton = GroupStartModel.isGroupStart(element) ? element.getKind() === 'fork' : DecisionModel.isDecision(element);
        if (hasPillButton) {
            if (!canDropBelow(element)) marks.set(element.id, 'no-drop');
        } else if (AddButtonModel.isAddButton(element)) {
            const [parent] = graph.getNeighbors(element, { inbound: true });
            if (parent && !canDropBelow(parent)) {
                marks.set(element.id, 'no-drop');
                for (const link of graph.getConnectedLinks(element, { inbound: true })) marks.set(link.id, 'no-drop');
            }
        }
    }
    return marks;
}
