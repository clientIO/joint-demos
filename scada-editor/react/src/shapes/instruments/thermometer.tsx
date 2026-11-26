import type { SymbolProps } from '../types';
import { LABEL_COLOR, MAX_LIQUID_COLOR, percentOf, VERTICAL_SHIFT } from './values';
import './instruments.css';

/** The default outline of the tube and the bulb (its Outline). */
const FRAME = 'var(--shape-thermometer-stroke)';

// The scale on the right of the tube: six ticks, from 8 % of the height down by 12 %
const TICK_COUNT = 6;
const TICK_START = 0.08;
const TICK_STEP = 0.12;
// The column spans the scale: 0 % at 68 % of the height, 100 % at 8 %
const SCALE_BOTTOM = 0.68;
const SCALE_TOP = 0.08;

/** The ticks of the scale, longer every other one. */
function ticksOf(width: number, height: number): string {
    return Array.from({ length: TICK_COUNT }, (_, index) => `M ${width + 2} ${Number((TICK_START + index * TICK_STEP).toFixed(2)) * height} h ${index % 2 === 0 ? 8 : 5}`).join(' ');
}

/**
 * A liquid-in-glass thermometer: the column rises from the bulb to the temperature (0 - 100 °C) on the scale, the
 * reading next to its top. Its color is the liquid's (the column and the bulb), its Outline the tube's and the bulb's.
 */
export function ThermometerDrawing({ width, height, data, surface }: SymbolProps) {
    const value = percentOf(data.plant?.value);
    const top = Number((SCALE_BOTTOM + (value / 100) * (SCALE_TOP - SCALE_BOTTOM)).toFixed(3));
    // Round ends and the bulb by the shorter side: round in any size
    const shorter = Math.min(width, height);
    const liquid = surface.styled('color', MAX_LIQUID_COLOR);
    return (
        <>
            <rect width={width} height={height - 10} rx={shorter / 2} ry={shorter / 2} fill="var(--shape-face)" strokeWidth={2} {...surface.stroke(FRAME)} />
            <rect className="scada-level" x={width / 2 - 4} y={top * height} width={8} height={Number((0.95 - top).toFixed(3)) * height - 8} fill={liquid} />
            <circle cx={width / 2} cy={height - 8} r={0.75 * shorter} fill={liquid} strokeWidth={2} {...surface.stroke(FRAME)} />
            <path d={ticksOf(width, height)} stroke="var(--shape-scale)" strokeWidth={1.5} />
            <text
                className="scada-level"
                x={width + 14}
                y={0}
                dy={VERTICAL_SHIFT.middle}
                fontSize={14}
                fontFamily="sans-serif"
                fontWeight={600}
                fill={LABEL_COLOR}
                // Moved by a transform: it glides with the column (a text's `y` is not animated)
                style={{ transform: `translate(0px, ${top * height}px)` }}
            >
                {`${Math.round(value)} °C`}
            </text>
        </>
    );
}
