import type { SymbolProps } from '../types';

// The legs around the equator (parts of the width).
const LEGS = [0.12, 0.38, 0.62, 0.88];

/** A pressure sphere for liquefied gas on legs: its equator seam, the manhole on top. */
export function SphericalTankDrawing({ width, height, surface }: SymbolProps) {
    return (
        <>
            <path
                d={LEGS.map((leg) => `M ${leg * width} ${0.5 * height} V ${height + 14}`).join(' ')}
                stroke="var(--shape-legs)"
                strokeWidth={6}
                strokeLinecap="round"
            />
            <ellipse cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2} strokeWidth={3} {...surface.fill('sphere')} {...surface.stroke('edge')} />
            <path
                d={`M 0 ${0.5 * height} Q ${0.5 * width} ${0.62 * height} ${width} ${0.5 * height}`}
                fill="none"
                strokeWidth={2}
                {...surface.stroke('edge')}
            />
            <ellipse
                cx={width / 2}
                cy={4}
                rx={12}
                ry={5}
                strokeWidth={1.5}
                {...surface.fill('mid')}
                {...surface.stroke('var(--shape-metal-dark-edge)')}
            />
        </>
    );
}
