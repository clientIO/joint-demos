import { PipeThrough } from '../parts';
import type { SymbolProps } from '../types';
import { BowTie, Lever } from './valve-body';
import { isOpen } from './valve-state';

/** A butterfly valve: the disc along the flow when open, across it when closed; its pivot in the middle. */
export function ButterflyValveDrawing({ width, height, data, surface }: SymbolProps) {
    const [cx, cy] = [width / 2, height / 2];
    return (
        <>
            <PipeThrough width={width} height={height} surface={surface} />
            <Lever width={width} height={height} />
            <BowTie width={width} height={height} />
            <path
                d="M 0 -16 V 16"
                transform={`translate(${cx}, ${cy}) rotate(${isOpen(data) ? 90 : 0})`}
                stroke="#333"
                strokeWidth={5}
                strokeLinecap="round"
            />
            <circle cx={cx} cy={cy} r={4} fill={surface.styled('accent', 'var(--shape-pivot)')} />
        </>
    );
}
