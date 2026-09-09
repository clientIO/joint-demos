import { ElementOverlay, useGraph, usePaper } from '@joint/react-plus';
import type { CellId } from '@joint/react-plus';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';
import type { EditableShape } from '@/mermaid/edit-source';
import type { NodeData } from '@/mermaid/to-cells';
import { EXTENDED_SHAPES } from '@/mermaid/vocabulary';
import { DeleteButton } from './delete-button';
import type { NodeEditHandlers } from './diagram';
import { getShapeSpec } from './shapes';
import { SVGShape } from './svg-shape';
import { placeToolbar } from './toolbar-placement';

/**
 * Formatting for the selected node, floating above it on the canvas.
 *
 * Every control writes back into the Mermaid source — the text stays the
 * single source of truth, and the change returns through the normal parse
 * pass. Shape and fill rewrite the node's declaration and `style` line; bold,
 * italic and border land on the `style` line too; the hyperlink writes a
 * `click` statement; "add step" appends a connected node.
 *
 * The label is not here: it is edited in place on the node itself, where the
 * text already is. See `render-node.tsx`.
 */

const SHAPES: ReadonlyArray<{ readonly id: EditableShape; readonly label: string }> = [
    { id: 'squareRect', label: 'Rectangle' },
    { id: 'roundedRect', label: 'Rounded' },
    { id: 'stadium', label: 'Stadium' },
    { id: 'diamond', label: 'Rhombus' },
    { id: 'circle', label: 'Circle' },
    { id: 'hexagon', label: 'Hexagon' },
    { id: 'cylinder', label: 'Cylinder' },
    { id: 'subroutine', label: 'Subroutine' },
    { id: 'lean_right', label: 'Parallelogram' },
];


/** A small palette keeps the generated `style` lines readable. */
const FILLS = ['#ddffee', '#fef3c7', '#fee2e2', '#dbeafe', '#ede9fe', '#e5e7eb'];

/**
 * Where the toolbar opens: which side of the node, and how far to shift it
 * sideways so it stays inside the canvas.
 *
 * Above by default — that is where it stays clear of the node's own outgoing
 * flow and its add-step button. A node near the top of the viewport has no
 * room there, though, and an overlay drawn off-screen simply gets clipped
 * (this is a plain absolutely-positioned element, not a popover the browser
 * repositions), so it flips below whenever the space above cannot hold it and
 * the space below is roomier. The same goes sideways: a node near the left or
 * right edge would push half the toolbar out of view, so it slides inward by
 * exactly the overhang, measured from the rendered width.
 */
function useToolbarPlacement(
    cellId: CellId,
    rootRef: RefObject<HTMLDivElement | null>
): { side: 'top' | 'bottom'; dx: number } {
    const { paper } = usePaper();
    const { graph } = useGraph();
    // The rendered width, kept current as the extended grid folds and unfolds.
    const [width, setWidth] = useState(0);
    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const measure = () => setWidth(root.getBoundingClientRect().width);
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(root);
        return () => observer.disconnect();
    }, [rootRef]);
    if (!paper) return { side: 'top', dx: 0 };
    const cell = graph.getCell(cellId);
    if (!cell || !cell.isElement()) return { side: 'top', dx: 0 };
    const box = cell.getBBox();
    const top = paper.localToClientPoint({ x: box.x, y: box.y });
    const bottom = paper.localToClientPoint({ x: box.x, y: box.y + box.height });
    const center = paper.localToClientPoint({ x: box.x + box.width / 2, y: box.y });
    // The VISIBLE canvas, not the paper: inside the scroller the paper runs
    // well past the viewport (it starts under the source pane once the canvas
    // is scrolled), so its box is the wrong edge to keep the toolbar inside.
    const viewport = (paper.el.closest<HTMLElement>('.jj-paper-scroller') ?? paper.el).getBoundingClientRect();
    return placeToolbar({ top: top.y, bottom: bottom.y, centerX: center.x }, width, viewport);
}

