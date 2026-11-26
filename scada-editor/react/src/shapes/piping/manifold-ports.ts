import type { ShapePorts } from '../types';
import { FITTING_STUB_LENGTH } from './fitting-ports';

/** The rounded ends of the header of a manifold. */
export const MANIFOLD_RADIUS = 12;

// Where the outlets are along the header (of its width).
const OUTLETS = [0.25, 0.5, 0.75];

/**
 * The inlet on the left and the outlets below. The inlet is tucked under the rounded end (no gap at its corners);
 * the outlets, flat in the TypeScript editor, are tucked as far - hidden under the header, so they look the same.
 */
export const MANIFOLD_PORTS: ShapePorts = {
    stubLength: FITTING_STUB_LENGTH,
    tuck: MANIFOLD_RADIUS,
    stubs: [
        { id: 'left', side: 'left' },
        ...OUTLETS.map((at, index) => ({ id: `out${index + 1}`, side: 'bottom' as const, at })),
    ],
};
