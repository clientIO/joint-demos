// Collapsed-child visibility for groups. Pure — derived from the model tree, no
// state, no effect, no geometry mutation.
//
// Collapse GEOMETRY flows through the controlled cells (setCell in
// group-container.tsx via group-collapse.ts), because a raw `dia.Element.resize()`
// is overwritten by the next controlled-cells render. This hook only decides what
// stays visible while a group is collapsed — used by the main <Paper> AND the
// minimap (see `isCellVisibleUnderCollapse`, which the Navigator's native
// `cellVisibility` escape hatch consumes so the minimap hides collapsed cells too).
// @todo maybe good candidate for a library!

import { type CellVisibility } from '@joint/react-plus';

// The cell model handed to a CellVisibility callback is a `dia.Cell`; pull the
// type off the public callback so we need no raw `@joint/core` import.
type VisibilityCell = Parameters<CellVisibility>[0]['model'];

const COLLAPSED_PATH = 'data/group/collapsed';

function underCollapsedGroup(cell: VisibilityCell): boolean {
    return cell
        .getAncestors()
        .some((ancestor) => ancestor.prop(COLLAPSED_PATH) === true);
}

// Should this cell render? A table (or a relation touching one) hides when it
// lives under a collapsed group. Shared by the Paper and the minimap so both
// agree; `model.isLink()` narrows to a link so the endpoint lookups are typed.
export function isCellVisibleUnderCollapse(model: VisibilityCell): boolean {
    if (model.isLink()) {
        const source = model.getSourceCell();
        const target = model.getTargetCell();
        if (source && underCollapsedGroup(source)) return false;
        if (target && underCollapsedGroup(target)) return false;
        return true;
    }
    return !underCollapsedGroup(model);
}

// The predicate captures nothing, so it's one module-level constant — no hook
// machinery needed for a stable identity.
const collapseAwareVisibility: CellVisibility = ({ model }) => isCellVisibleUnderCollapse(model);

export function useContainerResize(): CellVisibility {
    return collapseAwareVisibility;
}
