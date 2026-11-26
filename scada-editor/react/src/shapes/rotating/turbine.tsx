import { Directional } from '../directional';
import type { SymbolProps } from '../types';
import './rotating.css';

// The stages of blades, growing with the casing (parts of the width).
const BLADE_STAGES = [0.25, 0.45, 0.65, 0.85];
// How much the casing narrows at its inlet (a part of the height, on each side).
const INLET_NARROWING = 0.3;
// The blades stop short of the casing.
const BLADE_INSET = 6;

/** A steam turbine: the casing widens as the steam expands from the left to the right. */
export function TurbineDrawing({ width, height, surface }: SymbolProps) {
    const blades = BLADE_STAGES.map((x) => {
        // At the part of the width, the casing spans from its narrowing to the height less it.
        const top = Number((INLET_NARROWING * (1 - x)).toFixed(3));
        const bottom = Number((1 - INLET_NARROWING * (1 - x)).toFixed(3));
        return `M ${x * width} ${top * height + BLADE_INSET} V ${bottom * height - BLADE_INSET}`;
    }).join(' ');
    return (
        <Directional>
            <path d={`M -16 ${height / 2} H ${width + 16}`} stroke="#555" strokeWidth={8} />
            <path
                d={`M 0 ${0.3 * height} L ${width} 0 V ${height} L 0 ${0.7 * height} Z`}
                strokeWidth={2}
                strokeLinejoin="round"
                {...surface.fill('pipe')}
                {...surface.stroke('edge')}
            />
            <path d={blades} stroke="#444" strokeWidth={3} strokeLinecap="round" />
            {/* The steam passing through: streaming from the left to the right while it runs. */}
            <path
                className="scada-steam"
                d={`M 6 ${0.42 * height} H ${width - 6} M 6 ${0.58 * height} H ${width - 6}`}
                fill="none"
                stroke="#fff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="6 10"
                strokeOpacity={0}
            />
        </Directional>
    );
}
