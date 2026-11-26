import type { SymbolProps } from '../types';

// The saddles the vessel rests on (parts of the width).
const SADDLES = [0.25, 0.75];

/** A horizontal two-phase separator: the liquid settles at the bottom, the gas leaves through the top. */
export function SeparatorDrawing({ width, height, surface }: SymbolProps) {
    const saddles = SADDLES.map((at) => {
        const x = at * width;
        return `M ${x - 14} ${height + 12} L ${x - 8} ${height - 6} H ${x + 8} L ${x + 14} ${height + 12} Z`;
    }).join(' ');
    return (
        <>
            <path d={saddles} fill={surface.styled('accent', 'var(--shape-support)')} stroke="#333" strokeWidth={1.5} />
            <rect x={0.5 * width - 8} y={-12} width={16} height={14} strokeWidth={2} {...surface.fill('flat-2')} {...surface.stroke('edge')} />
            <rect width={width} height={height} rx={0.5 * height} ry={0.5 * height} strokeWidth={3} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            {/* The liquid in the bottom third. */}
            <path
                d={`M ${0.12 * width} ${0.68 * height} H ${0.88 * width}`}
                stroke="var(--shape-liquid)"
                strokeOpacity={0.7}
                strokeWidth={3}
                strokeDasharray="10,5"
            />
            {/* The mist eliminator near the gas outlet. */}
            <rect x={0.72 * width} y={0.15 * height} width={10} height={0.4 * height} fill="none" stroke="#555" strokeWidth={2} strokeDasharray="3,2" />
        </>
    );
}
