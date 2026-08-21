import { Halo } from '@joint/react-plus';
import { groups, defaultHandles } from '../configs/halo-config';
import { useSelectedCell } from '../hooks/use-selected-cell';

import type { AppElement } from '../shapes/shapes-typing';

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
            cell={cell}
            handles={handles}
            groups={groups}
        />
    );
}
