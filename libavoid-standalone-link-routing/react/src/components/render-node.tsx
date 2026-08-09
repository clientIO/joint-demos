import { SVGText } from '@joint/react-plus';
import { NODE_SIZE } from '@/data/cells';
import type { NodeData } from '@/data/cells';
import { BORDER_COLOR, DARK_COLOR, FONT_FAMILY, LIGHT_COLOR, MAIN_COLOR, MUTED_COLOR } from '@/theme';

/** The "message" glyph, inlined so the node needs no network request. */
const ICON_HREF =
    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siIHdpZHRoPSIxOHB4IiBoZWlnaHQ9IjE4cHgiPjxwYXRoIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMjEgMy4wMUgzYy0xLjEgMC0yIC45LTIgMlY5aDJWNC45OWgxOHYxNC4wM0gzVjE1SDF2NC4wMWMwIDEuMS45IDEuOTggMiAxLjk4aDE4YzEuMSAwIDItLjg4IDItMS45OHYtMTRjMC0xLjExLS45LTItMi0yek0xMSAxNmw0LTQtNC00djNIMXYyaDEwdjN6Ii8+PC9zdmc+';

const ICON_SIZE = 24;
const ICON_X = 16;
const LABEL_X = 54;

/** Room the icon and the padding take from the label's wrapping width. */
const LABEL_INSET = 70;

function MessageNode({ label }: { readonly label: string }) {
    const { width, height } = NODE_SIZE.message;
    return (
        <>
            <rect
                width={width}
                height={height}
                rx={4}
                ry={4}
                fill={LIGHT_COLOR}
                stroke={BORDER_COLOR}
                strokeWidth={1}
            />
            <image
                href={ICON_HREF}
                x={ICON_X}
                y={(height - ICON_SIZE) / 2}
                width={ICON_SIZE}
                height={ICON_SIZE}
                preserveAspectRatio="xMidYMid meet"
            />
            <SVGText
                x={LABEL_X}
                y={height / 2}
                width={width - LABEL_INSET}
                // One line, cut with an ellipsis: the box is a fixed width, so a
                // long name has to give way rather than push the layout around.
                textWrap={{ maxLineCount: 1, ellipsis: true }}
                textAnchor="start"
                textVerticalAnchor="middle"
                fill={DARK_COLOR}
                fontFamily={FONT_FAMILY}
                fontSize={15}
                fontWeight={600}
                pointerEvents="none"
            >
                {label}
            </SVGText>
        </>
    );
}

function StartNode({ label }: { readonly label: string }) {
    const { width, height } = NODE_SIZE.start;
    return (
        <>
            <circle cx={width / 2} cy={height / 2} r={width / 2} fill={MAIN_COLOR} />
            <SVGText
                x={width / 2}
                y={-10}
                textAnchor="middle"
                textVerticalAnchor="bottom"
                fill={MUTED_COLOR}
                fontFamily={FONT_FAMILY}
                fontSize={13}
                fontWeight={500}
                pointerEvents="none"
            >
                {label}
            </SVGText>
        </>
    );
}

/**
 * One node of the flowchart, as SVG.
 *
 * `renderElement` hands over the element's `data` slice and nothing else, so
 * this component never re-runs when a node is dragged — JointJS moves the
 * rendered SVG itself. With virtual rendering on top of that, only the nodes
 * inside the viewport are mounted at all, so the subtree is kept small and
 * cheap to mount as it crosses the edge.
 *
 * The geometry is read from `NODE_SIZE` rather than measured: these shapes are
 * a fixed size per kind, and measuring ~380 of them would put a `ResizeObserver`
 * round trip between the graph loading and the first route being computed.
 */
export function RenderNode({ kind, label }: NodeData) {
    return kind === 'start' ? <StartNode label={label} /> : <MessageNode label={label} />;
}
