import type { Overflow, ShapePorts, Side } from '../types';

/** How far the pipe stubs reach out of a fitting. */
export const FITTING_STUB_LENGTH = 20;

/** The stubs of a fitting: one in the middle of each of the sides, named after it; flat where they meet it (no tuck). */
export function fittingPorts(sides: readonly Side[]): ShapePorts {
    return {
        stubLength: FITTING_STUB_LENGTH,
        tuck: 0,
        stubs: sides.map((side) => ({ id: side, side })),
    };
}

/** The stubs above and below counted out of the box, as the fittings of the TypeScript editor count them; no label. */
export function fittingOverflow(sides: readonly Side[]): Overflow {
    return {
        top: sides.includes('top') ? FITTING_STUB_LENGTH : 0,
        bottom: sides.includes('bottom') ? FITTING_STUB_LENGTH : 0,
    };
}

/** The outline of a fitting: a square with rounded corners. */
export function roundedFittingPath(width: number, height: number): string {
    return `M 0 8 Q 0 0 8 0 H ${width - 8} Q ${width} 0 ${width} 8 V ${height - 8} `
        + `Q ${width} ${height} ${width - 8} ${height} H 8 Q 0 ${height} 0 ${height - 8} Z`;
}
