// The process and storage equipment, ported from the TypeScript SCADA editor
// (`ts/src/shapes/models/process`, `models/storage`): the same geometry in each
// element's own box, the same shaded metal. The parent draws the nozzles, the
// pipe stubs and the labels; the run mode animates the `process-*` parts.
import type { SymbolProps } from '../catalog';
import { METAL, useSvgId } from '../metal';
import './process.css';

// Boiler (120 × 160): the firebox low in the drum, the flames on its floor
const BOILER_WIDTH = 120;
const BOILER_HEIGHT = 160;
const BOILER_HEAD_RY = 20;
const FIREBOX_HEIGHT = 56;
const FLAMES_BASE_OFFSET = 18;
const FLAME_OUTER = 'M -22 10 C -28 -8 -12 -14 -14 -30 C -4 -20 0 -28 2 -42 C 12 -26 26 -18 22 10 Z';
const FLAME_INNER = 'M -10 10 C -14 -2 -4 -6 -4 -16 C 2 -10 4 -16 6 -24 C 12 -14 16 -6 12 10 Z';

// Heat exchanger (160 × 60): the tubes zig-zag through the shell
const HX_WIDTH = 160;
const HX_HEIGHT = 60;
const HX_TUBE_POINTS: ReadonlyArray<readonly [number, number]> = [
    [0.12, 0.5], [0.26, 0.25], [0.42, 0.75], [0.58, 0.25], [0.74, 0.75], [0.88, 0.5]
];

// Filter (60 × 80): the element across the housing, the cap on its top
const FILTER_WIDTH = 60;
const FILTER_HEIGHT = 80;
const FILTER_CAP_HEIGHT = 10;
const FILTER_CAP_OVERHANG = 8;

// Tank (120 × 200): the vanilla 160 × 300 geometry scaled into the box
const TANK_WIDTH = 120;
const TANK_HEIGHT = 200;
const TANK_SCALE_X = TANK_WIDTH / 160;
const TANK_SCALE_Y = TANK_HEIGHT / 300;
const TANK_HEAD_RY = 10 * TANK_SCALE_Y;
const TANK_BAND_Y = 20 * TANK_SCALE_Y;
const TANK_BAND_HEIGHT = 20 * TANK_SCALE_Y;
const TANK_LEG_INSET = 20 * TANK_SCALE_X;
const TANK_LEG_SPLAY = 5 * TANK_SCALE_X;
const TANK_LEG_DROP = 10 * TANK_SCALE_Y;
const TANK_SCALE_TICKS = [25, 50, 75, 100];
const TANK_SCALE_X_POSITION = TANK_WIDTH - 16;
const TANK_LIQUID_TOP = TANK_BAND_Y + TANK_BAND_HEIGHT;
const TANK_LIQUID_BOTTOM = TANK_HEIGHT;

// Silo (100 × 220): a conical roof, the cylindrical body, a hopper on legs
const SILO_WIDTH = 100;
const SILO_HEIGHT = 220;
const SILO_BODY_TOP = 0.1 * SILO_HEIGHT;
const SILO_BODY_BOTTOM = 0.72 * SILO_HEIGHT;
const SILO_HOPPER_BOTTOM = SILO_HEIGHT - 8;
const SILO_RIBS = [0.25, 0.4, 0.55].map(fraction => fraction * SILO_HEIGHT);
const SILO_ROOF_EAVES = 4;
const SILO_LEG_INSET = 8;
const SILO_LEG_FOOT = SILO_HEIGHT + 8;
// The hopper's sides from its right top corner down to the outlet and back up its left side
const SILO_HOPPER_SIDES = `L ${0.6 * SILO_WIDTH} ${SILO_HOPPER_BOTTOM} H ${0.4 * SILO_WIDTH} L 0 ${SILO_BODY_BOTTOM}`;
const SILO_HOPPER = `M 0 ${SILO_BODY_BOTTOM} H ${SILO_WIDTH} ${SILO_HOPPER_SIDES} Z`;
/** The body and the hopper as one outline: the clip of the contents. */
const SILO_VESSEL = `M 0 ${SILO_BODY_TOP} H ${SILO_WIDTH} V ${SILO_BODY_BOTTOM} ${SILO_HOPPER_SIDES} Z`;

// Splits a tank's alarm color: at or above it the alarm is "too full" (red), below it "too low" (yellow).
const HIGH_LEVEL = 50;

/** A level from 0 to 100, whatever the plant sent. */
function clampLevel(level: number | undefined): number {
    return Math.max(0, Math.min(100, level ?? 0));
}

