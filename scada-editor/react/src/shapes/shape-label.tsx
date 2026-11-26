import { labelLayoutOf, labelSizeOf, LINE_HEIGHT, type Size } from './geometry';
import { labelLinesOf } from './label-text';
import { labelSizePx, useDiagramStyle } from './style';
import type { ShapeData, ShapeSpec, TextStyle } from './types';

// The first line of a text below, beside or above its point (em): as JointJS anchors a text vertically.
const FIRST_LINE_SHIFT = { top: 0.8, middle: 0.3, bottom: -0.2 } as const;

/** The SVG attributes of the styles of a text. */
function textStyleOf(styles: readonly TextStyle[] | undefined): { fontStyle?: string; textDecoration?: string } {
    if (!Array.isArray(styles) || styles.length === 0) {
        return {};
    }
    const decorations = styles.filter((style) => style !== 'italic');
    return {
        fontStyle: styles.includes('italic') ? 'italic' : 'normal',
        textDecoration: decorations.length > 0 ? decorations.join(' ') : 'none',
    };
}

interface ShapeLabelProps {
    readonly spec: ShapeSpec;
    readonly data: ShapeData;
    readonly size: Size;
    readonly angle: number;
}

/**
 * The label of a shape on its side (`label.position`), clear of its drawing and horizontal however the shape is
 * rotated; in the label size and color of the diagram.
 */
export function ShapeLabel({ spec, data, size, angle }: ShapeLabelProps) {
    const style = useDiagramStyle();
    const lines = labelLinesOf(data.label?.text, data.tag, style.labels);
    if (spec.label === null || lines.length === 0) {
        return null;
    }
    const fontSize = labelSizePx(style.labelSize);
    const layout = labelLayoutOf(spec, data, size, angle, labelSizeOf(lines.map((line) => line.text), fontSize));
    const firstLine = FIRST_LINE_SHIFT[layout.verticalAnchor] - (layout.verticalAnchor === 'top' ? 0 : ((lines.length - 1) * LINE_HEIGHT) / (layout.verticalAnchor === 'middle' ? 2 : 1));
    return (
        <text
            className="scada-shape-label"
            x={layout.x}
            y={layout.y}
            textAnchor={layout.anchor}
            transform={layout.rotation === 0 ? undefined : `rotate(${layout.rotation},${layout.x},${layout.y})`}
            {...textStyleOf(data.label?.styles)}
        >
            {lines.map((line, index) => (
                <tspan key={index} x={layout.x} dy={`${index === 0 ? firstLine : LINE_HEIGHT}em`} fontWeight={line.isBold ? 700 : undefined}>
                    {line.text}
                </tspan>
            ))}
        </text>
    );
}
