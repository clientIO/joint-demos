import type { SymbolProps } from '../types';
import { GLASS_HEIGHT, GLASS_Y, levelRatioOf } from './fuel-level';
import './storage.css';

/** A fuel tank (the day tank of a generator) on saddles: the fuel as high as its level in the sight glass. */
export function FuelTankDrawing({ width, height, data, surface }: SymbolProps) {
    const fuelHeight = GLASS_HEIGHT * levelRatioOf(data.plant?.level);
    return (
        <>
            <path d={`M ${0.2 * width} ${0.9 * height} V ${height} M ${0.8 * width} ${0.9 * height} V ${height}`} stroke="#555" strokeWidth={8} />
            <rect
                width={width}
                height={0.9 * height}
                rx={0.15 * height}
                ry={0.15 * height}
                strokeWidth={3}
                {...surface.fill('pipe')}
                {...surface.stroke('edge')}
            />
            <rect
                x={0.44 * width}
                y={GLASS_Y * height}
                width={0.12 * width}
                height={GLASS_HEIGHT * height}
                rx={3}
                ry={3}
                fill="#1e272e"
                strokeWidth={1.5}
                {...surface.stroke('edge')}
            />
            <rect
                className="scada-fuel"
                x={0.44 * width + 2}
                y={(GLASS_Y + GLASS_HEIGHT - fuelHeight) * height}
                width={0.12 * width - 4}
                height={fuelHeight * height}
                rx={2}
                ry={2}
                fill={surface.styled('accent', 'var(--shape-fuel)')}
            />
            <text
                x={0.22 * width}
                y={0.5 * height}
                textAnchor="middle"
                dy="0.3em"
                fontSize={12}
                fontFamily="sans-serif"
                fontWeight="bold"
                fill="var(--shape-surface-ink)"
            >
                FUEL
            </text>
        </>
    );
}
