import { Halo, type HaloOptions } from '@joint/react-plus';
import { groups, defaultHandles } from '../configs/halo-config';
import { useSelectedCell } from '../hooks/use-selected-cell';

import type { AppElement } from '../shapes/shapes-typing';

const HALO_OPTIONS: HaloOptions = {
    // Disable the loop-link routing (there is no dedicated option for it):
    // when a link is dropped back on its source element, the halo would add
    // two vertices to route it around the element's side. Our links are
    // anchored to fixed boundary points, so the extra vertices are
    // unnecessary — an Infinity loop width makes the vertices land out of
    // reach.
    loopLinkWidth: Infinity
};

export function BpmnHalo() {

    const selected = useSelectedCell();
    const cell = selected?.isElement() ? selected as AppElement : null;

    if (!cell) return null;

    const handles = [
        // Swimlanes do not utilize the default remove and unlink handles
        ...(cell.omitDefaultHaloHandles ? [] : defaultHandles),
        // Shape specific handles
        ...(cell.getHaloHandles?.() ?? [])
    ];

    return (
        <Halo
            // Remount when the model instance changes: shape morphing replaces
            // the cell with a new model under the same id, which `<Halo>` alone
            // does not detect (it compares cells by id).
            key={cell.cid}
            cell={cell}
            handles={handles}
            groups={groups}
            options={HALO_OPTIONS}
        />
    );
}
