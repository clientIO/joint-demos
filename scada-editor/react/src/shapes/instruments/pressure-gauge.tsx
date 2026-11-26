import type { SymbolProps } from '../types';
import { BEZEL, DIAL_SIZE, GAUGE_THRESHOLDS, GAUGE_TICKS, gaugeZone, needleRotation } from './pressure-gauge-scale';
import { MAX_LIQUID_COLOR, MIN_LIQUID_COLOR, percentThresholds, VERTICAL_SHIFT } from './values';

const INK = 'var(--shape-gauge-ink)';
const NEEDLE_COLOR = 'var(--color-red)';

/**
 * A pressure gauge: the dial in a metal ring (in the color, finish and outline of the gauge), the warning zones of the
 * scale, the needle pointing to the value (it sweeps to a new one).
 */
export function PressureGaugeDrawing({ width, height, data, surface }: SymbolProps) {
    const dial = `translate(${width / 2},${height / 2}) scale(${width / DIAL_SIZE})`;
    const { low, high } = percentThresholds(data.plant?.thresholds, GAUGE_THRESHOLDS);
    return (
        <>
            <rect x={width / 2 - 5} y={height - 2} width={10} height={16} fill="#999" stroke="#555" strokeWidth={2} />
            <circle cx={width / 2} cy={height / 2} r={width / 2} strokeWidth={1.5} {...surface.fill('sphere')} {...surface.stroke('edge')} />
            <circle cx={width / 2} cy={height / 2} r={(0.5 - BEZEL) * width} fill="var(--shape-face)" strokeWidth={1} {...surface.stroke('edge')} />
            <path d={GAUGE_TICKS} transform={dial} stroke={INK} strokeWidth={2} strokeLinecap="round" />
            <path d={gaugeZone(0, low)} transform={dial} fill="none" stroke={MIN_LIQUID_COLOR} strokeWidth={3} />
            <path d={gaugeZone(high, 100)} transform={dial} fill="none" stroke={MAX_LIQUID_COLOR} strokeWidth={3} />
            <g transform={dial}>
                <path
                    d="M -3 0 L 0 -20 L 3 0 Z"
                    fill={surface.styled('accent', NEEDLE_COLOR)}
                    style={{ transform: `rotate(${needleRotation(data.plant?.value)}deg)`, transition: 'transform 0.6s ease-out' }}
                />
            </g>
            <circle transform={dial} r={4} fill={INK} />
            <text transform={dial} y={15} dy={VERTICAL_SHIFT.middle} textAnchor="middle" fontSize={9} fontFamily="sans-serif" fill="var(--shape-gauge-unit)">
                {String(data.unit ?? '')}
            </text>
        </>
    );
}
