import { PipeThrough } from '../parts';
import type { SymbolProps } from '../types';
import { BowTie, Lever } from './valve-body';
import { isOpen } from './valve-state';

/** A ball valve: the bore of the ball along the flow when open, across it when closed. */
export function BallValveDrawing({ width, height, data, surface }: SymbolProps) {
    const [cx, cy] = [width / 2, height / 2];
    return (
        <>
            <PipeThrough width={width} height={height} surface={surface} />
            <Lever width={width} height={height} />
            <BowTie width={width} height={height} />
            <circle cx={cx} cy={cy} r={11} stroke="#333" strokeWidth={2} {...surface.fill('sphere')} />
            <path
                d="M -7 0 H 7"
                transform={`translate(${cx}, ${cy}) rotate(${isOpen(data) ? 0 : 90})`}
                stroke="#333"
                strokeWidth={4}
                strokeLinecap="round"
            />
        </>
    );
}
