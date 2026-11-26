import { labelSizePx, positiveOr, textOf, useDiagramStyle } from '../style';
import type { SymbolProps, TextAlign, TextStyle } from '../types';
import { LABEL_COLOR, VERTICAL_SHIFT } from './values';
import { wrapText } from './wrap-text';

const FONT_FAMILY = 'sans-serif';
// The lines of the text one font size apart (as JointJS spaces them)
const LINE_SPACING = '1em';
const ALIGNED: Record<TextAlign, { readonly at: number; readonly anchor: 'start' | 'middle' | 'end' }> = {
    left: { at: 0, anchor: 'start' },
    middle: { at: 0.5, anchor: 'middle' },
    right: { at: 1, anchor: 'end' },
};

/** The SVG attributes of the styles of a text: its slant, its lines. */
function textStyleOf(styles: readonly TextStyle[] | undefined): { fontStyle?: string; textDecoration?: string } {
    if (!Array.isArray(styles)) {
        return {};
    }
    const decorations = styles.filter((style) => style !== 'italic');
    return { fontStyle: styles.includes('italic') ? 'italic' : 'normal', textDecoration: decorations.length > 0 ? decorations.join(' ') : 'none' };
}

/**
 * A text on the canvas (a name of an area, a note): its label is the text, in its own size, weight, styles and
 * alignment (the label size of the diagram when it has no size), wrapped in its box from the top.
 */
export function LabelDrawing({ width, height, data, surface }: SymbolProps) {
    const diagram = useDiagramStyle();
    const label = data.label;
    const fontSize = positiveOr(label?.size, labelSizePx(diagram.labelSize));
    // No alignment: from the left, as a text without one
    const { at, anchor } = label?.align && Object.hasOwn(ALIGNED, label.align) ? ALIGNED[label.align] : ALIGNED.left;
    const x = at * width;
    const lines = wrapText(textOf(label?.text), { width, height }, { size: fontSize, family: FONT_FAMILY, weight: label?.weight, isItalic: Array.isArray(label?.styles) && label.styles.includes('italic') });
    return (
        <>
            {/* The box of the text: it is grabbed anywhere in it */}
            <rect width={width} height={height} fill="transparent" />
            <text
                y={0}
                textAnchor={anchor}
                fontSize={fontSize}
                fontWeight={label?.weight}
                fontFamily={FONT_FAMILY}
                fill={surface.styled('color', LABEL_COLOR)}
                {...textStyleOf(label?.styles)}
            >
                {lines.map((line, index) => (
                    <tspan key={index} x={x} dy={index === 0 ? VERTICAL_SHIFT.top : LINE_SPACING}>
                        {line === '' ? ' ' : line}
                    </tspan>
                ))}
            </text>
        </>
    );
}
