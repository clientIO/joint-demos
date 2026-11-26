import type { SymbolProps } from '../types';
import { FittingBody } from './fitting';

/** A pipe elbow: the outer corner of the turn (the top right one) is round. */
export function ElbowDrawing({ width, height, surface }: SymbolProps) {
    const d = `M 0 8 Q 0 0 8 0 H ${0.5 * width} A ${0.5 * width} ${0.5 * height} 0 0 1 ${width} ${0.5 * height} `
        + `V ${height - 8} Q ${width} ${height} ${width - 8} ${height} H 8 Q 0 ${height} 0 ${height - 8} Z`;
    return <FittingBody d={d} surface={surface} />;
}
