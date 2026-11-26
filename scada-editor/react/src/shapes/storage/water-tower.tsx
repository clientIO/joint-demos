import type { SymbolProps } from '../types';

// The tank on the top: its top and its bottom (parts of the height).
const TANK_TOP = 0.08;
const TANK_BOTTOM = 0.42;

/** An elevated water tank: the tank with a conical roof on braced legs, the riser down the middle. */
export function WaterTowerDrawing({ width, height, surface }: SymbolProps) {
    const tankTop = TANK_TOP * height;
    const tankBottom = TANK_BOTTOM * height;
    const bracing = [
        `M ${0.18 * width} ${0.5 * height} L ${0.86 * width} ${0.75 * height}`,
        `M ${0.82 * width} ${0.5 * height} L ${0.14 * width} ${0.75 * height}`,
        `M ${0.14 * width} ${0.75 * height} L ${0.9 * width} ${height}`,
        `M ${0.86 * width} ${0.75 * height} L ${0.1 * width} ${height}`,
    ].join(' ');
    return (
        <>
            <path
                d={`M ${0.2 * width} ${tankBottom} L ${0.08 * width} ${height + 6} M ${0.8 * width} ${tankBottom} L ${0.92 * width} ${height + 6}`}
                stroke="var(--shape-legs)"
                strokeWidth={6}
                strokeLinecap="round"
            />
            <path d={bracing} stroke="#777" strokeWidth={2} />
            <path d={`M ${0.5 * width} ${tankBottom} V ${height + 6}`} strokeWidth={8} {...surface.stroke('edge')} />
            <rect y={tankTop} width={width} height={tankBottom - tankTop} rx={10} ry={10} strokeWidth={3} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <path
                d={`M -4 ${tankTop} L ${0.5 * width} -16 L ${width + 4} ${tankTop} Z`}
                strokeWidth={2}
                strokeLinejoin="round"
                {...surface.fill('cone')}
                {...surface.stroke('edge')}
            />
        </>
    );
}
