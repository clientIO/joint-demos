import type { SymbolProps } from '../types';
import { busbarTapCount, busbarTapX } from './electrical';

/** A busbar: the copper bar on its porcelain supports, a bolt at each of its taps (as many as its length takes). */
export function BusbarDrawing({ width: w, height: h, surface }: SymbolProps) {
    const taps = Array.from({ length: busbarTapCount(w) }, (_, i) => i);
    const bolts = taps.map((i) => `M ${busbarTapX(i)} ${0.5 * h} h 0.01`).join(' ') || 'M 0 0';
    return (
        <>
            <path d={`M 8 ${h} V ${h + 10} M ${w - 8} ${h} V ${h + 10}`} stroke="var(--shape-porcelain-3)" strokeWidth={8} />
            <rect width={w} height={h} rx={2} ry={2} stroke="var(--shape-copper-3)" strokeWidth={1.5} {...surface.material('copper')} />
            <path d={bolts} stroke="#5a3417" strokeWidth={5} strokeLinecap="round" />
        </>
    );
}
