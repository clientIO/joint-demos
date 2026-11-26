import { useImage } from '../images';
import type { SymbolProps } from '../types';

// How wide the edge of the screen is grabbed by while the settings are open.
const SCREEN_EDGE_WIDTH = 16;

/**
 * The screen: the area run mode fills the window with. A dashed frame under everything with its name and size
 * above it; the pointer goes through it, except its edge while the settings are open.
 */
export function ScreenDrawing({ width, height }: SymbolProps) {
    return (
        <g className="scada-screen">
            <rect width={width} height={height} fill="none" stroke="var(--shape-screen)" strokeWidth={2} strokeDasharray="8 4" pointerEvents="none" />
            <rect className="scada-screen-edge" width={width} height={height} fill="none" stroke="transparent" strokeWidth={SCREEN_EDGE_WIDTH} pointerEvents="none" />
            <text className="scada-screen-label" x={0} y={-8} fontSize={14} fontFamily="sans-serif" fill="var(--shape-screen)" pointerEvents="none">
                {`Screen ${Math.round(width)} × ${Math.round(height)}`}
            </text>
        </g>
    );
}

/** A group draws nothing: its members are the drawing (its frame and ID badge are the editor's). */
export function GroupDrawing() {
    return null;
}

/** An uploaded image, whole in the element's size; a placeholder when the diagram has not the image (pasted from another). */
export function CustomImageDrawing({ width, height, data }: SymbolProps) {
    const image = useImage(data.imageId);
    if (!image) {
        return (
            <svg className="scada-missing-image" width={width} height={height} viewBox="0 0 48 48" preserveAspectRatio="xMidYMid meet">
                <rect x={1} y={1} width={46} height={46} rx={4} fill="none" strokeDasharray="4 3" />
                <path d="M 14 14 H 34 V 34 H 14 Z M 14 30 L 21 23 L 27 29 M 26 22 A 2 2 0 1 0 26.1 22 M 12 12 L 36 36" fill="none" />
            </svg>
        );
    }
    return (
        <svg width={width} height={height} viewBox={`0 0 ${image.width} ${image.height}`} preserveAspectRatio="xMidYMid meet" opacity={data.style?.opacity}>
            <image href={image.href} width={image.width} height={image.height} />
        </svg>
    );
}
