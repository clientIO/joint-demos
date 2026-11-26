import type { SymbolProps } from '../types';
import './process.css';

// A small blade of a fan, pointing up from its hub; the other two are rotated copies.
const BLADE = 'M 0 0 C 2 -5 10 -12 4 -17 C -1 -15 -5 -8 0 0 Z';
const BLADE_ANGLES = [0, 120, 240];
// The fans above the tube bundle (parts of the width).
const FANS = [0.3, 0.7];
// The fins of the tube bundle: between 14 equal parts of the width.
const FIN_PARTS = 14;

/** A fin-fan air cooler: the fluid runs through the tube bundle, the fans on top blow the air through it. */
export function AirCoolerDrawing({ width, height, surface }: SymbolProps) {
    const fins = Array.from({ length: FIN_PARTS - 1 }, (_, index) => {
        const x = Number(((index + 1) / FIN_PARTS).toFixed(3)) * width;
        return `M ${x} ${0.5 * height + 3} V ${height - 3}`;
    }).join(' ');
    return (
        <>
            <path d={`M 12 ${height} V ${height + 10} M ${width - 12} ${height} V ${height + 10}`} stroke="var(--shape-legs)" strokeWidth={5} strokeLinecap="round" />
            {/* The plenum the fans sit in. */}
            <rect
                x={6}
                width={width - 12}
                height={0.5 * height}
                rx={4}
                ry={4}
                fill={surface.styled('accent', 'var(--shape-plenum)')}
                strokeWidth={2}
                {...surface.stroke('edge')}
            />
            {FANS.map((x, index) => (
                <g key={x}>
                    <circle cx={x * width} cy={0.25 * height} r={18} strokeWidth={2} {...surface.fill('sphere')} {...surface.stroke('edge')} />
                    {/* The blades are drawn around the hub (their group moved there) so they turn in place. */}
                    <g transform={`translate(${x * width},${0.25 * height})`}>
                        <g className={`scada-fan scada-fan-${index + 1}`} fill="#555" stroke="#222" strokeWidth={1}>
                            {BLADE_ANGLES.map((angle) => (
                                <path key={angle} d={BLADE} transform={`rotate(${angle})`} />
                            ))}
                        </g>
                    </g>
                </g>
            ))}
            {/* The tube bundle with its fins. */}
            <rect y={0.5 * height} width={width} height={0.5 * height} rx={4} ry={4} strokeWidth={2} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            <path d={fins} strokeOpacity={0.6} strokeWidth={1.5} {...surface.stroke('edge')} />
        </>
    );
}
