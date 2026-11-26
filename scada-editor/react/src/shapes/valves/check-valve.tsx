import { Directional } from '../directional';
import { PipeThrough } from '../parts';
import type { SymbolProps } from '../types';
import { BowTie } from './valve-body';

/** A check valve: the bow tie with its inlet half filled, the arrow of the flow above it (mirrored when flipped). */
export function CheckValveDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <PipeThrough width={width} height={height} surface={surface} />
            <Directional>
                <BowTie width={width} height={height} />
                <path d={`M 0 0 L ${0.5 * width} ${0.5 * height} L 0 ${height} Z`} fill="var(--shape-valve-inlet)" />
                <path
                    d={`M ${0.2 * width} -10 H ${0.8 * width} m -6 -4 l 6 4 l -6 4`}
                    fill="none"
                    stroke="var(--shape-scale)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            </Directional>
        </>
    );
}
