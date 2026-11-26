import type { SymbolProps } from '../types';
import './storage.css';

// The impeller: two blades, seen from the side.
const IMPELLER = 'M -28 0 C -24 -10 -8 -10 0 0 C 8 10 24 10 28 0 C 24 -10 8 -10 0 0 C -8 10 -24 10 -28 0 Z';
// The impeller is at this part of the height, at the bottom of the shaft.
const IMPELLER_HEIGHT = 0.8;

/** A tank with an agitator: the motor on top turning the impeller inside (it stirs while it runs). */
export function MixingTankDrawing({ width, height, surface }: SymbolProps) {
    const impellerY = IMPELLER_HEIGHT * height;
    return (
        <>
            <path
                d={`M 20 ${height} l -5 10 M ${width - 20} ${height} l 5 10`}
                fill="none"
                stroke="var(--shape-tank-legs)"
                strokeWidth={8}
                strokeLinecap="round"
            />
            <rect width={width} height={height} rx={120} ry={10} strokeWidth={4} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <path d={`M ${width / 2} -6 V ${impellerY}`} stroke="#333" strokeWidth={4} />
            {/* The stirring flips the impeller over: about its center, the group moves it there. */}
            <g transform={`translate(${width / 2}, ${impellerY})`}>
                <path className="scada-stir" d={IMPELLER} fill="#777" stroke="#222" strokeWidth={2} strokeLinejoin="round" />
            </g>
            <rect
                x={width / 2 - 16}
                y={-34}
                width={32}
                height={28}
                rx={4}
                ry={4}
                fill={surface.styled('accent', 'var(--shape-motor)')}
                stroke="#222"
                strokeWidth={2}
            />
            <text
                x={width / 2}
                y={-20}
                textAnchor="middle"
                dy="0.3em"
                fontSize={14}
                fontFamily="sans-serif"
                fontWeight="bold"
                fill="#eee"
            >
                M
            </text>
        </>
    );
}
