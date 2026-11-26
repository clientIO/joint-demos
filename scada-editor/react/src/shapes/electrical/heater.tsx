import type { SymbolProps } from '../types';
import { energizedOf } from './electrical';
import './electrical.css';

// The columns of the radiator (parts of the width)
const COLUMNS = [0.14, 0.3, 0.46, 0.62, 0.78];
// The waves of the heating element after the first one
const COIL_WAVES = 9;

/** An electric heater: a panel radiator on its feet, its heating element glowing while it is energized. */
export function HeaterDrawing({ width: w, height: h, data, surface }: SymbolProps) {
    const columns = COLUMNS.map((x) => `M ${x * w} 6 V ${0.9 * h - 6}`).join(' ');
    const coil = `M ${0.14 * w} ${0.7 * h} q ${0.04 * w} -5 ${0.08 * w} 0${` t ${0.08 * w} 0`.repeat(COIL_WAVES)}`;
    return (
        <>
            <rect width={w} height={0.9 * h} rx={5} ry={5} strokeWidth={2} {...surface.fill('plate')} {...surface.stroke('edge')} />
            <path d={columns} strokeOpacity={0.45} strokeWidth={6} strokeLinecap="round" {...surface.stroke('edge')} />
            <rect x={0.1 * w} y={0.6 * h} width={0.8 * w} height={0.2 * h} rx={3} ry={3} fill="#2b2f33" />
            <path className="electrical-heater-coil" data-energized={energizedOf(data)} d={coil} fill="none" stroke="#6b7075" strokeWidth={2.5} strokeLinecap="round" />
            <path d={`M ${0.15 * w} ${0.9 * h} V ${h} M ${0.85 * w} ${0.9 * h} V ${h}`} stroke="#555" strokeWidth={5} strokeLinecap="round" />
        </>
    );
}
