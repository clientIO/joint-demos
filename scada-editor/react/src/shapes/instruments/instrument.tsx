import type { SymbolProps } from '../types';
import { VERTICAL_SHIFT } from './values';

const INK = 'var(--shape-instrument-ink)';
const TEXT = 'var(--shape-instrument-text)';

/** An ISA instrument bubble: its function on the top (PT, FT, LT, TT), the line, its loop number on the bottom. */
export function InstrumentDrawing({ width, height, data }: SymbolProps) {
    return (
        <>
            <circle cx={width / 2} cy={height / 2} r={width / 2} fill="var(--shape-face)" stroke={INK} strokeWidth={2} />
            <path d={`M 0 ${height / 2} H ${width}`} stroke={INK} strokeWidth={2} />
            <text x={width / 2} y={height / 2 - 4} dy={VERTICAL_SHIFT.bottom} textAnchor="middle" fontSize={15} fontFamily="sans-serif" fontWeight="bold" fill={TEXT}>
                {String(data.function ?? '')}
            </text>
            <text x={width / 2} y={height / 2 + 4} dy={VERTICAL_SHIFT.top} textAnchor="middle" fontSize={13} fontFamily="sans-serif" fill={TEXT}>
                {String(data.loop ?? '')}
            </text>
        </>
    );
}
