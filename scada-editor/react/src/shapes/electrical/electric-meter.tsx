import type { SymbolProps } from '../types';
import { LIQUID_COLOR } from './electrical';

/** A meter on a circuit: its reading (`plant.value`, one decimal) and its unit on the screen. */
export function ElectricMeterDrawing({ width: w, height: h, data, surface }: SymbolProps) {
    const color = surface.styled('accent', LIQUID_COLOR);
    const reading = (Number(data.plant?.value) || 0).toFixed(1);
    const unit = typeof data.unit === 'string' ? data.unit : '';
    return (
        <>
            <rect width={w} height={h} rx={6} ry={6} strokeWidth={2} {...surface.stroke('edge')} {...surface.fill('plate')} />
            <rect x={6} y={6} width={w - 12} height={h - 12} rx={3} ry={3} fill="#1e272e" stroke="#111" strokeWidth={1} />
            <text x={w - 26} y={0.5 * h} dy="0.3em" textAnchor="end" fontSize={20} fontFamily="monospace" fontWeight="bold" fill={color}>
                {reading}
            </text>
            <text x={w - 12} y={0.5 * h} dy="0.3em" textAnchor="end" fontSize={14} fontFamily="sans-serif" fill={color}>
                {unit}
            </text>
        </>
    );
}
