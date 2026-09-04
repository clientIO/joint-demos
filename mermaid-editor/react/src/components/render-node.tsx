import { SVGText, useCell, useCellId, useMeasureElement } from '@joint/react-plus';
import type { ElementRecord } from '@joint/react-plus';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { NodeData } from '@/mermaid/to-cells';
import { useNodeEditing } from './node-editing';
import { SVGShape } from './svg-shape';
import { getShapeSpec } from './shapes';

const FONT_SIZE = 13;
const LINE_HEIGHT = 17;

/** Image-card geometry: default picture box, frame padding, picture-label gap. */
const IMAGE_DEFAULT_SIZE = 56;
const IMAGE_PAD = 10;
const IMAGE_GAP = 8;

/** Mermaid writes line breaks as `<br>`; `SVGText` splits on newlines. */
const LINE_BREAK = /<br\s*\/?>/gi;

function toMultiline(label: string): string {
    return label.replace(LINE_BREAK, '\n');
}

/**
 * Renders one cell: a `subgraph` container or a flowchart node. Split into two
 * components so each keeps its own hook order.
 * @param data - The cell's parsed Mermaid data.
 */
export function RenderNode(data: NodeData) {
    if (data.isGroup) return <SubgraphCell label={data.label} />;
    return <FlowNodeCell {...data} />;
}

/** Padding the measured title adds around itself for the container minimum. */
const GROUP_TITLE_PAD_X = 24;
const GROUP_MIN = { width: 120, height: 80 };
const GROUP_TITLE_Y = 22;

const isSameSize = (a: { width: number; height: number }, b: { width: number; height: number }) =>
    a.width === b.width && a.height === b.height;

/**
 * A `subgraph … end` block: a rounded container behind its member nodes.
 *
 * Unlike a node, its size is owned by the layout — `fitToChildren` wraps it
 * around its members — so the outline is drawn from the element's live size.
 * The measured title only sets a floor, which is what an *empty* subgraph
 * stands on.
 */
function SubgraphCell({ label }: Readonly<{ label: string }>) {
    const [textNode, setTextNode] = useState<SVGTextElement | null>(null);
    const { textRef, options } = useMemo(() => ({
        textRef: { current: textNode },
        options: {
            transform: (title: { width: number; height: number }) => ({
                width: Math.max(title.width + 2 * GROUP_TITLE_PAD_X, GROUP_MIN.width),
                height: GROUP_MIN.height,
            }),
        },
    }), [textNode]);
    useMeasureElement(textRef, options);
    // The live element size, which `fitToChildren` rewrites after every layout.
    const size = useCell<ElementRecord<NodeData>, { width: number; height: number }>(
        (cell) => ({ width: cell.size.width, height: cell.size.height }),
        isSameSize
    );

    return (
        <>
            <rect
                className="mermaid-subgraph-body"
                width={size.width}
                height={size.height}
                rx={10}
                ry={10}
            />
            <SVGText
                ref={setTextNode}
                className="mermaid-subgraph-title"
                x={size.width / 2}
                y={GROUP_TITLE_Y}
                textAnchor="middle"
                textVerticalAnchor="middle"
                fontSize={12}
                lineHeight={LINE_HEIGHT}
                pointerEvents="none"
            >
                {toMultiline(label)}
            </SVGText>
        </>
    );
}

/**
 * Renders one Mermaid node.
 *
 * The label is the source of truth for size: `useMeasureElement` watches the
 * text element and feeds its bounding box through the shape's `size()` to get
 * the JointJS element size, which the outline is then drawn against.
 *
 * `SVGText` renders the label rather than a hand-built `<text>`: it lays a
 * newline-separated string out as tspans and centres the block on its own via
 * `textVerticalAnchor`, so a two-line label needs no per-line `dy` arithmetic
 * here — and because it forwards its ref to the underlying `<text>`, the
 * measurement above still sees the whole block.
 * @param data - Label and Mermaid shape id of the node.
 */
