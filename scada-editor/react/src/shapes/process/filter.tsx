import type { SymbolProps } from '../types';

/** A filter: its housing, the filter element across it, the cap on the top. */
export function FilterDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <rect width={width} height={height} rx={8} ry={8} strokeWidth={3} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <path
                d={`M ${0.15 * width} ${0.85 * height} L ${0.85 * width} ${0.15 * height}`}
                stroke="var(--shape-surface-ink)"
                strokeWidth={3}
                strokeDasharray="6,4"
                strokeLinecap="round"
            />
            <rect
                x={0.2 * width}
                y={-8}
                width={0.6 * width}
                height={10}
                rx={2}
                ry={2}
                fill={surface.styled('accent', 'var(--shape-cap)')}
                stroke="#333"
                strokeWidth={2}
            />
        </>
    );
}
