import { useEffect, useState } from 'react';

import type { dia } from '@joint/plus';

// Re-render the consumer whenever the cell changes (attribute updates,
// undo/redo, marker changes, ...). Returns a monotonically increasing number
// usable as an effect dependency.
export function useCellVersion(cell: dia.Cell | null): number {
    const [version, setVersion] = useState(0);

    useEffect(() => {
        if (!cell) return;
        const bump = () => setVersion((v) => v + 1);
        cell.on('change', bump);
        return () => {
            cell.off('change', bump);
        };
    }, [cell]);

    return version;
}