function FlowNodeCell(data: NodeData) {
    const cellId = useCellId();
    const editing = useNodeEditing();
    const isEditing = editing !== null && cellId !== undefined && editing.editingId === cellId;
    const label = data.label;
    const spec = getShapeSpec(data.shape);
    // An `@{ img: … }` node renders as an image card: picture on top, label
    // underneath, rectangle outline — Mermaid's `imageSquare`.
    const imageWidth = data.img === undefined ? 0 : data.assetWidth ?? IMAGE_DEFAULT_SIZE;
    const imageHeight = data.img === undefined ? 0 : data.assetHeight ?? IMAGE_DEFAULT_SIZE;
    /*
     * The measured node is held in state, not in a plain ref.
     *
     * `SVGText` forwards its ref through `useCombinedRef`, which assigns it in
     * a passive effect rather than synchronously on commit. `useMeasureElement`
     * reads the ref in a *layout* effect — one phase earlier — so on the first
     * commit it sees `null`, returns early, and never registers the node with
     * the size observer: its dependencies do not include the node, so nothing
     * makes it run again. The element then stays 0×0 for good, which renders as
     * a bare label with no shape behind it and no layout.
     *
     * Development hid this. React's StrictMode remounts effects there, and the
     * second pass finds the ref already set by the first pass's passive effect,
     * so it only ever broke in a production build.
     *
     * Keeping the node in state produces a fresh ref object the moment the text
     * is attached, which re-runs the hook's effect with a node to register.
     */
    const [textNode, setTextNode] = useState<SVGTextElement | null>(null);
    /*
     * Keyed on the shape as well as the node, so switching shape re-registers.
     *
     * `useMeasureElement` captures the `transform` at registration and its
     * effect does not depend on it, so a new transform alone is never picked
     * up. Nothing re-measures either: the label is the observed element and its
     * box does not change when the shape does. The element therefore kept the
     * previous shape's size — a circle turned into a rectangle stayed a 59x59
     * square instead of losing the padding a circle needs for its diagonal.
     *
     * A fresh ref object makes the hook's effect re-run, which re-observes the
     * node and recomputes the size through the new shape's transform. Both come
     * out of one memo because together they *are* the registration: this node,
     * measured through this shape's padding.
     */
    const { textRef, options } = useMemo(() => ({
        textRef: { current: textNode },
        options: {
            transform: imageWidth === 0
                ? spec.size
                : (title: { width: number; height: number }) => ({
                    // The card must hold whichever is wider, label or image.
                    width: Math.max(
                        title.width + 2 * IMAGE_PAD,
                        imageWidth + 2 * IMAGE_PAD,
                        60
                    ),
                    height: title.height + imageHeight + IMAGE_GAP + 2 * IMAGE_PAD,
                }),
        },
    }), [textNode, spec, imageWidth, imageHeight]);
    const { width, height } = useMeasureElement(textRef, options);

    const cx = width / 2;
    const cy = height / 2;
    // Shapes whose enclosed area is off-centre (the cylinder's cap) shift the
    // label only — the outline geometry keeps using the true centre. On an
    // image card the label sits in the strip below the picture instead.
    const textY = imageWidth === 0
        ? cy + (spec.textDy ?? 0)
        : IMAGE_PAD + imageHeight + IMAGE_GAP
            + (height - imageHeight - IMAGE_GAP - 2 * IMAGE_PAD) / 2;

    return (
        <>
            <SVGShape
                shape={imageWidth === 0 ? data.shape : 'squareRect'}
                width={width}
                height={height}
                style={data.style?.body}
            />
            {data.img !== undefined && (
                <image
                    href={data.img}
                    x={(width - imageWidth) / 2}
                    y={IMAGE_PAD}
                    width={imageWidth}
                    height={imageHeight}
                    preserveAspectRatio="xMidYMid meet"
                    pointerEvents="none"
                />
            )}
            <SVGText
                ref={setTextNode}
                style={data.style?.text}
                // Kept mounted while editing: this is what `useMeasureElement`
                // measures, so hiding it rather than unmounting it holds the
                // node's size steady under the input.
                opacity={isEditing ? 0 : undefined}
                className="mermaid-node-text"
                x={cx}
                y={textY}
                textAnchor="middle"
                textVerticalAnchor="middle"
                fontSize={FONT_SIZE}
                lineHeight={LINE_HEIGHT}
                pointerEvents="none"
            >
                {toMultiline(label)}
            </SVGText>
            {isEditing && (
                <LabelInput
                    // The editor works in real newlines, not in `<br>`: the
                    // author types line breaks and they are encoded back into
                    // Mermaid syntax when the source is written.
                    label={toMultiline(label)}
                    width={width}
                    centerY={textY}
                    onCommit={(next) => editing.commit(cellId, next)}
                    onCancel={editing.cancel}
                />
            )}
            {data.href !== undefined && !isEditing && (
                <LinkBadge href={data.href} title={data.hrefTitle} x={width} />
            )}
        </>
    );
}

