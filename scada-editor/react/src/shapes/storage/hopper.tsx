import type { SymbolProps } from '../types';

/** An open bin narrowing into a chute at the bottom: the material in it, the rim around its top. */
export function HopperDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <path
                d={`M 0 0 H ${width} L ${0.62 * width} ${0.75 * height} V ${height} H ${0.38 * width} V ${0.75 * height} Z`}
                strokeWidth={2}
                strokeLinejoin="round"
                {...surface.fill('cone')}
                {...surface.stroke('edge')}
            />
            <path
                d={`M ${0.12 * width} ${0.2 * height} Q ${0.5 * width} 2 ${0.88 * width} ${0.2 * height} Z`}
                fill={surface.styled('accent', 'var(--shape-hopper-material)')}
                stroke="#5e4f3d"
                strokeWidth={1}
            />
            <rect
                x={-4}
                y={-4}
                width={width + 8}
                height={8}
                rx={2}
                ry={2}
                strokeWidth={1.5}
                {...surface.fill('mid')}
                {...surface.stroke('var(--shape-metal-dark-edge)')}
            />
        </>
    );
}
