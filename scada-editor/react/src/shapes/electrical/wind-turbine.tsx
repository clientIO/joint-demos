import type { SymbolProps } from '../types';
import './electrical.css';

// A blade from the hub up, turned around it by its angle
const BLADE = 'M -4 -4 L -3 -58 Q 0 -64 3 -58 L 5 -4 Z';
const BLADE_ANGLES = [0, 120, 240];

/** A wind turbine: the tower, the nacelle, the rotor around its hub (spinning while it runs). */
export function WindTurbineDrawing({ width: w, height: h, surface }: SymbolProps) {
    return (
        <>
            <path
                d={`M ${0.47 * w} ${0.3 * h} H ${0.53 * w} L ${0.57 * w} ${h} H ${0.43 * w} Z`}
                strokeWidth={2}
                {...surface.fill('cylinder')}
                {...surface.stroke('edge')}
            />
            <rect x={0.44 * w} y={0.26 * h} width={0.3 * w} height={16} rx={6} ry={6} strokeWidth={2} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            <g transform={`translate(${0.44 * w},${0.26 * h + 8})`}>
                <g className="electrical-rotor">
                    {BLADE_ANGLES.map((angle) => (
                        <path key={angle} transform={`rotate(${angle})`} d={BLADE} strokeWidth={1.5} {...surface.fill('flat')} {...surface.stroke('edge')} />
                    ))}
                </g>
                <circle r={8} strokeWidth={2} {...surface.fill('sphere')} {...surface.stroke('edge')} />
            </g>
        </>
    );
}
