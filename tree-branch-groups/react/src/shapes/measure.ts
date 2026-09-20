/** A 2D context of an off-screen canvas, for measuring text in a font. */
let measuringContext: CanvasRenderingContext2D | null = null;

/** The width of `text` set in `font` (a CSS font shorthand), by the canvas. */
export function measureText(text: string, font: string): number {
    measuringContext ??= document.createElement('canvas').getContext('2d')!;
    measuringContext.font = font;
    return measuringContext.measureText(text).width;
}
