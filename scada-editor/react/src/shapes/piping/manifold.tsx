import type { SymbolProps } from '../types';
import { MANIFOLD_RADIUS } from './manifold-ports';

/** A distribution header: a pipe with rounded ends, its inlet and outlets the editor's stubs. */
export function ManifoldDrawing({ width, height, surface }: SymbolProps) {
    return (
        <rect
            width={width}
            height={height}
            rx={MANIFOLD_RADIUS}
            ry={MANIFOLD_RADIUS}
            strokeWidth={2}
            {...surface.fill('pipe')}
            {...surface.stroke('edge')}
        />
    );
}
