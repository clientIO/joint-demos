import type { SymbolProps } from '../types';
import { LIQUID_COLOR, numberOf, SCREEN_COLOR, SCREEN_EDGE, SURFACE_INK, VERTICAL_SHIFT } from './values';

/** An inline flow meter: the reading (one decimal) on its screen, the unit in the strip below it. */
export function FlowMeterDrawing({ width, height, data, surface }: SymbolProps) {
    return (
        <>
            <rect width={width} height={height} rx={6} ry={6} strokeWidth={2} {...surface.fill('plate')} {...surface.stroke('edge')} />
            {/* The screen takes the top 72 % (the unit is below it) */}
            <rect x={6} y={6} width={width - 12} height={0.72 * height - 6} rx={3} ry={3} fill={SCREEN_COLOR} stroke={SCREEN_EDGE} strokeWidth={1} />
            <text
                x={width / 2}
                y={0.36 * height + 3}
                dy={VERTICAL_SHIFT.middle}
                textAnchor="middle"
                fontSize={0.4 * height}
                fontFamily="monospace"
                fontWeight="bold"
                fill={surface.styled('accent', LIQUID_COLOR)}
            >
                {numberOf(data.plant?.value).toFixed(1)}
            </text>
            <text x={width / 2} y={0.86 * height} dy={VERTICAL_SHIFT.middle} textAnchor="middle" fontSize={0.22 * height} fontFamily="sans-serif" fill={SURFACE_INK}>
                {String(data.unit ?? '')}
            </text>
        </>
    );
}
