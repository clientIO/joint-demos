import type { SymbolProps } from '../types';

/** A tank with a conical bottom draining whole: the cone under the shell, the seam of the top head. */
export function ConicTankDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <path
                d={`M 0 0 L ${width} 0 L ${width / 2 + 10} 70 h -20 Z`}
                transform={`translate(0, ${height - 10})`}
                strokeLinejoin="round"
                strokeWidth={2}
                {...surface.fill('cone')}
                {...surface.stroke('edge')}
            />
            <rect x={0} y={0} width={width} height={height} rx={120} ry={10} strokeWidth={4} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <rect x={0} y={20} width={width} height={20} fill="none" strokeWidth={2} {...surface.stroke('edge')} />
        </>
    );
}
