import { useEffect, type RefObject } from 'react';

// While `active` (a name field is being edited), commit — leave edit mode — on any
// pointer-down OUTSIDE `ref`. The name inputs already commit on blur, but selecting
// another cell by its BODY in the joint paper doesn't reliably blur the input (joint
// handles the pointer-down and focus doesn't move), so a stale edit box lingers open
// on the previous table (the "only one active edit at a time" report). Capture phase
// so it runs before joint's own handling; the ref guard keeps clicks INSIDE the field
// (moving the caret, selecting text) from committing.
export function useCommitOnOutside(
    active: boolean,
    ref: RefObject<HTMLElement | null>,
    commit: () => void,
): void {
    useEffect(() => {
        if (!active) return;
        function onPointerDown(event: PointerEvent): void {
            const target = event.target;
            if (ref.current && target instanceof Node && !ref.current.contains(target)) commit();
        }
        document.addEventListener('pointerdown', onPointerDown, true);
        return () => document.removeEventListener('pointerdown', onPointerDown, true);
    }, [active, ref, commit]);
}