/** The transform of a part drawn at full height that shows a level (see `.process-level`). */
function levelStyle(level: number) {
    return { transform: `scaleY(${level / 100})` };
}

/** The level an alarm is about: too high or too low. */
function levelZone(level: number): 'high' | 'low' {
    return level >= HIGH_LEVEL ? 'high' : 'low';
}

/** A steam boiler: the drum, its firebox and the flames burning while it fires. */
export function BoilerSymbol({ metal }: SymbolProps) {
    const fireboxX = 0.2 * BOILER_WIDTH;
    const fireboxY = BOILER_HEIGHT - 70;
    const fireboxWidth = 0.6 * BOILER_WIDTH;
    return (
        <>
            <rect
                width={BOILER_WIDTH}
                height={BOILER_HEIGHT}
                rx={BOILER_WIDTH / 2}
                ry={BOILER_HEAD_RY}
                fill={metal.cylinder}
                stroke={METAL.stroke}
                strokeWidth={4}
            />
            <rect
                className="process-firebox"
                x={fireboxX}
                y={fireboxY}
                width={fireboxWidth}
                height={FIREBOX_HEIGHT}
                rx={4}
                strokeWidth={2}
            />
            <ellipse
                className="process-embers"
                cx={BOILER_WIDTH / 2}
                cy={BOILER_HEIGHT - FLAMES_BASE_OFFSET + 6}
                rx={fireboxWidth / 2 - 6}
                ry={8}
            />
            <g className="process-flames" transform={`translate(${BOILER_WIDTH / 2} ${BOILER_HEIGHT - FLAMES_BASE_OFFSET})`}>
                <path className="process-flame process-flame-outer" d={FLAME_OUTER} />
                <path className="process-flame process-flame-inner" d={FLAME_INNER} />
            </g>
        </>
    );
}

/** A shell-and-tube heat exchanger: the tubes glow with the heat they carry while the flow passes. */
export function HeatExchangerSymbol({ metal }: SymbolProps) {
    const tubes = HX_TUBE_POINTS
        .map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x * HX_WIDTH} ${y * HX_HEIGHT}`)
        .join(' ');
    return (
        <>
            <rect
                width={HX_WIDTH}
                height={HX_HEIGHT}
                rx={HX_HEIGHT / 2}
                fill={metal.pipe}
                stroke={METAL.stroke}
                strokeWidth={3}
            />
            <path className="process-tubes" d={tubes} />
            <path className="process-heat" d={tubes} />
        </>
    );
}

/** A filter housing: the element across it, the cap on its top. */
export function FilterSymbol({ metal }: SymbolProps) {
    const mesh = `M ${0.15 * FILTER_WIDTH} ${0.85 * FILTER_HEIGHT} L ${0.85 * FILTER_WIDTH} ${0.15 * FILTER_HEIGHT}`;
    return (
        <>
            <rect
                width={FILTER_WIDTH}
                height={FILTER_HEIGHT}
                rx={8}
                fill={metal.cylinder}
                stroke={METAL.stroke}
                strokeWidth={3}
            />
            <path className="process-media" d={mesh} />
            <rect
                className="process-cap"
                x={0.2 * FILTER_WIDTH}
                y={-FILTER_CAP_OVERHANG}
                width={0.6 * FILTER_WIDTH}
                height={FILTER_CAP_HEIGHT}
                rx={2}
                stroke={METAL.darkEdge}
                strokeWidth={2}
            />
        </>
    );
}

/** A vertical liquid tank on legs: the liquid as high as its level, a scale and the reading. */
export function TankSymbol({ data, metal }: SymbolProps) {
    const clipId = useSvgId('clip');
    const level = clampLevel(data.level);
    const liquidHeight = TANK_LIQUID_BOTTOM - TANK_LIQUID_TOP;
    const legs = `M ${TANK_LEG_INSET} ${TANK_HEIGHT} l ${-TANK_LEG_SPLAY} ${TANK_LEG_DROP} M ${TANK_WIDTH - TANK_LEG_INSET} ${TANK_HEIGHT} l ${TANK_LEG_SPLAY} ${TANK_LEG_DROP}`;
    return (
        <>
            <clipPath id={clipId}>
                <rect width={TANK_WIDTH} height={TANK_HEIGHT} rx={TANK_WIDTH / 2} ry={TANK_HEAD_RY} />
            </clipPath>
            <path className="process-tank-legs" d={legs} strokeWidth={8 * TANK_SCALE_X} />
            <rect
                width={TANK_WIDTH}
                height={TANK_HEIGHT}
                rx={TANK_WIDTH / 2}
                ry={TANK_HEAD_RY}
                fill={metal.cylinder}
            />
            <g clipPath={`url(#${clipId})`}>
                <rect
                    className="process-level process-liquid"
                    data-zone={levelZone(level)}
                    y={TANK_LIQUID_TOP}
                    width={TANK_WIDTH}
                    height={liquidHeight}
                    style={levelStyle(level)}
                />
                <g
                    className="process-surface-track"
                    style={{ transform: `translateY(${liquidHeight * (1 - level / 100)}px)` }}
                >
                    <path
                        className="process-surface"
                        d={`M -20 ${TANK_LIQUID_TOP} q 10 -2 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0 t 20 0`}
                        opacity={level > 0 ? 1 : 0}
                    />
                </g>
            </g>
            <rect
                width={TANK_WIDTH}
                height={TANK_HEIGHT}
                rx={TANK_WIDTH / 2}
                ry={TANK_HEAD_RY}
                fill="none"
                stroke={METAL.stroke}
                strokeWidth={4 * TANK_SCALE_X}
            />
            <rect
                y={TANK_BAND_Y}
                width={TANK_WIDTH}
                height={TANK_BAND_HEIGHT}
                fill="none"
                stroke={METAL.stroke}
                strokeWidth={2}
            />
            <TankScale />
            <text className="process-readout" x={TANK_WIDTH / 2} y={(TANK_LIQUID_TOP + TANK_LIQUID_BOTTOM) / 2}>
                {Math.round(level)}%
            </text>
        </>
    );
}