const BADGE_RADIUS = 9;

/**
 * The `click <id> "<url>"` affordance: a small ↗ pinned to the node's
 * top-right corner. A real SVG `<a>`, so middle-click, keyboard focus and the
 * status-bar URL preview all behave like any other link.
 */
function LinkBadge({ href, title, x }: Readonly<{ href: string; title?: string; x: number }>) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mermaid-node-link"
            aria-label={title ?? `Open ${href}`}
            // A press on the badge is navigation, not node selection.
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
        >
            <title>{title ?? href}</title>
            <circle className="mermaid-node-link-disc" cx={x} cy={0} r={BADGE_RADIUS} />
            <path
                className="mermaid-node-link-arrow"
                d={`M ${x - 3} 3 L ${x + 3} -3 M ${x - 1.5} -3 H ${x + 3} V 1.5`}
                fill="none"
            />
        </a>
    );
}

const INPUT_INSET = 6;
const INPUT_MIN_WIDTH = 60;
const INPUT_MIN_HEIGHT = 24;
/** Past this the field scrolls instead of growing off the node. */
const INPUT_MAX_HEIGHT = 140;
/** The field's own border, which `scrollHeight` does not include. */
const INPUT_BORDER = 2;

const COMMIT_HINT = 'Enter to save · Shift+Enter for a new line · Esc to cancel';

interface LabelInputProps {
    /** Current label, with real newlines rather than Mermaid's `<br>`. */
    readonly label: string;
    readonly width: number;
    readonly centerY: number;
    readonly onCommit: (label: string) => void;
    readonly onCancel: () => void;
}

/**
 * The in-place label editor: an HTML textarea in a `<foreignObject>`, sitting
 * exactly where the label is.
 *
 * A textarea rather than an input because Mermaid labels are multi-line — an
 * input cannot hold a newline at all, so line breaks could only be written by
 * typing `<br>` into the source by hand. Enter still commits, as it did when
 * this was an input; the line break moves to Shift+Enter.
 *
 * It holds its own draft and reports only on commit. Writing to the source on
 * every keystroke would reparse, rebuild the cells and remount this field,
 * losing the caret mid-word.
 */
function LabelInput({ label, width, centerY, onCommit, onCancel }: LabelInputProps) {
    const [draft, setDraft] = useState(label);
    const [boxHeight, setBoxHeight] = useState(INPUT_MIN_HEIGHT);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const boxWidth = Math.max(width - 2 * INPUT_INSET, INPUT_MIN_WIDTH);

    useEffect(() => {
        inputRef.current?.select();
    }, []);

    // Grow with the text. The node itself only resizes once the edit is
    // committed and the source round-trips, so until then the field has to
    // make its own room — measured rather than counted, because a long line
    // wraps into several without ever containing a newline.
    useLayoutEffect(() => {
        const input = inputRef.current;
        if (input === null) return;
        input.style.height = '0px';
        const content = input.scrollHeight + INPUT_BORDER;
        const next = Math.min(Math.max(content, INPUT_MIN_HEIGHT), INPUT_MAX_HEIGHT);
        input.style.height = `${next}px`;
        setBoxHeight(next);
    }, [draft, boxWidth]);

    function commit() {
        const next = draft.trim();
        if (next === '' || next === label) onCancel();
        else onCommit(next);
    }

    return (
        <foreignObject
            x={INPUT_INSET}
            y={centerY - boxHeight / 2}
            width={boxWidth}
            height={boxHeight}
        >
            <textarea
                ref={inputRef}
                className="mermaid-node-input"
                value={draft}
                rows={1}
                spellCheck={false}
                aria-label="Node label"
                title={COMMIT_HINT}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={commit}
                onKeyDown={(event) => {
                    // Shift+Enter is the line break; a bare Enter commits, so
                    // the textarea must not also insert one.
                    if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        commit();
                    }
                    if (event.key === 'Escape') onCancel();
                    // The paper listens on the same subtree, so without this a
                    // keystroke would reach its handlers too.
                    event.stopPropagation();
                }}
                // Keep a press in the field from reaching the paper, which
                // would re-run selection and take focus back.
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onDoubleClick={(event) => event.stopPropagation()}
            />
        </foreignObject>
    );
}
