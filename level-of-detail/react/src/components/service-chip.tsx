import { selectElementSize, useCell } from '@joint/react-plus';
import type { NodeData } from '@/data/cells';
import { DARK_COLOR, STATUS_COLOR } from '@/theme';

/**
 * The middle level of detail: a plain SVG chip.
 *
 * One rect, one stripe and two text runs — no `foreignObject`, no CSS layout,
 * no shadow. It keeps the two things still legible between 25% and 60% zoom,
 * the name and the status colour, and drops everything the card spends its time
 * on. A whole screenful of these is the cost of a handful of cards.
 *
 * The size comes from the model (`useCell(selectElementSize)`), which is the
 * same box the card fills — the chip is a cheaper drawing of the same node, not
 * a smaller one.
 */
export function ServiceChip({ name, latencyMs, status }: NodeData) {
    const { width, height } = useCell(selectElementSize);
    const color = STATUS_COLOR[status];

    return (
        <g>
            <rect
                width={width}
                height={height}
                rx={10}
                ry={10}
                fill="#FFFFFF"
                stroke={color}
                strokeWidth={2}
            />
            {/* The status stripe down the leading edge, clipped to the rounded
                corner by a second rounded rect of the same radius. */}
            <rect width={22} height={height} rx={10} ry={10} fill={color} />
            <rect x={12} width={10} height={height} fill={color} />
            <text
                x={38}
                y={height / 2 - 9}
                dominantBaseline="central"
                fontFamily="sans-serif"
                fontSize={20}
                fontWeight={600}
                fill={DARK_COLOR}
            >
                {name}
            </text>
            <text
                x={38}
                y={height / 2 + 20}
                dominantBaseline="central"
                fontFamily="sans-serif"
                fontSize={17}
                fill={color}
            >
                {latencyMs} ms
            </text>
        </g>
    );
}
