import type { SymbolProps } from '../types';
import { FittingBody } from './fitting';

/** An end cap: a dome closing the pipe. */
export function EndCapDrawing({ width, height, surface }: SymbolProps) {
    const d = `M 0 0 H ${0.5 * width} A ${0.5 * width} ${0.5 * height} 0 0 1 ${0.5 * width} ${height} H 0 Z`;
    return <FittingBody d={d} surface={surface} />;
}