/** Icon canvas, in CSS px; every shape is drawn at natural size and fitted into it. */
const ICON = { width: 30, height: 20, padding: 1.5 };

/** `stroke-dasharray` values the border picker writes; solid removes the entry. */
const BORDERS = [
    { id: 'solid', label: 'Solid border', dasharray: null },
    { id: 'dashed', label: 'Dashed border', dasharray: '8 5' },
    { id: 'dotted', label: 'Dotted border', dasharray: '2 4' },
] as const;

/**
 * Shapes whose icon is type rather than geometry: the comment shapes are a
 * tall brace beside a note (squeezed into the icon box the brace path
 * collapses into a squiggle), and the `text` shape draws no outline at all,
 * which left its button blank.
 */
const GLYPH_ICONS: Readonly<Record<string, string>> = {
    brace: '{',
    'brace-l': '{',
    'brace-r': '}',
    braces: '{ }',
    text: 'Aa',
};

/**
 * The label a picker icon pretends to hold. Every shape's own `size()` then
 * says how big — and how proportioned — the node would be, so the icon is the
 * canvas node itself scaled down, and details drawn in canvas pixels (tag
 * corners, header rules, cylinder caps) keep the proportions the node has.
 */
const ICON_LABEL = { width: 44, height: 16 };

/**
 * Draws the button's shape with the very geometry the canvas uses, so a picker
 * icon can never drift from what choosing it produces.
 */
function ShapeIcon({ shape }: Readonly<{ shape: string }>) {
    const { width, height, padding } = ICON;
    const glyph = GLYPH_ICONS[shape];
    if (glyph !== undefined) {
        return (
            <svg
                className="node-toolbar-icon"
                viewBox={`0 0 ${width + 2 * padding} ${height + 2 * padding}`}
                width={width + 2 * padding}
                height={height + 2 * padding}
                aria-hidden
            >
                <text
                    className="node-toolbar-glyph"
                    x={(width + 2 * padding) / 2}
                    y={(height + 2 * padding) / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                >
                    {glyph}
                </text>
            </svg>
        );
    }
    const natural = getShapeSpec(shape).size(ICON_LABEL);
    // Never magnify: a shape smaller than the box (the small circles) is shown
    // at 1:1, centred, instead of looming over its neighbours.
    const view = { width: Math.max(natural.width, width), height: Math.max(natural.height, height) };
    // Room for the (non-scaling) stroke, in shape units: about one screen px.
    const margin = Math.max(view.width, view.height) / width;
    const originX = -(view.width - natural.width) / 2 - margin;
    const originY = -(view.height - natural.height) / 2 - margin;
    return (
        <svg
            className="node-toolbar-icon"
            viewBox={`${originX} ${originY} ${view.width + 2 * margin} ${view.height + 2 * margin}`}
            width={width + 2 * padding}
            height={height + 2 * padding}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
        >
            <SVGShape shape={shape} width={natural.width} height={natural.height} />
        </svg>
    );
}

/** A line sample for the border picker: the stroke it would apply. */
function BorderIcon({ dasharray }: Readonly<{ dasharray: string | null }>) {
    return (
        <svg viewBox="0 0 24 8" width={24} height={8} aria-hidden>
            <path
                d="M 1 4 H 23"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeDasharray={dasharray ?? undefined}
            />
        </svg>
    );
}

function LinkIcon() {
    return (
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor"
            strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden
        >
            <path d="M6.5 9.5 9.5 6.5" />
            <path d="M7.5 4.5 9 3a2.5 2.5 0 0 1 3.5 3.5L11 8" />
            <path d="M8.5 11.5 7 13a2.5 2.5 0 0 1-3.5-3.5L5 8" />
        </svg>
    );
}

function ImageIcon() {
    return (
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor"
            strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden
        >
            <rect x={2} y={3} width={12} height={10} rx={1.5} />
            <circle cx={5.75} cy={6.5} r={1.1} fill="currentColor" stroke="none" />
            <path d="M4 12 7.5 8.5 10 11l1.5-1.5L14 12" />
        </svg>
    );
}

/** Whether the merged text style asks for a bold / italic label. */
function isBold(data: NodeData): boolean {
    const weight = data.style?.text?.fontWeight;
    return weight === 'bold' || weight === '600' || weight === '700' || weight === 700 || weight === 600;
}

function isItalic(data: NodeData): boolean {
    return data.style?.text?.fontStyle === 'italic';
}

/** Which border option the merged body style currently matches. */
function borderOf(data: NodeData): (typeof BORDERS)[number]['id'] {
    const dasharray = data.style?.body?.strokeDasharray;
    if (dasharray === undefined) return 'solid';
    const first = Number.parseFloat(String(dasharray));
    // A keyword value (`none`) parses to NaN and draws solid.
    if (!Number.isFinite(first)) return 'solid';
    return first <= 3 ? 'dotted' : 'dashed';
}

interface UrlEditorProps {
    /** Accessible name for the field: what the URL becomes. */
    readonly label: string;
    readonly value: string | undefined;
    readonly onApply: (url: string | null) => void;
    readonly onClose: () => void;
}

/** Inline URL row, opened by the link and image toggles. */
function UrlEditor({ label, value, onApply, onClose }: UrlEditorProps) {
    const [draft, setDraft] = useState(value ?? '');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    function apply() {
        const url = draft.trim();
        if (url === '') onApply(null);
        else onApply(url);
        onClose();
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') {
            event.preventDefault();
            apply();
        }
        if (event.key === 'Escape') onClose();
        event.stopPropagation();
    }

    return (
        <span className="node-toolbar-linkrow">
            <input
                ref={inputRef}
                className="node-toolbar-linkinput"
                type="url"
                placeholder="https://…"
                aria-label={label}
                value={draft}
                spellCheck={false}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
            />
            <button type="button" className="node-toolbar-action" onClick={apply}>
                Apply
            </button>
            {value !== undefined && (
                <button
                    type="button"
                    className="node-toolbar-action"
                    onClick={() => {
                        onApply(null);
                        onClose();
                    }}
                >
                    Remove
                </button>
            )}
        </span>
    );
}

