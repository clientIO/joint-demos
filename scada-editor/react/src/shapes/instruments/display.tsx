import type { SymbolProps } from '../types';
import { LIQUID_COLOR, numberOf, SCREEN_COLOR, SCREEN_EDGE, VERTICAL_SHIFT } from './values';

/** A panel display: a value of the plant (one decimal) with its unit in the corner, in the accent. */
export function DisplayDrawing({ width, height, data, surface }: SymbolProps) {
    const accent = surface.styled('accent', LIQUID_COLOR);
    return (
        <>
            <rect width={width} height={height} rx={6} ry={6} strokeWidth={2} {...surface.fill('plate')} {...surface.stroke('edge')} />
            <rect x={6} y={6} width={width - 12} height={height - 12} rx={3} ry={3} fill={SCREEN_COLOR} stroke={SCREEN_EDGE} strokeWidth={1} />
            <text
                x={width / 2}
                y={0.42 * height}
                dy={VERTICAL_SHIFT.middle}
                textAnchor="middle"
                fontSize={0.48 * height}
                fontFamily="monospace"
                fontWeight="bold"
                fill={accent}
            >
                {numberOf(data.plant?.value).toFixed(1)}
            </text>
            <text x={width - 12} y={height - 9} dy={VERTICAL_SHIFT.bottom} textAnchor="end" fontSize={0.2 * height} fontFamily="sans-serif" fill={accent} fillOpacity={0.8}>
                {String(data.unit ?? '')}
            </text>
        </>
    );
}
