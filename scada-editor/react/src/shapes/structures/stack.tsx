import type { SymbolProps } from '../types';
import './structures.css';

// The stack narrows from the full width at the bottom to 60% of it at the top.
const TAPER = 0.2;
// The warning bands (from - to, parts of the height from the top).
const BANDS = [
    [0.06, 0.12],
    [0.18, 0.24],
] as const;

/** How far in a side of the stack is at a part of its height: the taper. */
const insetAt = (y: number) => TAPER * (1 - y);

/** A band across the stack from a part of the height to another, its sides along the taper. */
function band(from: number, to: number, width: number, height: number): string {
    return [
        `M ${insetAt(from) * width} ${from * height}`,
        `H ${(1 - insetAt(from)) * width}`,
        `L ${(1 - insetAt(to)) * width} ${to * height}`,
        `H ${insetAt(to) * width}`,
        'Z',
    ].join(' ');
}

/** A tapered stack with warning bands, its cap and its base, the smoke rising out of it. */
export function StackDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <g className="scada-smoke" fill="var(--shape-smoke)" fillOpacity="var(--shape-smoke-opacity)" stroke="none">
                <circle cx={0.5 * width} cy={-22} r={10} />
                <circle cx={0.5 * width + 12} cy={-40} r={13} />
                <circle cx={0.5 * width + 30} cy={-62} r={16} />
            </g>
            <path
                d={`M 0 ${height} L ${TAPER * width} 0 H ${(1 - TAPER) * width} L ${width} ${height} Z`}
                strokeWidth={2}
                strokeLinejoin="round"
                {...surface.fill('cylinder')}
                {...surface.stroke('edge')}
            />
            <path
                d={BANDS.map(([from, to]) => band(from, to, width, height)).join(' ')}
                fill={surface.styled('accent', 'var(--shape-stack-band)')}
                fillOpacity={0.85}
                stroke="none"
            />
            <rect
                x={TAPER * width - 4}
                y={-8}
                width={(1 - 2 * TAPER) * width + 8}
                height={10}
                rx={2}
                ry={2}
                strokeWidth={2}
                {...surface.fill('mid')}
                {...surface.stroke('var(--shape-metal-dark-edge)')}
            />
            <rect
                x={-8}
                y={height - 4}
                width={width + 16}
                height={12}
                strokeWidth={2}
                {...surface.fill('pale')}
                {...surface.stroke('var(--shape-metal-dark-edge)')}
            />
        </>
    );
}
