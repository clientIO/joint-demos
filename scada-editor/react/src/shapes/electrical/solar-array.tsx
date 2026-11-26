import type { SymbolProps } from '../types';

// The cells of the panel: 6 columns, 3 rows
const CELL_COLUMNS = [1, 2, 3, 4, 5].map((i) => i / 6);
const CELL_ROWS = [1, 2].map((i) => Number(((i / 3) * 0.64).toFixed(4)));

/** A solar array: the panel of cells on its legs. */
export function SolarArrayDrawing({ width: w, height: h, surface }: SymbolProps) {
    const legs = `M ${0.2 * w} ${0.64 * h} V ${h} M ${0.8 * w} ${0.64 * h} V ${h} M ${0.1 * w} ${h} H ${0.3 * w} M ${0.7 * w} ${h} H ${0.9 * w}`;
    const columns = CELL_COLUMNS.map((x) => `M ${x * w} 4 V ${0.64 * h}`).join(' ');
    const rows = CELL_ROWS.map((y) => `M 4 ${y * h} H ${w - 4}`).join(' ');
    return (
        <>
            <path d={legs} stroke="#555" strokeWidth={5} strokeLinecap="round" />
            <rect width={w} height={0.64 * h} rx={3} ry={3} fill="#1e3a5f" strokeWidth={3} {...surface.stroke('edge')} />
            <path d={`${columns} ${rows}`} stroke="#7aa2cc" strokeOpacity={0.7} strokeWidth={1.5} />
        </>
    );
}
