import type { SymbolProps } from '../types';

// The packing bed in the middle of the column (parts of the height).
const BED_TOP = 0.35;
const BED_BOTTOM = 0.62;
// The hatching of the packing: five strokes, from this part of the width, this far apart.
const PACKING_STROKES = 5;
const PACKING_START = 0.1;
const PACKING_STEP = 0.15;
// The spray nozzles under the header (parts of the width), and the height of the header.
const NOZZLES = [0.3, 0.5, 0.7];
const HEADER_AT = 0.2;

/** A gas scrubber: the gas rises through the packing, washed by the liquid sprayed from the top. */
export function ScrubberDrawing({ width, height, surface }: SymbolProps) {
    const packing = Array.from({ length: PACKING_STROKES }, (_, index) => {
        const x = PACKING_START + index * PACKING_STEP;
        const from = Number(x.toFixed(2)) * width;
        const to = Number((x + PACKING_STEP).toFixed(2)) * width;
        return `M ${from} ${BED_BOTTOM * height} L ${to} ${BED_TOP * height}`;
    }).join(' ');
    const nozzles = NOZZLES.map((x) => `M ${x * width} ${HEADER_AT * height} l -5 10 h 10 Z`).join(' ');
    return (
        <>
            <rect x={width / 2 - 8} y={-14} width={16} height={16} strokeWidth={2} {...surface.fill('flat-2')} {...surface.stroke('edge')} />
            <path
                d={`M ${0.1 * width} ${height - 10} L 0 ${height + 12} H ${width} L ${0.9 * width} ${height - 10} Z`}
                fill={surface.styled('accent', 'var(--shape-skirt)')}
                stroke="#555"
                strokeWidth={2}
            />
            <rect width={width} height={height} rx={0.5 * width} ry={16} strokeWidth={3} {...surface.fill('cylinder')} {...surface.stroke('edge')} />
            {/* The liquid collected at the bottom. */}
            <rect
                x={4}
                y={0.82 * height}
                width={width - 8}
                height={0.18 * height - 10}
                rx={0.5 * width - 4}
                ry={12}
                fill="var(--shape-liquid)"
                fillOpacity={0.35}
            />
            <rect
                x={4}
                y={BED_TOP * height}
                width={width - 8}
                height={Number((BED_BOTTOM - BED_TOP).toFixed(2)) * height}
                fill="none"
                strokeWidth={1.5}
                {...surface.stroke('edge')}
            />
            <path d={packing} strokeOpacity={0.6} strokeWidth={1.5} {...surface.stroke('edge')} />
            <path d={`M ${0.15 * width} ${HEADER_AT * height} H ${0.85 * width}`} stroke="#555" strokeWidth={4} strokeLinecap="round" />
            <path d={nozzles} {...surface.fill('dark')} />
        </>
    );
}
