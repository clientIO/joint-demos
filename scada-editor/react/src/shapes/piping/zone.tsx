import { labelSizePx, positiveOr, textOf, useDiagramStyle } from '../style';
import type { SymbolProps } from '../types';
import { tipSideOf, wrapText, zoneOutline } from './zone-outline';

// The text keeps off the border of the zone.
const TEXT_PADDING = { width: 10, height: 4 };
// The first line of a text centered vertically (em): as JointJS anchors a text, its lines 1 em apart.
const MIDDLE_SHIFT = 0.3;

/**
 * A zone: a box with a tip out of the side where the pipe comes from, its name inside it - on as many lines as the
 * zone is high, cut with an ellipsis, in the label size of the diagram (all the zones alike, as off-page connectors).
 */
export function ZoneDrawing({ width, height, data, surface }: SymbolProps) {
    const diagram = useDiagramStyle();
    // Its own size and weight when the label has them.
    const fontSize = positiveOr(data.label?.size, labelSizePx(diagram.labelSize));
    const lines = wrapText(textOf(data.label?.text), width - TEXT_PADDING.width, height - TEXT_PADDING.height, fontSize);
    const firstLine = MIDDLE_SHIFT - (lines.length - 1) / 2;
    return (
        <>
            <path
                d={zoneOutline(tipSideOf(data), width, height)}
                fill={surface.styled('color', 'var(--shape-face)')}
                stroke={surface.styled('outline', 'var(--shape-zone-stroke)')}
                strokeWidth={surface.outlineWidth ?? 1}
            />
            <text
                x={width / 2}
                y={height / 2}
                textAnchor="middle"
                fontFamily="sans-serif"
                fontWeight={positiveOr(data.label?.weight, 700)}
                fontSize={fontSize}
                fill={surface.styled('accent', 'var(--shape-liquid)')}
            >
                {lines.map((line, index) => (
                    <tspan key={index} x={width / 2} dy={`${index === 0 ? firstLine : 1}em`}>
                        {line}
                    </tspan>
                ))}
            </text>
        </>
    );
}
