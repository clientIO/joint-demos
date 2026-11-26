import type { SymbolProps } from '../types';
import { LIQUID_COLOR } from './electrical';
import './electrical.css';

// The cells in the cabinet: 2 rows of 5
const CELLS = Array.from({ length: 10 }, (_, i) => ({ column: i % 5, row: Math.floor(i / 5) }));
// Where a cell is, as parts of the size (as the vanilla shape rounds them)
const cellPartX = (column: number, offset = 0) => Number((0.06 + column * 0.18 + offset).toFixed(3));
const cellPartY = (row: number) => Number((0.08 + row * 0.34).toFixed(3));
// The gauge of the charge at the bottom, from the left: its padding
const GAUGE_PADDING = 10;
const MAX_LEVEL = 100;

/** A battery bank: a cabinet of cells, its charge (`plant.level`, 0 - 100) on the gauge. */
export function BatteryBankDrawing({ width: w, height: h, data, surface }: SymbolProps) {
    const ratio = Math.max(0, Math.min(MAX_LEVEL, Number(data.plant?.level) || 0)) / MAX_LEVEL;
    return (
        <>
            <rect width={w} height={h} rx={4} ry={4} strokeWidth={3} {...surface.fill('plate')} {...surface.stroke('edge')} />
            {CELLS.map(({ column, row }) => (
                <g key={`${column}-${row}`}>
                    <rect
                        x={cellPartX(column) * w}
                        y={cellPartY(row) * h}
                        width={0.14 * w}
                        height={0.26 * h}
                        rx={2}
                        ry={2}
                        strokeWidth={1.5}
                        {...surface.fill('flat')}
                        {...surface.stroke('edge')}
                    />
                    <rect x={cellPartX(column, 0.05) * w} y={cellPartY(row) * h} width={0.04 * w} height={4} fill="#555" />
                </g>
            ))}
            <rect x={GAUGE_PADDING} y={0.8 * h} width={w - 2 * GAUGE_PADDING} height={0.12 * h} rx={3} ry={3} fill="#1e272e" />
            <rect
                className="electrical-charge"
                x={GAUGE_PADDING}
                y={0.8 * h}
                width={ratio * w - 2 * GAUGE_PADDING * ratio}
                height={0.12 * h}
                rx={3}
                ry={3}
                fill={surface.styled('accent', LIQUID_COLOR)}
            />
        </>
    );
}
