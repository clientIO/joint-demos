import type { SymbolProps } from '../catalog';
import { METAL } from '../metal';
import { PipeThrough } from './pipe-through';
import './rotating.css';

/*
 * The rotating equipment, as the TypeScript SCADA editor draws it (see
 * `ts/src/shapes/models/rotating/`): the vanilla `calc()` geometry evaluated in
 * each element's default box. The stubs, flanges, terminals and the label are
 * the parent's. Each moving part is drawn around (0, 0) in a group moved to its
 * center, so the run mode spins it about its own origin (see `rotating.css`).
 */

// The pump's rotor: four vanes, `ROTOR_RADIUS` long, swept back
const ROTOR_RADIUS = 30;
const ROTOR_SWEEP = 10;
const ROTOR_RISE = (3 * ROTOR_RADIUS) / 4;
const PUMP_ROTOR = [
    `M 0 0 V ${ROTOR_RADIUS} l ${-ROTOR_SWEEP} ${-ROTOR_RISE} Z`,
    `M 0 0 V ${-ROTOR_RADIUS} l ${ROTOR_SWEEP} ${ROTOR_RISE} Z`,
    `M 0 0 H ${ROTOR_RADIUS} l ${-ROTOR_RISE} ${ROTOR_SWEEP} Z`,
    `M 0 0 H ${-ROTOR_RADIUS} l ${ROTOR_RISE} ${-ROTOR_SWEEP} Z`,
].join(' ');

// The fan's blades: one pointing up from the hub, the others turned copies
const FAN_BLADE = 'M 0 0 C 4 -8 16 -20 6 -30 C -2 -26 -8 -14 0 0 Z';
const FAN_BLADE_ANGLES = [0, 120, 240];

// The compressor's rotor ring: a whole number of dash periods round it (no seam)
const COMPRESSOR_RING_LENGTH = 190;

// The motor (100 x 60): the cooling fins across the housing, its feet
const MOTOR_WIDTH = 100;
const MOTOR_HEIGHT = 60;
const MOTOR_FINS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]
    .map(ratio => `M ${ratio * MOTOR_WIDTH} 6 V ${MOTOR_HEIGHT - 6}`)
    .join(' ');
const MOTOR_FEET = 'M 10 60 h 25 l 4 8 h -33 Z M 65 60 h 25 l 4 8 h -33 Z';
const MOTOR_SHAFT_Y = MOTOR_HEIGHT / 2 - 5;

/** A centrifugal pump: a spherical casing, the inlet low on the left, the outlet high on the right, the rotor in its window. */
export function PumpSymbol({ metal }: SymbolProps) {
    return (
        <>
            <PipeThrough fill={metal.pipe} width={100} height={100} ratio={0.3} half="right" />
            <ellipse cx={50} cy={50} rx={50} ry={50} fill={metal.sphere} stroke={METAL.stroke} strokeWidth={2} />
            <PipeThrough fill={metal.pipe} width={100} height={100} ratio={0.7} half="left" />
            <g transform="translate(50 50)">
                <circle r={40} fill={METAL.flat} stroke="var(--rotating-frame-stroke)" strokeWidth={2} />
                <circle r={34} fill="var(--rotating-well)" stroke="var(--rotating-ink)" strokeWidth={1} />
                <circle className="rotating-blur" r={31} />
                <g className="rotating-pump-rotor">
                    {/* Its box centered on the shaft, so it turns about the shaft. */}
                    <circle r={31} fill="none" stroke="none" />
                    <path d={PUMP_ROTOR} fill="var(--rotating-blade)" stroke="var(--rotating-ink)" strokeWidth={3} strokeLinejoin="round" />
                </g>
                <circle r={3.5} fill="var(--rotating-edge)" />
            </g>
        </>
    );
}

