import type { SymbolProps } from '../types';
import { MAX_LIQUID_COLOR } from './values';
import './instruments.css';

const LAMP_OFF_COLOR = '#9aa3ab';

/** An alarm beacon: the lamp lit and glowing (pulsing in run mode) while the alarm is on. */
export function BeaconDrawing({ width, height, data, surface }: SymbolProps) {
    const isOn = Boolean(data.plant?.power);
    // The dome from the top of the element: its center `0.4 * w` below it
    const dome = 0.4 * width;
    return (
        <>
            {/* Over its surroundings while it is on: not a part of the footprint of the shape */}
            {isOn && <circle className="scada-glow" cx={width / 2} cy={dome} r={0.9 * width} fill={MAX_LIQUID_COLOR} fillOpacity={0.2} />}
            <path
                d={`M ${0.1 * width} ${0.7 * height} V ${dome} A ${dome} ${dome} 0 0 1 ${0.9 * width} ${dome} V ${0.7 * height} Z`}
                fill={isOn ? MAX_LIQUID_COLOR : LAMP_OFF_COLOR}
                stroke="#333"
                strokeWidth={2}
            />
            {/* The reflection on the glass */}
            <path
                d={`M ${0.3 * width} ${0.6 * height} V ${dome} A ${0.2 * width} ${0.2 * width} 0 0 1 ${0.45 * width} ${0.13 * width}`}
                fill="none"
                stroke="#fff"
                strokeOpacity={0.7}
                strokeWidth={3}
                strokeLinecap="round"
            />
            <rect y={0.7 * height} width={width} height={0.3 * height} rx={3} ry={3} strokeWidth={2} {...surface.fill('plate')} {...surface.stroke('edge')} />
        </>
    );
}
