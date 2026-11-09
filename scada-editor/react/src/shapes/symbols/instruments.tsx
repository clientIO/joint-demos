// The instruments, as the TypeScript SCADA editor draws them (`ts/src/shapes/models/instruments/`):
// their vanilla `calc()` geometry evaluated in each element's default box (see `catalog.ts`).
import { CATALOG, type SymbolProps } from '../catalog';
import { METAL, useSvgId } from '../metal';
import './instruments.css';

const LIQUID = 'var(--shape-liquid)';
const LIQUID_MAX = 'var(--shape-liquid-max)';
const SURFACE_INK = 'var(--shape-surface-ink)';
const LABEL_COLOR = 'var(--shape-label)';
const SCREEN = 'var(--instruments-screen)';
const SCREEN_EDGE = 'var(--instruments-screen-edge)';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

/** The reading as the meters show it: one decimal. */
const formatReading = (value: number | undefined): string => (value ?? 0).toFixed(1);

/** The part (0 - 1) of a reading on a scale from 0 to `max`. */
const scalePart = (value: number | undefined, max: number): number => clamp((value ?? 0) / max, 0, 1);

/** A plate-finished panel with a dark screen: the body of the flow meter and of the display. */
function Panel({ width, height, screenHeight, metal }: {
    readonly width: number;
    readonly height: number;
    readonly screenHeight: number;
    readonly metal: SymbolProps['metal'];
}) {
    return (
        <>
            <rect width={width} height={height} rx={6} ry={6} fill={metal.plate} stroke={METAL.stroke} strokeWidth={2} />
            <rect x={6} y={6} width={width - 12} height={screenHeight} rx={3} ry={3} fill={SCREEN} stroke={SCREEN_EDGE} strokeWidth={1} />
        </>
    );
}

// The flow meter: 80 × 60, the screen over the top 72 % (the unit in the strip below it)
const FLOW_WIDTH = 80;
const FLOW_HEIGHT = 60;
const FLOW_SCREEN_HEIGHT = 0.72 * FLOW_HEIGHT - 6;
const FLOW_CUE_Y = 6 + FLOW_SCREEN_HEIGHT - 3;

/** An inline flow meter: its reading on the screen, the flow passing under it while it runs. */
export function FlowMeterSymbol({ data, metal }: SymbolProps) {
    return (
        <>
            <Panel width={FLOW_WIDTH} height={FLOW_HEIGHT} screenHeight={FLOW_SCREEN_HEIGHT} metal={metal} />
            <path className="instruments-flow-cue" d={`M 11 ${FLOW_CUE_Y} H ${FLOW_WIDTH - 11}`} stroke={LIQUID} strokeWidth={1.5} strokeLinecap="round" strokeDasharray="3 5" fill="none" />
            <text
                className="instruments-digits"
                x={FLOW_WIDTH / 2}
                y={0.36 * FLOW_HEIGHT + 3}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={0.4 * FLOW_HEIGHT}
                fontWeight="bold"
                fill={LIQUID}
            >
                {formatReading(data.value)}
            </text>
            <text
                className="instruments-unit"
                x={FLOW_WIDTH / 2}
                y={0.86 * FLOW_HEIGHT}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={0.22 * FLOW_HEIGHT}
                fill={SURFACE_INK}
            >
                {CATALOG.flowMeter.unit}
            </text>
        </>
    );
}

// The pressure gauge: a 60 × 60 dial, its scale 270° clockwise from the bottom left
const GAUGE_SIZE = 60;
const GAUGE_CENTER = GAUGE_SIZE / 2;
const GAUGE_MAX_BAR = 16;
const GAUGE_BEZEL = 1 / 12;
const SCALE_START = 135;
const SCALE_SWEEP = 270;
const ZONE_RADIUS = 22;
// The red zone: above 75 % of the scale (the vanilla's default high threshold)
const GAUGE_HIGH_PART = 0.75;

const toRadians = (degrees: number): number => degrees * Math.PI / 180;
const polar = (radius: number, degrees: number): string =>
    `${(radius * Math.cos(toRadians(degrees))).toFixed(2)} ${(radius * Math.sin(toRadians(degrees))).toFixed(2)}`;
const scaleAngle = (part: number): number => SCALE_START + part * SCALE_SWEEP;

const GAUGE_TICKS = Array.from({ length: 7 }, (_, index) => {
    const angle = SCALE_START + index * SCALE_SWEEP / 6;
    return `M ${polar(17, angle)} L ${polar(22, angle)}`;
}).join(' ');

