import type { SymbolProps } from '../types';

// The zig-zag of the tubes through the shell (parts of the width and the height).
const TUBE_POINTS: ReadonlyArray<readonly [number, number]> = [
    [0.12, 0.5],
    [0.26, 0.25],
    [0.42, 0.75],
    [0.58, 0.25],
    [0.74, 0.75],
    [0.88, 0.5],
];
const NOZZLE_WIDTH = 16;
const NOZZLE_HEIGHT = 14;

/** A shell-and-tube heat exchanger: the shell side nozzles (top left, bottom right), the tubes through the shell. */
export function HeatExchangerDrawing({ width, height, surface }: SymbolProps) {
    const tubes = TUBE_POINTS.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x * width} ${y * height}`).join(' ');
    return (
        <>
            <rect
                x={0.25 * width - 8}
                y={-12}
                width={NOZZLE_WIDTH}
                height={NOZZLE_HEIGHT}
                strokeWidth={2}
                {...surface.fill('flat-2')}
                {...surface.stroke('edge')}
            />
            <rect
                x={0.75 * width - 8}
                y={height - 2}
                width={NOZZLE_WIDTH}
                height={NOZZLE_HEIGHT}
                strokeWidth={2}
                {...surface.fill('flat-2')}
                {...surface.stroke('edge')}
            />
            <rect width={width} height={height} rx={0.5 * height} ry={0.5 * height} strokeWidth={3} {...surface.fill('pipe')} {...surface.stroke('edge')} />
            <path d={tubes} fill="none" stroke="#E07A5F" strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        </>
    );
}
