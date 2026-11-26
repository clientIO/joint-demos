import type { SymbolProps } from '../types';

// The body between the roof and the hopper (parts of the height).
const BODY_TOP = 0.1;
const BODY_BOTTOM = 0.72;
// The ribs of the corrugated sheets (parts of the height).
const RIBS = [0.25, 0.4, 0.55];

/** A silo for bulk solids: a conical roof, a corrugated cylindrical body, a hopper on legs. */
export function SiloDrawing({ width, height, surface }: SymbolProps) {
    const bodyTop = BODY_TOP * height;
    const bodyBottom = BODY_BOTTOM * height;
    return (
        <>
            <path
                d={`M 8 ${bodyBottom} V ${height + 8} M ${width - 8} ${bodyBottom} V ${height + 8}`}
                stroke="var(--shape-legs)"
                strokeWidth={6}
                strokeLinecap="round"
            />
            <path
                d={`M 0 ${bodyBottom} H ${width} L ${0.6 * width} ${height - 8} H ${0.4 * width} Z`}
                strokeWidth={2}
                strokeLinejoin="round"
                {...surface.fill('cone')}
                {...surface.stroke('edge')}
            />
            <rect
                x={0.42 * width}
                y={height - 10}
                width={0.16 * width}
                height={12}
                strokeWidth={1.5}
                {...surface.fill('mid')}
                {...surface.stroke('var(--shape-metal-dark-edge)')}
            />
            <rect y={bodyTop} width={width} height={bodyBottom - bodyTop} strokeWidth={2} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            <path
                d={RIBS.map((rib) => `M 0 ${rib * height} H ${width}`).join(' ')}
                strokeOpacity={0.5}
                strokeWidth={1.5}
                {...surface.stroke('edge')}
            />
            <path
                d={`M -4 ${bodyTop} L ${0.5 * width} 0 L ${width + 4} ${bodyTop} Z`}
                strokeWidth={2}
                strokeLinejoin="round"
                {...surface.fill('cone')}
                {...surface.stroke('edge')}
            />
        </>
    );
}
