import type { SymbolProps } from '../types';

// The saddles the tank rests on (parts of the width).
const SADDLES = [0.22, 0.78];

/** A saddle under the tank at `x`, from inside the shell to the ground. */
const saddle = (x: number, height: number) => `M ${x - 16} ${height + 12} L ${x - 10} ${height - 8} H ${x + 10} L ${x + 16} ${height + 12} Z`;

/** A horizontal storage tank ("bullet") on two saddles: its manhole and vent on top, the welds of its shell rings. */
export function HorizontalTankDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <path
                d={SADDLES.map((at) => saddle(at * width, height)).join(' ')}
                fill={surface.styled('accent', 'var(--shape-support)')}
                stroke="#333"
                strokeWidth={1.5}
            />
            <rect x={0.3 * width - 12} y={-10} width={24} height={12} rx={2} ry={2} strokeWidth={2} {...surface.fill('flat-2')} {...surface.stroke('edge')} />
            <rect x={0.7 * width - 5} y={-16} width={10} height={18} strokeWidth={2} {...surface.fill('flat-2')} {...surface.stroke('edge')} />
            <rect width={width} height={height} rx={0.4 * height} ry={0.5 * height} strokeWidth={3} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            <path
                d={`M ${0.35 * width} 2 V ${height - 2} M ${0.65 * width} 2 V ${height - 2}`}
                strokeOpacity={0.5}
                strokeWidth={1.5}
                {...surface.stroke('edge')}
            />
        </>
    );
}