/** The level scale on the side of the tank: a tick every quarter. */
function TankScale() {
    const span = TANK_LIQUID_BOTTOM - TANK_LIQUID_TOP;
    const ticks = TANK_SCALE_TICKS
        .map((tick) => {
            const y = TANK_LIQUID_BOTTOM - span * tick / 100;
            const length = tick % 50 === 0 ? 8 : 5;
            return `M ${TANK_SCALE_X_POSITION} ${y} h ${length}`;
        })
        .join(' ');
    return <path className="process-scale" d={`M ${TANK_SCALE_X_POSITION} ${TANK_LIQUID_TOP} V ${TANK_LIQUID_BOTTOM - TANK_HEAD_RY} ${ticks}`} />;
}

/** A silo for bulk solids: a conical roof, the corrugated body and a hopper on legs, filled to its level. */
export function SiloSymbol({ data, metal }: SymbolProps) {
    const clipId = useSvgId('clip');
    const level = clampLevel(data.level);
    const legs = `M ${SILO_LEG_INSET} ${SILO_BODY_BOTTOM} V ${SILO_LEG_FOOT} M ${SILO_WIDTH - SILO_LEG_INSET} ${SILO_BODY_BOTTOM} V ${SILO_LEG_FOOT}`;
    const roof = `M ${-SILO_ROOF_EAVES} ${SILO_BODY_TOP} L ${SILO_WIDTH / 2} 0 L ${SILO_WIDTH + SILO_ROOF_EAVES} ${SILO_BODY_TOP} Z`;
    const ribs = SILO_RIBS.map(y => `M 0 ${y} H ${SILO_WIDTH}`).join(' ');
    return (
        <>
            <clipPath id={clipId}>
                <path d={SILO_VESSEL} />
            </clipPath>
            <path className="process-silo-legs" d={legs} />
            <path d={SILO_HOPPER} fill={metal.cone} stroke={METAL.stroke} strokeWidth={2} strokeLinejoin="round" />
            <rect
                y={SILO_BODY_TOP}
                width={SILO_WIDTH}
                height={SILO_BODY_BOTTOM - SILO_BODY_TOP}
                fill={metal.cylinder}
                stroke={METAL.stroke}
                strokeWidth={2}
            />
            <g clipPath={`url(#${clipId})`}>
                <rect
                    className="process-level process-bulk"
                    data-zone={levelZone(level)}
                    y={SILO_BODY_TOP}
                    width={SILO_WIDTH}
                    height={SILO_HOPPER_BOTTOM - SILO_BODY_TOP}
                    style={levelStyle(level)}
                />
            </g>
            <path d={ribs} stroke={METAL.stroke} strokeOpacity={0.5} strokeWidth={1.5} />
            <path d={roof} fill={metal.cone} stroke={METAL.stroke} strokeWidth={2} strokeLinejoin="round" />
            <text className="process-readout" x={SILO_WIDTH / 2} y={(SILO_BODY_TOP + SILO_BODY_BOTTOM) / 2}>
                {Math.round(level)}%
            </text>
        </>
    );
}
