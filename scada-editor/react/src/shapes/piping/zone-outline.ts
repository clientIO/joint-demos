import type { ShapeData } from '../types';

/** The side the tip of a zone points to: where the pipe comes from. */
export type TipSide = 'left' | 'right' | 'top' | 'bottom';

/** How far the tip reaches out of the zone and how wide it is at the side, whatever the size of the zone. */
export const TIP_DEPTH = 12;
export const TIP_WIDTH = 30;

/** How small a zone can get: its tip fits its side (the whole side of the lowest one). */
export const ZONE_MIN_SIZE = { width: 40, height: TIP_WIDTH } as const;

const TIP_SIDES: readonly TipSide[] = ['left', 'right', 'top', 'bottom'];

/** The side of the tip of the zone (its `tipSide`), the left by default. */
export function tipSideOf(data: ShapeData): TipSide {
    return TIP_SIDES.find((side) => side === data.tipSide) ?? 'left';
}

/**
 * The outline of a zone of the size: its box and the tip out of it at the middle of the side (out of the box: the
 * box is the text's, the pipe ends at the side under the tip).
 */
export function zoneOutline(side: TipSide, width: number, height: number): string {
    const [cx, cy, half] = [width / 2, height / 2, TIP_WIDTH / 2];
    switch (side) {
        case 'right':
            return `M 0 0 H ${width} V ${cy - half} L ${width + TIP_DEPTH} ${cy} L ${width} ${cy + half} V ${height} H 0 Z`;
        case 'top':
            return `M 0 0 H ${cx - half} L ${cx} ${-TIP_DEPTH} L ${cx + half} 0 H ${width} V ${height} H 0 Z`;
        case 'bottom':
            return `M 0 0 H ${width} V ${height} H ${cx + half} L ${cx} ${height + TIP_DEPTH} L ${cx - half} ${height} H 0 Z`;
        case 'left':
            return `M 0 0 H ${width} V ${height} H 0 V ${cy + half} L ${-TIP_DEPTH} ${cy} L 0 ${cy - half} Z`;
    }
}

// The share of the font size an average bold character is wide: the text is wrapped by its length, not measured.
const CHARACTER_WIDTH = 0.62;
const ELLIPSIS = '…';

/**
 * The lines of the text in the box: wrapped at the spaces (and its own line breaks), as many as fit its height
 * (one line a font size high), the last one cut with an ellipsis when the text is longer.
 */
export function wrapText(text: string, width: number, height: number, fontSize: number): string[] {
    const perLine = Math.max(1, Math.floor(width / (fontSize * CHARACTER_WIDTH)));
    const maxLines = Math.max(1, Math.floor(height / fontSize));
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
        let line = '';
        for (const word of paragraph.split(/\s+/).filter(Boolean)) {
            const candidate = line ? `${line} ${word}` : word;
            if (candidate.length <= perLine || !line) {
                line = candidate;
            } else {
                lines.push(line);
                line = word;
            }
        }
        lines.push(line);
    }
    if (lines.length <= maxLines && lines.every((line) => line.length <= perLine)) {
        return lines;
    }
    const shown = lines.slice(0, maxLines).map((line) => (line.length > perLine ? `${line.slice(0, perLine - 1)}${ELLIPSIS}` : line));
    const last = shown[shown.length - 1];
    if (lines.length > maxLines && !last.endsWith(ELLIPSIS)) {
        shown[shown.length - 1] = `${last.slice(0, Math.max(0, perLine - 1))}${ELLIPSIS}`;
    }
    return shown;
}
