import { FLANGE_OVERHANG, FLANGE_WIDTH, SIDE_ANGLES, sidePoint, STUB_THICKNESS, STUB_TUCK, TERMINAL_LENGTH, TERMINAL_RADIUS, type Size } from './geometry';
import type { Surface } from './surface';
import type { ShapePorts } from './types';

/*
 * The parts many shapes share: a pipe running through the body, the pipe stubs with their flanges, the electrical
 * terminals. A stub and a terminal are drawn as their ports are placed: centered out of the side, turned by its angle.
 */

interface PipeThroughProps {
    readonly width: number;
    readonly height: number;
    readonly surface: Surface;
    /** Where the pipe's axis is: a part of the height (0 - 1). */
    readonly ratio?: number;
    /** Only the left or the right half of the body. */
    readonly half?: 'left' | 'right';
}

/**
 * A pipe running through the body (or its half from a side to the middle) at the height of its stubs: outlined
 * along its length only, its ends meet the stubs.
 */
export function PipeThrough({ width, height, surface, ratio = 0.5, half }: PipeThroughProps) {
    const pipeWidth = half ? width / 2 : width;
    return (
        <rect
            x={half === 'right' ? width / 2 : 0}
            y={ratio * height - STUB_THICKNESS / 2}
            width={pipeWidth}
            height={STUB_THICKNESS}
            strokeWidth={2}
            strokeDasharray={`${pipeWidth} ${STUB_THICKNESS}`}
            {...surface.fill('pipe')}
            {...surface.stroke('edge')}
        />
    );
}

interface PortPartsProps {
    readonly ports: ShapePorts;
    readonly size: Size;
    readonly surface: Surface;
}

/** The pipe stubs of the layer (under the symbol: z 0, over it: z 1), with the flanges a pipe connects to. */
export function Stubs({ ports, size, surface, z }: PortPartsProps & { readonly z: 0 | 1 }) {
    const length = ports.stubLength ?? 0;
    const tuck = ports.tuck ?? STUB_TUCK;
    const stubs = (ports.stubs ?? []).filter((stub) => (stub.z ?? 0) >= 1 === (z === 1));
    return stubs.map(({ id, side, at = 0.5 }) => {
        const center = sidePoint(side, at, length / 2, size);
        // Turned upside down on the left: mirrored back, shaded as on the right.
        const mirror = side === 'left' ? 'scale(1,-1)' : undefined;
        const bodyWidth = length + tuck;
        return (
            <g key={id} className="scada-stub" transform={`translate(${center.x},${center.y}) rotate(${SIDE_ANGLES[side]})`}>
                <rect
                    x={-length / 2 - tuck}
                    y={-STUB_THICKNESS / 2}
                    width={bodyWidth}
                    height={STUB_THICKNESS}
                    transform={mirror}
                    strokeWidth={2}
                    strokeDasharray={`${bodyWidth} ${STUB_THICKNESS}`}
                    {...surface.fill('pipe')}
                    {...surface.stroke('edge')}
                />
                <rect
                    x={length / 2 - FLANGE_WIDTH}
                    y={-STUB_THICKNESS / 2 - FLANGE_OVERHANG}
                    width={FLANGE_WIDTH}
                    height={STUB_THICKNESS + 2 * FLANGE_OVERHANG}
                    strokeWidth={3}
                    {...surface.fill('var(--shape-flange-fill)')}
                    {...surface.stroke('edge')}
                />
            </g>
        );
    });
}

/** The electrical terminals: a lead out of the side, the terminal a wire connects to at its end. */
export function Terminals({ ports, size }: Omit<PortPartsProps, 'surface'>) {
    return (ports.terminals ?? []).map(({ id, side, at = 0.5 }) => {
        const center = sidePoint(side, at, TERMINAL_LENGTH / 2, size);
        return (
            <g key={id} className="scada-terminal-lead" transform={`translate(${center.x},${center.y}) rotate(${SIDE_ANGLES[side]})`}>
                <path d={`M ${-TERMINAL_LENGTH / 2} 0 H ${TERMINAL_LENGTH / 2}`} stroke="var(--shape-instrument-ink)" strokeWidth={2.5} />
                <circle cx={TERMINAL_LENGTH / 2} r={TERMINAL_RADIUS} fill="var(--shape-face)" stroke="var(--shape-instrument-ink)" strokeWidth={2} />
            </g>
        );
    });
}