/** A compressor: a spherical casing on its base, the ISA trapezoid narrowing with the flow, a rotor ring turning round it. */
export function CompressorSymbol({ metal }: SymbolProps) {
    return (
        <>
            <PipeThrough fill={metal.pipe} width={80} height={80} />
            <path
                d="M 12 80 L 24 64 H 56 L 68 80 Z"
                fill="var(--shape-support)"
                stroke="var(--rotating-edge)"
                strokeWidth={2}
                strokeLinejoin="round"
            />
            <circle cx={40} cy={40} r={36} fill={metal.sphere} stroke={METAL.stroke} strokeWidth={2} />
            <g transform="translate(40 40)">
                <circle
                    className="rotating-compressor-ring"
                    r={30.4}
                    pathLength={COMPRESSOR_RING_LENGTH}
                    fill="none"
                    stroke="var(--rotating-edge)"
                    strokeWidth={2}
                    strokeDasharray="4 6"
                />
            </g>
            <path
                d="M 17.6 17.6 L 62.4 28.8 V 51.2 L 17.6 62.4 Z"
                fill="var(--rotating-well)"
                stroke="var(--rotating-ink)"
                strokeWidth={2}
                strokeLinejoin="round"
            />
        </>
    );
}

/** An axial fan: a round housing, the guard, three blades turning round the hub. */
export function FanSymbol({ metal }: SymbolProps) {
    return (
        <>
            <PipeThrough fill={metal.pipe} width={100} height={100} />
            <circle cx={50} cy={50} r={45} fill={METAL.flat} stroke="var(--rotating-frame-stroke)" strokeWidth={2} />
            <g transform="translate(50 50)">
                <circle r={34} fill={METAL.mid} stroke={METAL.darkEdge} strokeWidth={1} />
                <circle className="rotating-blur" r={31} />
                <g
                    className="rotating-fan-blades"
                    fill="var(--rotating-blade)"
                    stroke="var(--rotating-ink)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                >
                    {/* Its box centered on the hub, so it turns about the hub. */}
                    <circle r={34} fill="none" stroke="none" />
                    {FAN_BLADE_ANGLES.map(angle => (
                        <path key={angle} d={FAN_BLADE} transform={`rotate(${angle})`} />
                    ))}
                </g>
                <circle r={5} fill="var(--rotating-edge)" />
            </g>
        </>
    );
}

/** An electric motor: a finned housing on feet, the end cap on the left, the shaft on the right, the terminal box on top. */
export function MotorSymbol({ metal }: SymbolProps) {
    return (
        <>
            <path d={MOTOR_FEET} fill={METAL.dark} stroke={METAL.darkEdge} strokeWidth={1.5} />
            <rect
                x={MOTOR_WIDTH - 2}
                y={MOTOR_SHAFT_Y}
                width={22}
                height={10}
                fill={METAL.pale}
                stroke={METAL.darkEdge}
                strokeWidth={1.5}
            />
            <rect className="rotating-shaft-key" x={MOTOR_WIDTH + 6} y={MOTOR_SHAFT_Y} width={4} height={2} fill="var(--rotating-edge)" />
            <rect
                className="rotating-shaft-key rotating-shaft-key-opposite"
                x={MOTOR_WIDTH + 12}
                y={MOTOR_SHAFT_Y}
                width={4}
                height={2}
                fill="var(--rotating-edge)"
            />
            <rect
                x={-8}
                y={8}
                width={12}
                height={MOTOR_HEIGHT - 16}
                rx={3}
                fill={METAL.mid}
                stroke={METAL.darkEdge}
                strokeWidth={1.5}
            />
            <rect width={MOTOR_WIDTH} height={MOTOR_HEIGHT} rx={8} fill={metal.pipe} stroke={METAL.stroke} strokeWidth={2} />
            <path className="rotating-motor-fins" d={MOTOR_FINS} stroke={METAL.stroke} strokeOpacity={0.6} strokeWidth={2} />
            <rect
                x={0.35 * MOTOR_WIDTH}
                y={-12}
                width={0.3 * MOTOR_WIDTH}
                height={14}
                rx={2}
                fill="var(--shape-terminal-box)"
                stroke="var(--rotating-edge)"
                strokeWidth={1.5}
            />
        </>
    );
}
