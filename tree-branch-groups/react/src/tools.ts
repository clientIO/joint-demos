import { g, highlighters } from '@joint/plus';
import type { dia } from '@joint/plus';

import { getDeletedCells } from './actions';
import { isCellVisible } from './layout';
import { AddButton, Decision, End, Group, GroupEnd, GroupStart, INSERT_BUTTON_FROM_TARGET, INSERT_BUTTON_SIZE } from './shapes';

/**
 * The state of the picture that is not the data: the highlights of a
 * deletion about to happen and of a move in progress - classes on the views
 * of the cells - and where the button of a link goes. The views are
 * JointJS's; the classes reach the React components rendered inside them
 * through the stylesheet.
 */

/**
 * The element the menu of `element` acts on - and the `Delete` key, when
 * it is selected: a node acts on itself, the `start` of a group on the
 * group. The `end` of a group and the add buttons have no menu.
 */
export function getActionTarget(element: dia.Element): dia.Element | null {
    if (GroupStart.isGroupStart(element)) return element.getParentCell() as Group;
    if (GroupEnd.isGroupEnd(element) || AddButton.isAddButton(element)) return null;
    return element;
}

/** The item of the menu that removes `target`: "Remove" and what it is - a loop, a fork, a decision, an end, a step. */
export function getDeleteTitle(target: dia.Element): string {
    if (Group.isGroup(target)) return `Remove the ${target.getKind()}`;
    if (Decision.isDecision(target)) return 'Remove the decision';
    if (End.isEnd(target)) return 'Remove the end';
    return 'Remove the step';
}

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
        if (!isCellVisible(cell) || AddButton.isAddButton(cell)) continue;
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

/** The classes on the cells of the subtree being moved, and on the buttons that cannot take it - hidden. */
const MOVING_CLASS = 'moving';
const NO_DROP_CLASS = 'no-drop';

/** The views marked for the move at the moment, to unmark them. */
let markedViews: { view: dia.CellView; className: string }[] = [];

/**
 * Marks the move in progress: the subtree that moves - dimmed, its links
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
        const hasPillButton = GroupStart.isGroupStart(element) ? element.getKind() === 'fork' : Decision.isDecision(element);
        if (hasPillButton) {
            if (!canDropBelow(element)) mark(element, NO_DROP_CLASS);
        } else if (AddButton.isAddButton(element)) {
            const [parent] = paper.model.getNeighbors(element, { inbound: true });
            if (parent && !canDropBelow(parent)) mark(element, NO_DROP_CLASS);
        }
    }
}

/**
 * Whether the link out of `element` has something right below the element:
 * the collapse button of a collapsed group, or the return link of a loop,
 * which leaves the link below the loop and joins it below the loop's start.
 */
function hasSomethingBelow(element: dia.Element): boolean {
    if (Group.isGroup(element)) return element.isCollapsed() || element.getKind() === 'loop';
    return GroupStart.isGroupStart(element) && element.getKind() === 'loop';
}

/**
 * Whether `element` is the end of a loop: the link into it from a leaf gets
 * its insert button a fixed distance below the leaf, the mirror image of the
 * link out of the loop's start, whose button sits a fixed distance above its
 * child - the return link runs at equal distances around both.
 */
function isLoopEnd(element: dia.Element): boolean {
    return GroupEnd.isGroupEnd(element) && element.getGroup().getKind() === 'loop';
}

/**
 * Where the button of a link goes, given the points of its route - the
 * source point, the vertices, the target point: the middle of its longest
 * vertical part - the part the link has of its own, not the one it shares
 * with its siblings on a bar, and never a horizontal part. When the link
 * leaves an element with something right below it (see
 * `hasSomethingBelow()`) the button sits near the child instead, a fixed
 * distance from the target, whatever room the link was given; when it joins
 * the end of a loop, a fixed distance from the source (see `isLoopEnd()`).
 * `null` for a link without a vertical part.
 */
export function getInsertButtonPoint(points: g.PlainPoint[], source: dia.Element, target: dia.Element): g.Point | null {
    let longest: g.Line | null = null;
    let longestIndex = -1;
    for (let i = 0; i < points.length - 1; i++) {
        const segment = new g.Line(points[i], points[i + 1]);
        if (Math.abs(segment.start.x - segment.end.x) > 0.5) continue;
        if (!longest || segment.length() > longest.length()) {
            longest = segment;
            longestIndex = i;
        }
    }
    if (!longest) return null;
    if (longestIndex === 0 && hasSomethingBelow(source)) {
        // Such a link is straight: the button sits a fixed distance above the child.
        const y = Math.max(longest.end.y - INSERT_BUTTON_FROM_TARGET, longest.start.y + INSERT_BUTTON_SIZE);
        return new g.Point(longest.start.x, y);
    }
    if (longestIndex === 0 && isLoopEnd(target)) {
        // The vertical part leaves the leaf: the button sits a fixed distance below it.
        const y = Math.min(longest.start.y + INSERT_BUTTON_FROM_TARGET, longest.end.y - INSERT_BUTTON_SIZE);
        return new g.Point(longest.start.x, y);
    }
    return longest.midpoint();
}
