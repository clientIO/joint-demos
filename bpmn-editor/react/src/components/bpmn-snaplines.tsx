import { useEffect, useRef } from 'react';
import { Snaplines } from '@joint/react-plus';
import { bpmnCanSnap } from '../configs/paper-config';
import { registerSnaplines } from '../dnd/boundary-snap';

import type { ui } from '@joint/plus';

// Snaplines with boundary-event awareness: while a dragged event snaps to an
// activity border, the snaplines are disabled (see `setBoundarySnapActive`).
export function BpmnSnaplines() {

    const snaplinesRef = useRef<ui.Snaplines>(null);

    useEffect(() => {
        return registerSnaplines(snaplinesRef.current!);
    }, []);

    return <Snaplines ref={snaplinesRef} canSnap={bpmnCanSnap} />;
}