/** An arc of the scale between two parts of it (nothing if they're the same). */
function zonePath(from: number, to: number): string | null {
    if (to <= from) {
        return null;
    }
    const isLarge = scaleAngle(to) - scaleAngle(from) > 180;
    return `M ${polar(ZONE_RADIUS, scaleAngle(from))} A ${ZONE_RADIUS} ${ZONE_RADIUS} 0 ${isLarge ? 1 : 0} 1 ${polar(ZONE_RADIUS, scaleAngle(to))}`;
}

const GAUGE_HIGH_ZONE = zonePath(GAUGE_HIGH_PART, 1);

/** A pressure gauge: a dial in a metal ring, its needle gliding to the pressure. */
export function PressureGaugeSymbol({ data, metal }: SymbolProps) {
    // Drawn pointing up (at 270°), turned to the value
    const needleAngle = scaleAngle(scalePart(data.value, GAUGE_MAX_BAR)) - 270;
    return (
        <>
            <rect x={GAUGE_CENTER - 5} y={GAUGE_SIZE - 2} width={10} height={16} fill={METAL.pale} stroke={METAL.dark} strokeWidth={2} />
            <circle cx={GAUGE_CENTER} cy={GAUGE_CENTER} r={GAUGE_CENTER} fill={metal.sphere} stroke={METAL.stroke} strokeWidth={1.5} />
            <circle cx={GAUGE_CENTER} cy={GAUGE_CENTER} r={(0.5 - GAUGE_BEZEL) * GAUGE_SIZE} fill="var(--shape-face)" stroke={METAL.stroke} strokeWidth={1} />
            <g transform={`translate(${GAUGE_CENTER} ${GAUGE_CENTER})`}>
                <path d={GAUGE_TICKS} stroke="var(--shape-gauge-ink)" strokeWidth={2} strokeLinecap="round" fill="none" />
                {GAUGE_HIGH_ZONE && <path d={GAUGE_HIGH_ZONE} fill="none" stroke={LIQUID_MAX} strokeWidth={3} />}
                <text y={15} textAnchor="middle" dominantBaseline="central" fontSize={9} className="instruments-unit" fill="var(--shape-gauge-unit)">
                    {CATALOG.pressureGauge.unit}
                </text>
                <g className="instruments-needle" style={{ transform: `rotate(${needleAngle.toFixed(1)}deg)` }}>
                    {/* Its box centered on the pivot, so it turns about the pivot. */}
                    <circle r={20} fill="none" stroke="none" />
                    <path d="M -3 0 L 0 -20 L 3 0 Z" fill="var(--shape-needle)" />
                </g>
                <circle r={4} fill="var(--shape-gauge-ink)" />
            </g>
        </>
    );
}

// The thermometer, fitted into 30 × 120: the tube on the left, the scale on its right, the bulb at the bottom
const THERMO_HEIGHT = 120;
const TUBE_X = 3;
const TUBE_WIDTH = 16;
const TUBE_CENTER = TUBE_X + TUBE_WIDTH / 2;
const TUBE_HEIGHT = THERMO_HEIGHT - 10;
const BULB_RADIUS = 11.5;
const BULB_Y = THERMO_HEIGHT - BULB_RADIUS;
const COLUMN_WIDTH = 7;
const THERMO_MAX_CELSIUS = 250;
// The scale spans 8 % (full) to 68 % (empty) of the height; the column ends in the bulb
const SCALE_TOP = 0.08 * THERMO_HEIGHT;
const SCALE_BOTTOM = 0.68 * THERMO_HEIGHT;
const COLUMN_BOTTOM = 0.95 * THERMO_HEIGHT - 8;
const COLUMN_FULL_HEIGHT = COLUMN_BOTTOM - SCALE_TOP;
const TICKS_X = TUBE_X + TUBE_WIDTH + 2;
const READING_X = TICKS_X + 12;

const THERMO_TICKS = Array.from({ length: 6 }, (_, index) =>
    `M ${TICKS_X} ${((0.08 + index * 0.12) * THERMO_HEIGHT).toFixed(1)} h ${index % 2 === 0 ? 8 : 5}`).join(' ');

