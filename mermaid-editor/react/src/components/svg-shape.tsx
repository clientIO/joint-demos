import type { CSSProperties } from 'react';
import { getShapeSpec } from './shapes';

/**
 * A Mermaid node shape drawn at a given size.
 *
 * Split out of the node renderer so the toolbar's shape picker can draw its
 * icons from the same geometry: the button for a cylinder is a real cylinder,
 * not a hand-drawn stand-in that could drift from the canvas.
 */

export interface SVGShapeProps {
    /** Mermaid shape id; unknown ids fall back to a rectangle. */
    readonly shape: string;
    readonly width: number;
    readonly height: number;
    /** Inline style for the outline, e.g. a Mermaid `style` directive's fill. */
    readonly style?: CSSProperties;
    readonly className?: string;
    readonly detailClassName?: string;
}

export function SVGShape({
    shape,
    width,
    height,
    style,
    className = 'mermaid-node-body',
    detailClassName = 'mermaid-node-detail',
}: SVGShapeProps) {
    const outline = getShapeSpec(shape).outline({ width, height });

    // The `text` shape draws nothing — but still needs a hit area, or the
    // node could never be clicked, selected or renamed on the canvas.
    if (outline.kind === 'none') {
        return <rect className={`${className} is-ghost`} width={width} height={height} />;
    }

    if (outline.kind === 'rect') {
        return (
            <rect
                style={style}
                className={className}
                width={width}
                height={height}
                rx={outline.rx}
                ry={outline.rx}
            />
        );
    }

    if (outline.kind === 'ellipse') {
        return (
            <ellipse
                style={style}
                className={className}
                cx={width / 2}
                cy={height / 2}
                rx={width / 2}
                ry={height / 2}
            />
        );
    }

    // `is-filled` paints the body in the stroke colour (fork bars, junction
    // dots); `is-open` drops the fill for shapes that are not closed (braces).
    const variant = outline.filled ? ' is-filled' : outline.open ? ' is-open' : '';
    return (
        <>
            <path
                style={style}
                className={`${className}${variant}`}
                d={outline.d}
                strokeLinejoin="round"
            />
            {outline.inner && (
                <path className={detailClassName} d={outline.inner} pointerEvents="none" />
            )}
        </>
    );
}
