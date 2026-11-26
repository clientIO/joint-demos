import type { SymbolProps } from '../types';

// The trays inside the column: eight, alternating from the left and the right wall.
const TRAY_COUNT = 8;
const FIRST_TRAY = 0.15;
const TRAY_SPACING = 0.1;
// A tray reaches this far across the column from its wall.
const TRAY_REACH = 0.7;
const TRAY_WALL_GAP = 4;

/** A tall column separating a mixture on its trays: the feed on the side, the vapour out of the top, on a skirt. */
export function DistillationColumnDrawing({ width, height, surface }: SymbolProps) {
    const trays = Array.from({ length: TRAY_COUNT }, (_, index) => {
        const y = Number((FIRST_TRAY + index * TRAY_SPACING).toFixed(2)) * height;
        return index % 2 === 0
            ? `M ${TRAY_WALL_GAP} ${y} H ${TRAY_REACH * width}`
            : `M ${(1 - TRAY_REACH) * width} ${y} H ${width - TRAY_WALL_GAP}`;
    }).join(' ');
    return (
        <>
            <rect x={-12} y={0.5 * height - 6} width={14} height={12} strokeWidth={2} {...surface.fill('flat-2')} {...surface.stroke('edge')} />
            <rect x={width / 2 - 7} y={-12} width={14} height={14} strokeWidth={2} {...surface.fill('flat-2')} {...surface.stroke('edge')} />
            <path
                d={`M ${0.1 * width} ${height - 10} L 0 ${height + 12} H ${width} L ${0.9 * width} ${height - 10} Z`}
                fill={surface.styled('accent', 'var(--shape-skirt)')}
                stroke="#555"
                strokeWidth={2}
            />
            <rect width={width} height={height} rx={0.5 * width} ry={16} strokeWidth={3} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <path d={trays} strokeWidth={2} strokeDasharray="4,2" {...surface.stroke('edge')} />
        </>
    );
}
