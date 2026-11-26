import type { SymbolProps } from '../types';

/** A vertical tank on two legs: its rounded shell, the seam of the top head. */
export function LiquidTankDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <path
                d={`M 20 ${height} l -5 10 M ${width - 20} ${height} l 5 10`}
                fill="none"
                stroke="var(--shape-tank-legs)"
                strokeWidth={8}
                strokeLinecap="round"
            />
            <rect x={0} y={0} width={width} height={height} rx={120} ry={10} strokeWidth={4} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <rect x={0} y={20} width={width} height={20} fill="none" strokeWidth={2} {...surface.stroke('edge')} />
        </>
    );
}
