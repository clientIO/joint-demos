import { ElementOverlay, useCells, useOnGraphEvents, useSelectionCollection, type CellId, type CellRecord, type Computed } from '@joint/react-plus';
import { dia } from '@joint/plus';
import { isShapeData } from '../shapes/shape-data';
import { fitGroupsOf, memberCountOf } from './group-levels';
import { isSameIds } from './selectors';

/*
 * The groups on the canvas: a group fits its members (a member moved on its own, resized or rotated - the groups it
 * is in fitted again, not a step of the history), a selected group shows its ID badge over its dashed frame.
 */

// The badge sits this far above the frame (px).
const BADGE_OFFSET = 4;

/** A member changed: moved on its own (not with its group), resized, rotated - its groups fitted again. */
function useGroupFitting() {
    useOnGraphEvents({
        // A change of a cell (not of the graph's own attributes: its style, its images).
        change: (cell: unknown, options: { readonly isGroupFit?: boolean; readonly translateBy?: dia.Cell.ID }) => {
            if (!(cell instanceof dia.Element) || !cell.isEmbedded() || options.isGroupFit) {
                return;
            }
            if (!('position' in cell.changed || 'size' in cell.changed || 'angle' in cell.changed)) {
                return;
            }
            // Moved with an element it is in (the group): the group moves as a whole.
            if (options.translateBy !== undefined && options.translateBy !== cell.id) {
                return;
            }
            fitGroupsOf(cell);
        },
    });
}

const selectGroupIds = (cells: ReadonlyArray<Computed<CellRecord>>): readonly CellId[] =>
    cells.flatMap((cell) => (isShapeData(cell.data) && cell.data.kind === 'Group' ? [cell.id] : []));

/** The ID of the group as its badge shows it (`Group` when it has none); `null` while the store doesn't have the group. */
const selectGroupTag = (cell: Computed<CellRecord> | undefined): string | null => {
    if (!cell) {
        return null;
    }
    return isShapeData(cell.data) && cell.data.tag ? cell.data.tag : 'Group';
};

/** The badge of a selected group: its ID and how many elements it has (`⧉ GRP-101 · 2`), following both (an edit, an undo). */
function GroupBadge({ id }: { readonly id: CellId }) {
    // By `useCells`: a group selected as it is made is not in the store yet (`useCell` would throw, and so would
    // the overlay of a cell the store doesn't have): the badge shows once it is.
    const tag = useCells(id, selectGroupTag);
    const count = useCells((cells) => memberCountOf(cells, id));
    if (tag === null) {
        return null;
    }
    return (
        <ElementOverlay cell={id} position="top-left" origin="bottom-left" dy={-BADGE_OFFSET} className="scada-group-badge">
            {`⧉ ${tag} · ${count}`}
        </ElementOverlay>
    );
}

/** The groups of the diagram while editing: fitted to their members, the selected ones with their badges. */
export function GroupFrames() {
    useGroupFitting();
    const { collection } = useSelectionCollection();
    const ids = useCells(collection, selectGroupIds, isSameIds);
    return ids.map((id) => <GroupBadge key={id} id={id} />);
}
