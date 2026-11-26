import { PipeThrough } from '../parts';
import type { SymbolProps } from '../types';

// The spring inside the bonnet: a zig-zag of 7 points between the heights 0.08 and 0.42 (of the height).
const SPRING_POINTS = Array.from({ length: 7 }, (_, index) => ({
    x: index % 2 === 0 ? 0.35 : 0.65,
    y: Number((0.08 + index * (0.34 / 6)).toFixed(3)),
}));

/** A relief valve: the bonnet with its spring and cap on top, the bow tie in the bottom half the pipes enter. */
export function ReliefValveDrawing({ width, height, surface }: SymbolProps) {
    const spring = SPRING_POINTS.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x * width} ${y * height}`).join(' ');
    return (
        <>
            <PipeThrough width={width} height={height} surface={surface} ratio={0.75} />
            <rect
                x={0.2 * width}
                y={0}
                width={0.6 * width}
                height={0.5 * height}
                rx={4}
                ry={4}
                strokeWidth={2}
                {...surface.fill('cylinder')}
                {...surface.stroke('edge')}
            />
            <path d={spring} fill="none" stroke="#ED2637" strokeWidth={2} strokeLinejoin="round" />
            <rect
                x={0.3 * width}
                y={-8}
                width={0.4 * width}
                height={10}
                rx={2}
                ry={2}
                stroke="#333"
                strokeWidth={1.5}
                fill={surface.styled('accent', 'var(--shape-cap)')}
            />
            <path
                d={`M 0 ${0.5 * height} L ${width} ${height} V ${0.5 * height} L 0 ${height} Z`}
                fill="var(--shape-face)"
                stroke="var(--shape-valve-stroke)"
                strokeWidth={2}
                strokeLinejoin="round"
            />
        </>
    );
}
