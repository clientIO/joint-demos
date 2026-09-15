import { createContext, useContext } from 'react';
import type { DetailMode } from '@/detail';

/**
 * The toolbar's detail picker, read by every node.
 *
 * A context rather than a `renderElement` prop: `renderElement` is a `<Paper>`
 * prop, so threading the mode through it would hand the paper a new callback
 * identity every time the picker moved. The nodes are rendered into portals,
 * and a portal keeps the React tree it was created in — so a provider above
 * `<Diagram>` reaches them.
 *
 * Changing it re-renders every mounted node, which is the point of the control:
 * it is a deliberate switch, not something that moves while you pan.
 */
export const DetailContext = createContext<DetailMode>('auto');

/** The current detail mode: `'auto'` follows the zoom, anything else pins a level. */
export function useDetailMode(): DetailMode {
    return useContext(DetailContext);
}
