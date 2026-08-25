import { useEffect } from 'react';
import { FreeTransform, useCellId, useGraph, useIsCellSelected } from '@joint/react-plus';
import { GroupContainer } from './group-container';
import { Z_GROUP, Z_GROUP_SELECTED } from '@/model/z-order';

// A group renders its container plus, WHEN selected, resize handles. It is its own
// component so `useIsCellSelected` (a hook) is called unconditionally. FreeTransform
// inside `renderElement` needs no `cell` prop — it targets the rendered element from
// context. Rotation is off: a tilted ERD container helps no one; users only resize.
export function GroupElement() {
    const isSelected = useIsCellSelected();
    const id = useCellId();
    const { setCell } = useGraph();

    // Lift the SELECTED group above the other group containers so it's never buried
    // when two groups overlap (the "enlarging Product hid Identity" report).
    // `skipHistory` keeps this presentation-only z-raise off the undo stack (the
    // exact use case the Diagram history docs call out); use-z-order leaves
    // Z_GROUP_SELECTED alone, and this drops back to Z_GROUP on deselect.
    useEffect(() => {
        const z = isSelected ? Z_GROUP_SELECTED : Z_GROUP;
        setCell(id, (previous) => (previous.z === z ? previous : { ...previous, z }), {
            skipHistory: true,
        });
    }, [isSelected, id, setCell]);

    return (
        <>
            <GroupContainer />
            {isSelected && <FreeTransform allowRotation={false} minWidth={200} minHeight={120} />}
        </>
    );
}
