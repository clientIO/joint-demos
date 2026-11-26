import type { SymbolProps } from '../types';

// The metal caps on the ends of the cartridge: how wide
const CAP = 14;

/** A fuse: a ceramic cartridge between metal caps, its rating on it. */
export function FuseDrawing({ width: w, height: h, surface }: SymbolProps) {
    return (
        <>
            <rect x={CAP - 2} y={3} width={w - 2 * (CAP - 2)} height={h - 6} stroke="var(--shape-porcelain-3)" strokeWidth={1.5} {...surface.material('porcelain')} />
            <rect width={CAP} height={h} rx={3} ry={3} strokeWidth={1.5} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            <rect x={w - CAP} width={CAP} height={h} rx={3} ry={3} strokeWidth={1.5} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            <text x={0.5 * w} y={0.5 * h} dy="0.3em" textAnchor="middle" fontSize={11} fontFamily="sans-serif" fontWeight="bold" fill="#6b5b3a">
                63 A
            </text>
        </>
    );
}
