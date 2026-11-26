import { LIQUID_COLOR, numberOf, VERTICAL_SHIFT } from '../instruments/values';
import type { SymbolProps } from '../types';
import { ChartScreen } from './chart-screen';
import { arcPath, scaleFraction, scaleOf } from './plot';

// The arc of the scale: from the bottom left, clockwise, to the bottom right (degrees, clockwise from the right)
const START = 135;
const SWEEP = 270;
// The shortest arc of a value: a dot at the start of the scale
const MIN_SWEEP = 0.5;
const ARC = { fill: 'none', strokeWidth: 10, strokeLinecap: 'round' } as const;

/** A gauge chart: a value as an arc on the arc of its scale, the value and its unit in the middle. */
export function GaugeChartDrawing({ width, height, data, surface }: SymbolProps) {
    const radius = Math.min(width, height) / 2 - 18;
    const center = { x: width / 2, y: height / 2 + 4 };
    const value = numberOf(data.plant?.value);
    const sweep = Math.max(MIN_SWEEP, SWEEP * scaleFraction(scaleOf(data.plant), value));
    const accent = surface.styled('accent', LIQUID_COLOR);
    return (
        <>
            <ChartScreen width={width} height={height} surface={surface} />
            <path d={arcPath(center, radius, START, START + SWEEP)} {...ARC} stroke="#fff" strokeOpacity={0.12} />
            <path d={arcPath(center, radius, START, START + sweep)} {...ARC} stroke={accent} />
            <text x={0.5 * width} y={0.5 * height + 2} dy={VERTICAL_SHIFT.middle} textAnchor="middle" fontSize={24} fontFamily="monospace" fontWeight="bold" fill={accent}>
                {value.toFixed(1)}
            </text>
            <text x={0.5 * width} y={0.5 * height + 26} dy={VERTICAL_SHIFT.middle} textAnchor="middle" fontSize={12} fontFamily="sans-serif" fill="#9aa5b1">
                {String(data.unit ?? '')}
            </text>
        </>
    );
}