/** A liquid-in-glass thermometer: its column rising to the temperature, the reading beside its top. */
export function ThermometerSymbol({ data }: SymbolProps) {
    const columnTop = SCALE_BOTTOM - scalePart(data.value, THERMO_MAX_CELSIUS) * (SCALE_BOTTOM - SCALE_TOP);
    const columnScale = (COLUMN_BOTTOM - columnTop) / COLUMN_FULL_HEIGHT;
    const celsius = Math.round(clamp(data.value ?? 0, 0, THERMO_MAX_CELSIUS));
    return (
        <>
            <rect x={TUBE_X} width={TUBE_WIDTH} height={TUBE_HEIGHT} rx={TUBE_WIDTH / 2} ry={TUBE_WIDTH / 2} fill="var(--shape-face)" stroke="var(--shape-thermometer-stroke)" strokeWidth={2} />
            <rect
                className="instruments-column"
                x={TUBE_CENTER - COLUMN_WIDTH / 2}
                y={SCALE_TOP}
                width={COLUMN_WIDTH}
                height={COLUMN_FULL_HEIGHT}
                fill={LIQUID_MAX}
                style={{ transform: `scaleY(${columnScale.toFixed(4)})` }}
            />
            <circle cx={TUBE_CENTER} cy={BULB_Y} r={BULB_RADIUS} fill={LIQUID_MAX} stroke="var(--shape-thermometer-stroke)" strokeWidth={2} />
            <circle className="instruments-bulb-shine" cx={TUBE_CENTER - 4} cy={BULB_Y - 4} r={3} fill="var(--shape-glass-1)" />
            <path d={THERMO_TICKS} stroke="var(--shape-scale)" strokeWidth={1.5} fill="none" />
            <g className="instruments-reading" style={{ transform: `translateY(${columnTop.toFixed(2)}px)` }}>
                <text x={READING_X} dominantBaseline="central" fontSize={14} fontWeight={600} className="instruments-digits" fill={LABEL_COLOR}>
                    {`${celsius} °C`}
                </text>
            </g>
        </>
    );
}

const DISPLAY_WIDTH = 120;
const DISPLAY_HEIGHT = 60;

/** A panel display: the reading in the middle of its screen, blinking red in an alarm. */
export function DisplaySymbol({ data, metal }: SymbolProps) {
    return (
        <>
            <Panel width={DISPLAY_WIDTH} height={DISPLAY_HEIGHT} screenHeight={DISPLAY_HEIGHT - 12} metal={metal} />
            <text
                className="instruments-digits instruments-display-value"
                x={DISPLAY_WIDTH / 2}
                y={0.42 * DISPLAY_HEIGHT + 3}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={0.48 * DISPLAY_HEIGHT}
                fontWeight="bold"
            >
                {formatReading(data.value)}
            </text>
        </>
    );
}

// The beacon: 40 × 50, the dome over the top 70 %, its base below
const BEACON_WIDTH = 40;
const BEACON_HEIGHT = 50;
const DOME_RADIUS = 0.4 * BEACON_WIDTH;
const DOME_BASE = 0.7 * BEACON_HEIGHT;
const LAMP_PATH = `M ${0.1 * BEACON_WIDTH} ${DOME_BASE} V ${DOME_RADIUS} A ${DOME_RADIUS} ${DOME_RADIUS} 0 0 1 ${0.9 * BEACON_WIDTH} ${DOME_RADIUS} V ${DOME_BASE} Z`;
const SHINE_PATH = `M ${0.3 * BEACON_WIDTH} ${0.6 * BEACON_HEIGHT} V ${DOME_RADIUS} A ${0.2 * BEACON_WIDTH} ${0.2 * BEACON_WIDTH} 0 0 1 ${0.45 * BEACON_WIDTH} ${0.13 * BEACON_WIDTH}`;

/** An alarm beacon: its lamp lit and sweeping its light around while the alarm is on. */
export function BeaconSymbol({ metal }: SymbolProps) {
    const clipId = useSvgId('instruments-lamp');
    return (
        <>
            <defs>
                <clipPath id={clipId}>
                    <path d={LAMP_PATH} />
                </clipPath>
            </defs>
            <circle className="instruments-glow" cx={BEACON_WIDTH / 2} cy={DOME_RADIUS} r={0.9 * BEACON_WIDTH} fill={LIQUID_MAX} />
            <path d={LAMP_PATH} fill="var(--instruments-lamp-off)" />
            <path className="instruments-lamp-lit" d={LAMP_PATH} fill={LIQUID_MAX} />
            <g clipPath={`url(#${clipId})`}>
                <rect className="instruments-beam" x={-6} y={0} width={10} height={DOME_BASE} fill="var(--instruments-beam)" />
            </g>
            <path d={LAMP_PATH} fill="none" stroke={METAL.darkEdge} strokeWidth={2} />
            <path d={SHINE_PATH} fill="none" stroke="var(--instruments-shine)" strokeOpacity={0.7} strokeWidth={3} strokeLinecap="round" />
            <rect y={DOME_BASE} width={BEACON_WIDTH} height={0.3 * BEACON_HEIGHT} rx={3} ry={3} fill={metal.plate} stroke={METAL.stroke} strokeWidth={2} />
        </>
    );
}
