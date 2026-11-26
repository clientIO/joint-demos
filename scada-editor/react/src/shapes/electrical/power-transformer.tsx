import type { SymbolProps } from '../types';

// The bushings on the top of the tank (parts of the width)
const BUSHINGS = [0.28, 0.42];

/** An insulator of a bushing at `x`: a stack of sheds, its conductor up the middle. */
const bushing = (x: number) =>
    `M ${x - 6} 0 H ${x + 6} M ${x - 8} -8 H ${x + 8} M ${x - 6} -16 H ${x + 6} M ${x - 8} -24 H ${x + 8} M ${x} 0 V -32`;

/** The cooling fins from a part of the width to another, as the vanilla shape rounds them. */
const fins = (x0: number, x1: number, w: number, h: number) =>
    [0, 1, 2, 3, 4].map((i) => `M ${Number((x0 + ((x1 - x0) * i) / 4).toFixed(3)) * w} ${0.3 * h} V ${0.9 * h}`).join(' ');

/** A power transformer: the tank with its cooling radiators, the oil conservator and the bushings on top. */
export function PowerTransformerDrawing({ width: w, height: h, surface }: SymbolProps) {
    return (
        <>
            <path d={`${fins(0.02, 0.16, w, h)} ${fins(0.84, 0.98, w, h)}`} strokeWidth={4} strokeLinecap="round" {...surface.stroke('edge')} />
            <rect
                x={0.55 * w}
                y={0.02 * h}
                width={0.4 * w}
                height={0.14 * h}
                rx={0.07 * h}
                ry={0.07 * h}
                strokeWidth={2}
                {...surface.fill('pipe')}
                {...surface.stroke('edge')}
            />
            <path d={`M ${0.62 * w} ${0.16 * h} V ${0.22 * h}`} strokeWidth={4} {...surface.stroke('edge')} />
            <path
                d={BUSHINGS.map((x) => bushing(x * w)).join(' ')}
                stroke="#8a6d3b"
                strokeWidth={4}
                strokeLinecap="round"
                transform={`translate(0,${0.22 * h})`}
            />
            <rect x={0.16 * w} y={0.22 * h} width={0.68 * w} height={0.78 * h} rx={3} ry={3} strokeWidth={3} {...surface.fill('plate')} {...surface.stroke('edge')} />
            <path
                d={`M ${0.16 * w} ${0.34 * h} H ${0.84 * w} M ${0.16 * w} ${0.9 * h} H ${0.84 * w}`}
                strokeOpacity={0.5}
                strokeWidth={1.5}
                {...surface.stroke('edge')}
            />
        </>
    );
}
