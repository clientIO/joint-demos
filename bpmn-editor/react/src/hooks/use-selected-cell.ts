import { useCallback, useSyncExternalStore } from 'react';
import { useSelectionCollection } from '@joint/react-plus';

import type { dia } from '@joint/plus';

// The single selected cell, or `null` when nothing or multiple cells are
// selected. Derived reactively from the selection collection.
export function useSelectedCell(): dia.Cell | null {
    const { collection } = useSelectionCollection();

    const subscribe = useCallback((onChange: () => void) => {
        collection.on('add remove reset', onChange);
        return () => {
            collection.off('add remove reset', onChange);
        };
    }, [collection]);

    const getSnapshot = useCallback(
        () => (collection.length === 1 ? collection.first()! : null),
        [collection]
    );

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
