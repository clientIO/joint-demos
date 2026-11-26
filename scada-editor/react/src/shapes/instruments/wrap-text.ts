/*
 * A text broken into the lines that fit a box, as JointJS `textWrap` breaks it: by words (its new lines kept), the
 * lines that don't fit the height dropped, the last one shown ending with an ellipsis. Measured on a canvas: in the
 * palette and an export as on the paper.
 */

const ELLIPSIS = '…';
/** The height of a line, of the font size, as a line is measured. */
export const WRAP_LINE_HEIGHT = 1.2;

/** The font of a text, as a canvas measures it. */
export interface WrapFont {
    readonly size: number;
    readonly family: string;
    readonly weight?: number | string;
    readonly isItalic?: boolean;
}

let measuringContext: CanvasRenderingContext2D | null | undefined;

/** The canvas the texts are measured on: none outside a browser (each character then a part of the font size). */
function contextOf(): CanvasRenderingContext2D | null {
    if (measuringContext === undefined) {
        measuringContext = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    }
    return measuringContext;
}

// The width of an average character, of the font size: without a canvas
const CHARACTER_WIDTH = 0.6;

function measurer(font: WrapFont): (text: string) => number {
    const context = contextOf();
    if (!context) {
        return (text) => text.length * font.size * CHARACTER_WIDTH;
    }
    context.font = `${font.isItalic ? 'italic ' : ''}${font.weight ?? 'normal'} ${font.size}px ${font.family}`;
    return (text) => context.measureText(text).width;
}

/** The words of a paragraph on as few lines of the width as they fit (a word too long on a line of its own). */
function wrapParagraph(paragraph: string, width: number, measure: (text: string) => number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of paragraph.split(' ')) {
        const candidate = line === '' ? word : `${line} ${word}`;
        if (line !== '' && measure(candidate) > width) {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }
    lines.push(line);
    return lines;
}

/** The last line shown, cut to end with an ellipsis within the width. */
function withEllipsis(line: string, width: number, measure: (text: string) => number): string {
    let text = line;
    while (text.length > 0 && measure(`${text}${ELLIPSIS}`) > width) {
        text = text.slice(0, -1);
    }
    return `${text.trimEnd()}${ELLIPSIS}`;
}

/** The lines of the text that fit the box in the font. */
export function wrapText(text: string, box: { readonly width: number; readonly height: number }, font: WrapFont): readonly string[] {
    const measure = measurer(font);
    const lines = text.split('\n').flatMap((paragraph) => wrapParagraph(paragraph, box.width, measure));
    const fitting = Math.max(1, Math.floor(box.height / (font.size * WRAP_LINE_HEIGHT)));
    if (lines.length <= fitting) {
        return lines;
    }
    const shown = lines.slice(0, fitting);
    shown[fitting - 1] = withEllipsis(shown[fitting - 1], box.width, measure);
    return shown;
}
