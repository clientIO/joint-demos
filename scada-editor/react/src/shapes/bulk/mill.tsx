import { Directional } from '../directional';
import type { SymbolProps } from '../types';
import './bulk.css';

/** The pattern of the liners inside the drum: their width along it and the gap after each (see `bulk.css`). */
const LINER_PATTERN = '4 16';
// The piers under the drum (parts of the width).
const PIERS = [0.08, 0.92];

/** A pier under the drum at `x`. */
const pier = (x: number, height: number) => `M ${x - 16} ${height} L ${x - 8} ${0.6 * height} H ${x + 8} L ${x + 16} ${height} Z`;

/**
 * A ball mill: a turning drum (its liners moving round while it runs) grinding the material fed in on the left,
 * the powder out on the right.
 */
export function MillDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <path
                d={PIERS.map((at) => pier(at * width, height)).join(' ')}
                fill={surface.styled('accent', 'var(--shape-support)')}
                stroke="#333"
                strokeWidth={2}
                strokeLinejoin="round"
            />
            {/* The hollow shafts the drum turns on, the material in and out through them. */}
            <rect y={0.3 * height} width={width} height={0.2 * height} strokeWidth={1.5} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            <rect
                x={0.14 * width}
                y={0.08 * height}
                width={0.72 * width}
                height={0.64 * height}
                rx={8}
                ry={8}
                strokeWidth={2}
                {...surface.fill('pipe')}
                {...surface.stroke('edge')}
            />
            {/* A dashed stroke as wide as the drum is tall. */}
            <path
                className="scada-liners"
                d={`M ${0.14 * width + 6} ${0.4 * height} H ${0.86 * width - 6}`}
                stroke="var(--shape-metal-dark-edge)"
                strokeOpacity={0.35}
                strokeWidth={52}
                strokeDasharray={LINER_PATTERN}
                pointerEvents="none"
            />
            <Directional>
                <rect x={0.68 * width - 6} y={0} width={12} height={0.8 * height} rx={2} ry={2} strokeWidth={1.5} {...surface.fill('dark')} {...surface.stroke('edge')} />
                <rect x={0.02 * width} y={-10} width={16} height={0.3 * height + 10} strokeWidth={1.5} {...surface.fill('pipe')} {...surface.stroke('edge')} />
                <rect x={0.98 * width - 16} y={0.5 * height} width={16} height={0.3 * height} strokeWidth={1.5} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            </Directional>
        </>
    );
}
