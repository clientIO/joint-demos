import type { dia, mvc } from '@joint/plus';
import type { CellId } from '@joint/react-plus';
import { isShapeData } from '../shapes/shape-data';

/*
 * The levels of the groups: a click on a member selects the group it is in (the outermost one), a click on a member
 * of the selected group one level further in; `Escape` one level up.
 */

/** How far a group's frame is around its members. */
export const GROUP_PADDING = 10;
// The change of a group by its fitting: not fitted again for it.
const FIT_OPTIONS = { padding: GROUP_PADDING, skipHistory: true, isGroupFit: true };
// A fitting in a step of the history that changes the members (an undo of it gets the size back).
const RECORDED_FIT_OPTIONS = { padding: GROUP_PADDING, isGroupFit: true };

/** The groups the cell is in fitted to their members, from the inside out (`recorded`: in the step of the history). */
export function fitGroupsOf(cell: dia.Cell, { recorded = false } = {}): void {
    for (const group of cell.getAncestors()) {
        if (group.isElement() && isGroupCell(group)) {
            group.fitToChildren(recorded ? RECORDED_FIT_OPTIONS : FIT_OPTIONS);
        }
    }
}

/** Whether the cell is a group. */
export function isGroupCell(cell: dia.Cell | null | undefined): boolean {
    const data: unknown = cell?.get('data');
    return isShapeData(data) && data.kind === 'Group';
}

/** The id of the group the cell is in, `null` out of any. */
export function parentIdOf(cell: dia.Cell): string | null {
    const parent = cell.getParentCell();
    return parent ? String(parent.id) : null;
}

/** The cell and its groups, from the cell up. */
function withGroups(cell: dia.Cell): dia.Cell[] {
    return [cell, ...cell.getAncestors()];
}

/** The outermost group the cell is in, or the cell itself. */
function topGroup(cell: dia.Cell): dia.Cell {
    return cell.getAncestors().at(-1) ?? cell;
}

/**
 * What a click on the cell selects, given what was selected before: its top group, or one level further in when that
 * group (or a group in it) is selected; with a member of a group selected, the cell (or its group) at the same level.
 * `null` - it is selected already.
 */
export function clickTarget(selected: readonly dia.Cell[], clicked: dia.Cell): dia.Cell | null {
    const levels = withGroups(clicked);
    const single = selected.length === 1 ? selected[0] : undefined;
    const index = single ? levels.indexOf(single) : -1;
    if (index === 0) {
        return null;
    }
    const target = index > 0
        ? levels[index - 1]
        : (single && levels.find((level) => parentIdOf(level) === parentIdOf(single))) || topGroup(clicked);
    return selected.includes(target) ? null : target;
}

/**
 * The selection after a click with Cmd / Ctrl on the cell: the cell of the level of the selection (it, or its group in
 * the same group as the selected cells) added or removed - not one of another level. The only selected group stays
 * selected (`Escape` clears it).
 */
export function toggledSelection(selected: readonly dia.Cell[], clicked: dia.Cell): readonly dia.Cell[] {
    if (selected.length === 0) {
        return [topGroup(clicked)];
    }
    const level = parentIdOf(selected[0]);
    const sibling = withGroups(clicked).find((cell) => parentIdOf(cell) === level);
    if (!sibling || (sibling !== clicked && selected.length === 1 && selected.includes(sibling))) {
        return selected;
    }
    return selected.includes(sibling) ? selected.filter((cell) => cell !== sibling) : [...selected, sibling];
}

/** `Escape`: the group of the single selected member (one level up), or nothing. */
export function levelUp(selection: mvc.Collection<dia.Cell>): readonly dia.Cell[] {
    const single = selection.length === 1 ? selection.at(0) : undefined;
    const parent = single?.getParentCell();
    return parent ? [parent] : [];
}

/** How many elements are in the group (its own members): a number, so a badge re-renders only when it changes. */
export const memberCountOf = (cells: ReadonlyArray<{ readonly type: string; readonly parent?: CellId }>, groupId: CellId): number =>
    cells.reduce((count, cell) => (cell.type === 'element' && cell.parent === groupId ? count + 1 : count), 0);