export interface NodeToolbarProps {
    readonly cellId: CellId;
    readonly data: NodeData;
    readonly edit: NodeEditHandlers;
    /** Take keyboard focus on open — the node was just added from the keyboard. */
    readonly autoFocus?: boolean;
    /** Escape: close the toolbar and hand focus back to the canvas. */
    readonly onDismiss: () => void;
    /** Removes the node from the source; the canvas takes focus back. */
    readonly onDelete: () => void;
}

/**
 * Arrow keys walk a radiogroup of buttons, wrapping at the ends — the
 * expected keyboard model for a picker, on top of plain Tab.
 */
function onRadioGroupKeyDown(event: KeyboardEvent<HTMLElement>): void {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (step === 0) return;
    const radios = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')];
    const index = radios.findIndex((radio) => radio === document.activeElement);
    if (index === -1) return;
    event.preventDefault();
    radios[(index + step + radios.length) % radios.length]?.focus();
}

export function NodeToolbar({ cellId, data, edit, autoFocus = false, onDismiss, onDelete }: NodeToolbarProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    // Focus the active shape on open when asked to; the user just added the
    // node from the keyboard and should land on its controls.
    useEffect(() => {
        if (!autoFocus) return;
        const root = rootRef.current;
        const target = root?.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')
            ?? root?.querySelector<HTMLElement>('button');
        target?.focus();
    }, [autoFocus]);
    // Aliases collapse through the geometry: `card` and `notch-rect` are the
    // same spec, so whichever spelling the author used, its button lights up.
    const activeSpec = getShapeSpec(data.shape);
    const isActive = (id: string) => getShapeSpec(id) === activeSpec;
    const bold = isBold(data);
    const italic = isItalic(data);
    const border = borderOf(data);
    // One URL row at a time: opening one closes the other.
    const [openEditor, setOpenEditor] = useState<'link' | 'image' | null>(null);
    const isLinkOpen = openEditor === 'link';
    const isImageOpen = openEditor === 'image';
    const { side, dx } = useToolbarPlacement(cellId, rootRef);

    return (
        <ElementOverlay
            cell={cellId}
            position={side}
            origin={side === 'top' ? 'bottom' : 'top'}
            dx={dx}
            // Clear of the node either way: up from its top edge, or down
            // past the add-step button hanging off its bottom one.
            dy={side === 'top' ? -10 : 24}
        >
            <div
                ref={rootRef}
                className="node-toolbar"
                role="group"
                aria-label="Node formatting"
                onPointerDown={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                    if (event.key !== 'Escape') return;
                    event.preventDefault();
                    event.stopPropagation();
                    onDismiss();
                }}
            >
                <span className="node-toolbar-group" role="radiogroup" aria-label="Node shape" onKeyDown={onRadioGroupKeyDown}>
                    {SHAPES.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            role="radio"
                            aria-checked={isActive(entry.id)}
                            aria-label={entry.label}
                            title={entry.label}
                            className={`node-toolbar-shape${isActive(entry.id) ? ' is-active' : ''}`}
                            onClick={() => edit.onShapeChange(cellId, entry.id)}
                        >
                            <ShapeIcon shape={entry.id} />
                        </button>
                    ))}
                </span>
                {/* The full catalogue is always open: a collapsed "⋯" hid three
                    quarters of the supported shapes from anyone who did not
                    think to press it. */}
                <span className="node-toolbar-more" role="radiogroup" aria-label="More shapes" onKeyDown={onRadioGroupKeyDown}>
                    {EXTENDED_SHAPES.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            role="radio"
                            aria-checked={isActive(entry.id)}
                            aria-label={entry.label}
                            title={entry.label}
                            className={`node-toolbar-shape${isActive(entry.id) ? ' is-active' : ''}`}
                            onClick={() => edit.onShapeChange(cellId, entry.id)}
                        >
                            <ShapeIcon shape={entry.id} />
                        </button>
                    ))}
                </span>
                <span className="node-toolbar-swatches">
                    {FILLS.map((fill) => (
                        <button
                            key={fill}
                            type="button"
                            className="node-toolbar-swatch"
                            style={{ background: fill }}
                            aria-label={`Fill ${fill}`}
                            title={fill}
                            onClick={() => edit.onFillChange(cellId, fill)}
                        />
                    ))}
                    <label className="node-toolbar-swatch is-custom" title="Custom fill">
                        <input
                            type="color"
                            aria-label="Custom fill"
                            // Committed on `change` (picker closed), not on every
                            // `input` tick — each write reparses the document.
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                edit.onFillChange(cellId, event.target.value)}
                        />
                    </label>
                    <button
                        type="button"
                        className="node-toolbar-swatch is-clear"
                        aria-label="Clear fill"
                        // A fill inherited from a `classDef` is not this node's
                        // to drop, so say so rather than offer a dead click.
                        disabled={!data.hasOwnFill}
                        title={data.hasOwnFill ? 'Clear fill' : 'No fill of its own to clear'}
                        onClick={() => edit.onFillChange(cellId, null)}
                    />
                </span>
                <span className="node-toolbar-row">
                    <span className="node-toolbar-cluster" role="group" aria-label="Text style">
                        <button
                            type="button"
                            className={`node-toolbar-toggle is-bold${bold ? ' is-active' : ''}`}
                            aria-pressed={bold}
                            aria-label="Bold label"
                            title="Bold"
                            onClick={() =>
                                edit.onStyleChange(cellId, 'font-weight', bold ? null : 'bold')}
                        >
                            B
                        </button>
                        <button
                            type="button"
                            className={`node-toolbar-toggle is-italic${italic ? ' is-active' : ''}`}
                            aria-pressed={italic}
                            aria-label="Italic label"
                            title="Italic"
                            onClick={() =>
                                edit.onStyleChange(cellId, 'font-style', italic ? null : 'italic')}
                        >
                            I
                        </button>
                        <label className="node-toolbar-toggle is-stroke" title="Text colour">
                            <span
                                className="node-toolbar-text-sample"
                                style={{ color: String(data.style?.text?.fill ?? 'currentColor') }}
                                aria-hidden
                            >
                                A
                            </span>
                            <input
                                type="color"
                                aria-label="Text colour"
                                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                    edit.onStyleChange(cellId, 'color', event.target.value)}
                            />
                        </label>
                        <button
                            type="button"
                            className="node-toolbar-swatch is-clear"
                            aria-label="Clear text colour"
                            // A colour inherited from a class or derived from
                            // the fill is not this node's to drop.
                            disabled={!data.hasOwnTextColor}
                            title={data.hasOwnTextColor ? 'Clear text colour' : 'No text colour of its own'}
                            onClick={() => edit.onStyleChange(cellId, 'color', null)}
                        />
                    </span>
                    <span className="node-toolbar-cluster" role="radiogroup" aria-label="Border style">
                        {BORDERS.map((entry) => (
                            <button
                                key={entry.id}
                                type="button"
                                role="radio"
                                aria-checked={border === entry.id}
                                aria-label={entry.label}
                                title={entry.label}
                                className={`node-toolbar-toggle${border === entry.id ? ' is-active' : ''}`}
                                onClick={() =>
                                    edit.onStyleChange(cellId, 'stroke-dasharray', entry.dasharray)}
                            >
                                <BorderIcon dasharray={entry.dasharray} />
                            </button>
                        ))}
                        <label className="node-toolbar-toggle is-stroke" title="Border colour">
                            <span
                                className="node-toolbar-stroke-ring"
                                style={{ borderColor: String(data.style?.body?.stroke ?? 'var(--node-stroke)') }}
                                aria-hidden
                            />
                            <input
                                type="color"
                                aria-label="Border colour"
                                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                    edit.onStyleChange(cellId, 'stroke', event.target.value)}
                            />
                        </label>
                    </span>
                    <span className="node-toolbar-cluster">
                        <button
                            type="button"
                            className={`node-toolbar-toggle${data.href !== undefined || isLinkOpen ? ' is-active' : ''}`}
                            aria-pressed={isLinkOpen}
                            aria-label="Hyperlink"
                            title={data.href ?? 'Add a hyperlink'}
                            onClick={() => setOpenEditor(isLinkOpen ? null : 'link')}
                        >
                            <LinkIcon />
                        </button>
                        <button
                            type="button"
                            className={`node-toolbar-toggle${data.img !== undefined || isImageOpen ? ' is-active' : ''}`}
                            aria-pressed={isImageOpen}
                            aria-label="Image"
                            title={data.img ?? 'Turn into an image card (@{ img } syntax)'}
                            onClick={() => setOpenEditor(isImageOpen ? null : 'image')}
                        >
                            <ImageIcon />
                        </button>
                    </span>
                    <DeleteButton label="Delete node" onClick={onDelete} />
                </span>
                {isLinkOpen && (
                    <UrlEditor
                        label="Node hyperlink"
                        value={data.href}
                        onApply={(url) => edit.onLinkChange(cellId, url)}
                        onClose={() => setOpenEditor(null)}
                    />
                )}
                {isImageOpen && (
                    <UrlEditor
                        label="Node image URL"
                        value={data.img}
                        onApply={(url) => edit.onImageChange(cellId, url)}
                        onClose={() => setOpenEditor(null)}
                    />
                )}
            </div>
        </ElementOverlay>
    );
}
