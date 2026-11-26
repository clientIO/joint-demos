import type { SymbolProps } from '../types';

/** A join: an octagon where the pipes meet, in the colors of a fitting. */
export function JoinDrawing({ width, height, surface }: SymbolProps) {
    return (
        <path
            d={`M 10 0 H ${width - 10} l 10 10 V ${height - 10} l -10 10 H 10 l -10 -10 V 10 Z`}
            strokeWidth={2}
            {...surface.fill('var(--shape-fitting-fill)')}
            {...surface.stroke('var(--shape-fitting-stroke)')}
        />
    );
}
