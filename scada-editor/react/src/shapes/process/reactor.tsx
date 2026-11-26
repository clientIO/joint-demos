import type { SymbolProps } from '../types';
import './process.css';

// The impeller of the agitator, at this part of the height.
const IMPELLER_AT = 0.75;
const IMPELLER = 'M -24 0 H 24 M -24 -6 V 6 M 24 -6 V 6';

/** A jacketed reactor: a vessel with dished ends on its legs, a heating jacket and an agitator. */
export function ReactorDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <path
                d={`M 16 ${height - 20} V ${height + 10} M ${width - 16} ${height - 20} V ${height + 10}`}
                stroke="var(--shape-legs)"
                strokeWidth={6}
                strokeLinecap="round"
            />
            {/* The jacket around the lower part of the vessel. */}
            <rect x={-6} y={0.35 * height} width={width + 12} height={0.55 * height} rx={10} ry={10} fill="#9aa3ab" strokeWidth={2} {...surface.stroke('edge')} />
            <rect width={width} height={height} rx={0.5 * width} ry={24} strokeWidth={3} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <path d={`M ${width / 2} -6 V ${IMPELLER_AT * height}`} stroke="#333" strokeWidth={4} />
            {/* Moved to the bottom of the shaft by its group: it turns (flips over, seen from the side) in place. */}
            <g transform={`translate(${width / 2},${IMPELLER_AT * height})`}>
                <path className="scada-impeller" d={IMPELLER} stroke="#333" strokeWidth={4} strokeLinecap="round" />
            </g>
            <rect
                x={width / 2 - 14}
                y={-30}
                width={28}
                height={24}
                rx={4}
                ry={4}
                fill={surface.styled('accent', 'var(--shape-motor)')}
                stroke="#222"
                strokeWidth={2}
            />
        </>
    );
}
