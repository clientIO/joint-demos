import { highlighters } from '@joint/plus';
import type { dia } from '@joint/plus';

import { getDeletedCells } from './actions';
import { isCellVisible } from './layout';
import { AddButtonModel, DecisionModel, GroupModel, GroupStartModel } from './shapes';

/**
 * The state of the picture that is not the data: the highlights of a
 * deletion about to happen, of what a collapse would hide, of what a move
 * would take, and the marks of a move in progress - classes on the views of
 * the cells. The views are JointJS's; the classes reach the React
 * components rendered inside them through the stylesheet.
 */

/** The id of the highlighter, and the class it adds, on the cells a hovered "remove" item would remove. */
const DELETE_HIGHLIGHT = 'to-be-deleted';

/** The views highlighted at the moment, to take the highlight off again. */
let highlightedViews: dia.CellView[] = [];

/**
 * Turns the cells a deletion of `target` would remove red, by a class on
 * their views - the visible ones; the content of a collapsed group has none.
 * The add buttons among them are left alone: buttons do not turn red.
 */
export function highlightDeletion(paper: dia.Paper, target: dia.Element): void {
    clearDeletionHighlight();
    for (const cell of getDeletedCells(paper.model, target)) {
        if (!isCellVisible(cell) || AddButtonModel.isAddButton(cell)) continue;
        const view = paper.findViewByModel(cell);
        if (!view) continue;
        highlighters.addClass.add(view, 'root', DELETE_HIGHLIGHT, { className: DELETE_HIGHLIGHT });
        highlightedViews.push(view);
    }
}

/** Takes the deletion highlight off. */
export function clearDeletionHighlight(): void {
    for (const view of highlightedViews) highlighters.addClass.remove(view, DELETE_HIGHLIGHT);
    highlightedViews = [];
}


/** The class on the cells a hovered "move" item would move: the teal of a move in progress (see the stylesheet). */
const MOVE_HIGHLIGHT = 'to-be-moved';

/** The views marked at the moment as about to move, to unmark them. */
let moveHighlightedViews: dia.CellView[] = [];

/** Marks `cells` - the visible ones - as what a move would take, by a class on their views; what was marked before is unmarked first. */
export function highlightMove(paper: dia.Paper, cells: Iterable<dia.Cell>): void {
    clearMoveHighlight();
    for (const cell of cells) {
        if (!isCellVisible(cell)) continue;
        const view = paper.findViewByModel(cell);
        if (!view) continue;
        highlighters.addClass.add(view, 'root', MOVE_HIGHLIGHT, { className: MOVE_HIGHLIGHT });
        moveHighlightedViews.push(view);
    }
}

/** Takes the mark of a move about to happen off. */
export function clearMoveHighlight(): void {
    for (const view of moveHighlightedViews) highlighters.addClass.remove(view, MOVE_HIGHLIGHT);
    moveHighlightedViews = [];
}

/** The class on the faded cells - what a hovered collapse button would hide: light colors (see the stylesheet). */
const FADED_CLASS = 'faded';

/** The views faded at the moment, to restore them. */
let fadedViews: dia.CellView[] = [];

/** Fades `cells` - the visible ones - by a class on their views; what was faded before is restored first. */
export function fadeCells(paper: dia.Paper, cells: Iterable<dia.Cell>): void {
    clearFaded();
    for (const cell of cells) {
        if (!isCellVisible(cell)) continue;
        const view = paper.findViewByModel(cell);
        if (!view) continue;
        highlighters.addClass.add(view, 'root', FADED_CLASS, { className: FADED_CLASS });
        fadedViews.push(view);
    }
}

/** Restores the faded cells. */
export function clearFaded(): void {
    for (const view of fadedViews) highlighters.addClass.remove(view, FADED_CLASS);
    fadedViews = [];
}

/**
 * Fades what a collapse of `group` would hide - its content, nested groups
 * included, and the links of the content. The start of the group stays: it
 * stands in for the collapsed group. Nothing for a group already collapsed.
 */
export function highlightCollapse(paper: dia.Paper, group: GroupModel): void {
    if (group.isCollapsed()) {
        clearFaded();
        return;
    }
    const start = group.getStart();
    const content = group.getEmbeddedCells({ deep: true }).filter((cell) => cell !== start);
    const links = content.filter((cell) => cell.isElement()).flatMap((cell) => paper.model.getConnectedLinks(cell));
    fadeCells(paper, new Set([...content, ...links]));
}

/** The classes on the cells of the subtree being moved - faded, and out of reach - and on the buttons that cannot take it - hidden. */
const MOVING_CLASS = 'moving';
const NO_DROP_CLASS = 'no-drop';

/** The views marked for the move at the moment, to unmark them. */
let markedViews: { view: dia.CellView; className: string }[] = [];

/**
 * Marks the move in progress: the subtree that moves - faded, its links
 * and buttons included - and the elements whose add button cannot take it,
 * whose button is hidden. Nothing while no move is on: the marks of the
 * last one come off.
 */
export function markMove(paper: dia.Paper, movedCells: dia.Cell[] | null, canDropBelow: (parent: dia.Element) => boolean): void {
    for (const { view, className } of markedViews) highlighters.addClass.remove(view, className);
    markedViews = [];
    if (!movedCells) return;
    const mark = (cell: dia.Cell, className: string): void => {
        const view = isCellVisible(cell) ? paper.findViewByModel(cell) : undefined;
        if (!view) return;
        highlighters.addClass.add(view, 'root', className, { className });
        markedViews.push({ view, className });
    };
    for (const cell of movedCells) mark(cell, MOVING_CLASS);
    for (const element of paper.model.getElements()) {
        const hasPillButton = GroupStartModel.isGroupStart(element) ? element.getKind() === 'fork' : DecisionModel.isDecision(element);
        if (hasPillButton) {
            if (!canDropBelow(element)) mark(element, NO_DROP_CLASS);
        } else if (AddButtonModel.isAddButton(element)) {
            const [parent] = paper.model.getNeighbors(element, { inbound: true });
            if (parent && !canDropBelow(parent)) {
                // The button goes with its link: a link into nothing would hang from the leaf.
                mark(element, NO_DROP_CLASS);
                for (const link of paper.model.getConnectedLinks(element, { inbound: true })) mark(link, NO_DROP_CLASS);
            }
        }
    }
}
