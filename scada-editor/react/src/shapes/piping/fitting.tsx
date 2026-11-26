import type { SymbolProps } from '../types';
import { roundedFittingPath } from './fitting-ports';

interface FittingBodyProps extends Pick<SymbolProps, 'surface'> {
    /** The outline of the body. */
    readonly d: string;
}

/** The small metal body of a pipe fitting; the stubs on its sides are the editor's. */
export function FittingBody({ d, surface }: FittingBodyProps) {
    return <path d={d} strokeWidth={2} {...surface.fill('sphere')} {...surface.stroke('edge')} />;
}

/** A fitting of a square body with rounded corners: a tee, a cross. */
export function FittingDrawing({ width, height, surface }: SymbolProps) {
    return <FittingBody d={roundedFittingPath(width, height)} surface={surface} />;
}
