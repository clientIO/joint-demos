import type { CSSProperties } from 'react';
import { SVGText, useCell, selectElementSize, useIsCellSelected } from '@joint/react-plus';
import { HIGHLIGHT_COLOR, INK_COLOR, NODE_FILL_COLOR, NODE_SHADOW } from '@/theme';
import type { NodeData, NodeKind } from '@/data/cells';

const FONT_SIZE = 14;

/** The presentation slice of {@link ShapeProps} — what gets spread onto the SVG node. */
interface ShapeStyleProps {
    readonly fill?: string;
    readonly stroke?: string;
    readonly strokeWidth?: number;
    readonly strokeLinejoin?: 'round' | 'miter' | 'bevel';
    readonly opacity?: number;
    readonly style?: CSSProperties;
}

/** The fat translucent stroke the selection halo copy of the outline gets. */
const HALO_PROPS: ShapeStyleProps = {
    fill: HIGHLIGHT_COLOR,
    stroke: HIGHLIGHT_COLOR,
    strokeWidth: 10,
    strokeLinejoin: 'round',
    opacity: 0.3,
};

/** The node card: white, thin accent stroke, a soft lift. */
const BODY_PROPS: ShapeStyleProps = {
    fill: NODE_FILL_COLOR,
    stroke: HIGHLIGHT_COLOR,
    strokeWidth: 1.5,
    style: { filter: NODE_SHADOW },
};

interface ShapeProps extends ShapeStyleProps {
    readonly kind: NodeKind;
    readonly width: number;
    readonly height: number;
    readonly rx?: number;
}

/**
 * One flowchart outline. The `d` expressions reproduce the `calc()` paths the
 * saved JSON described (`standard.Path`), evaluated against the fixed size.
 */
function Shape({ kind, width, height, rx, ...svgProps }: ShapeProps) {
    switch (kind) {
        case 'ellipse':
            return (
                <ellipse
                    {...svgProps}
                    cx={width / 2} cy={height / 2} rx={width / 2} ry={height / 2}
                />
            );
        case 'parallelogram':
            // Was: M 20 0 H calc(w) L calc(w-20) calc(h) H 0 Z
            return <path {...svgProps} d={`M 20 0 H ${width} L ${width - 20} ${height} H 0 Z`} />;
        case 'diamond':
            // Was: M 0 calc(0.5*h) calc(0.5*w) 0 calc(w) calc(0.5*h) calc(0.5*w) calc(h) Z
            return (
                <path
                    {...svgProps}
                    d={`M 0 ${height / 2} L ${width / 2} 0 L ${width} ${height / 2} L ${width / 2} ${height} Z`}
                />
            );
        default:
            return <rect {...svgProps} width={width} height={height} rx={rx} ry={rx} />;
    }
}

/**
 * Renders one flowchart node.
 *
 * Geometry comes off the model (`useCell(selectElementSize)`) — the saved
 * diagrams carry a fixed size per cell, so nothing is measured out of the DOM.
 *
 * The selection halo is rendered here too: while the node is selected, an
 * extra copy of the outline with a fat stroke is mounted as the first child,
 * so it paints behind the body — the same read the old `highlighters.mask`
 * on the BACK layer gave.
 */
export function RenderNode({ kind, label, rx }: NodeData) {
    const { width, height } = useCell(selectElementSize);
    const selected = useIsCellSelected();
    return (
        <>
            {selected && (
                <Shape kind={kind} width={width} height={height} rx={rx} {...HALO_PROPS} />
            )}
            <Shape kind={kind} width={width} height={height} rx={rx} {...BODY_PROPS} />
            <SVGText
                x={width / 2}
                y={height / 2}
                fill={INK_COLOR}
                fontWeight={500}
                textAnchor="middle"
                textVerticalAnchor="middle"
                fontSize={FONT_SIZE}
                pointerEvents="none"
            >
                {label}
            </SVGText>
        </>
    );
}
