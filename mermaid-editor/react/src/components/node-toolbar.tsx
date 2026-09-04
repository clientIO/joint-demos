import { ElementOverlay } from '@joint/react-plus';
import type { CellId } from '@joint/react-plus';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import type { EditableShape } from '@/mermaid/edit-source';
import type { NodeData } from '@/mermaid/to-cells';
import type { NodeEditHandlers } from './diagram';
import { getShapeSpec } from './shapes';
import { SVGShape } from './svg-shape';

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

/**
 * The rest of Mermaid's flowchart vocabulary — the v11 `@{ shape: … }` names.
 * Choosing one rewrites the node's declaration into that syntax (the only
 * spelling these shapes have), labels included.
 */
const EXTENDED_SHAPES: ReadonlyArray<{ readonly id: string; readonly label: string }> = [
    { id: 'dbl-circ', label: 'Double circle' },
    { id: 'sm-circ', label: 'Start' },
    { id: 'fr-circ', label: 'Stop' },
    { id: 'f-circ', label: 'Junction' },
    { id: 'cross-circ', label: 'Summary' },
    { id: 'lean-l', label: 'Parallelogram (left)' },
    { id: 'trap-b', label: 'Priority (trapezoid)' },
    { id: 'trap-t', label: 'Manual operation' },
    { id: 'odd', label: 'Odd' },
    { id: 'text', label: 'Text block' },
    { id: 'card', label: 'Card' },
    { id: 'lin-rect', label: 'Lined process' },
    { id: 'st-rect', label: 'Stacked process' },
    { id: 'tag-rect', label: 'Tagged process' },
    { id: 'div-rect', label: 'Divided process' },
    { id: 'win-pane', label: 'Internal storage' },
    { id: 'sl-rect', label: 'Manual input' },
    { id: 'bow-rect', label: 'Stored data' },
    { id: 'fork', label: 'Fork / join' },
    { id: 'hourglass', label: 'Collate' },
    { id: 'bolt', label: 'Com link' },
    { id: 'tri', label: 'Extract' },
    { id: 'flip-tri', label: 'Manual file' },
    { id: 'notch-pent', label: 'Loop limit' },
    { id: 'flag', label: 'Paper tape' },
    { id: 'delay', label: 'Delay' },
    { id: 'doc', label: 'Document' },
    { id: 'docs', label: 'Documents' },
    { id: 'lin-doc', label: 'Lined document' },
    { id: 'tag-doc', label: 'Tagged document' },
    { id: 'h-cyl', label: 'Direct access storage' },
    { id: 'lin-cyl', label: 'Disk storage' },
    { id: 'curv-trap', label: 'Display' },
    { id: 'brace', label: 'Comment (brace)' },
    { id: 'brace-r', label: 'Brace right' },
    { id: 'braces', label: 'Braces' },
];

/** A small palette keeps the generated `style` lines readable. */
const FILLS = ['#ddffee', '#fef3c7', '#fee2e2', '#dbeafe', '#ede9fe', '#e5e7eb'];

/** Icon canvas, sized so every shape's clamped details still read. */
const ICON = { width: 30, height: 20, padding: 1.5 };

/** `stroke-dasharray` values the border picker writes; solid removes the entry. */
const BORDERS = [
    { id: 'solid', label: 'Solid border', dasharray: null },
    { id: 'dashed', label: 'Dashed border', dasharray: '8 5' },
    { id: 'dotted', label: 'Dotted border', dasharray: '2 4' },
] as const;

/**
 * Draws the button's shape with the very geometry the canvas uses, so a picker
 * icon can never drift from what choosing it produces.
 */
function ShapeIcon({ shape }: Readonly<{ shape: string }>) {
    const { width, height, padding } = ICON;
    return (
        <svg
            className="node-toolbar-icon"
            viewBox={`0 0 ${width + 2 * padding} ${height + 2 * padding}`}
            width={width + 2 * padding}
            height={height + 2 * padding}
            aria-hidden
        >
            <g transform={`translate(${padding} ${padding})`}>
                <SVGShape shape={shape} width={width} height={height} />
            </g>
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

function PlusIcon() {
    return (
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor"
            strokeWidth={1.75} strokeLinecap="round" aria-hidden
        >
            <path d="M8 3v10M3 8h10" />
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
}

export function NodeToolbar({ cellId, data, edit }: NodeToolbarProps) {
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
    // Open whenever the node wears an extended shape — otherwise nothing in
    // the toolbar would show which shape is active. Derived (not mount-only):
    // a source edit can reshape the selected node without remounting this
    // toolbar. The user's own toggle takes precedence once used.
    const isExtendedActive =
        !SHAPES.some((entry) => isActive(entry.id))
        && EXTENDED_SHAPES.some((entry) => isActive(entry.id));
    const [moreOverride, setMoreOverride] = useState<boolean | null>(null);
    const isMoreOpen = moreOverride ?? isExtendedActive;

    return (
        <ElementOverlay cell={cellId} position="top" origin="bottom" dy={-10}>
            <div className="node-toolbar" onPointerDown={(event) => event.stopPropagation()}>
                <span className="node-toolbar-row">
                    <span className="node-toolbar-group" role="radiogroup" aria-label="Node shape">
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
                    {/* Outside the radiogroup: it is a disclosure, not a radio. */}
                    <button
                        type="button"
                        className={`node-toolbar-toggle is-more${isMoreOpen ? ' is-active' : ''}`}
                        aria-pressed={isMoreOpen}
                        aria-expanded={isMoreOpen}
                        aria-label="More shapes"
                        title="More shapes (@{ shape } syntax)"
                        onClick={() => setMoreOverride(!isMoreOpen)}
                    >
                        ⋯
                    </button>
                </span>
                {isMoreOpen && (
                    <span className="node-toolbar-more" role="radiogroup" aria-label="More shapes">
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
                )}
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
                        <button
                            type="button"
                            className="node-toolbar-toggle"
                            aria-label="Add a connected step"
                            title="Add a connected step"
                            onClick={() => edit.onAddChild(cellId)}
                        >
                            <PlusIcon />
                        </button>
                    </span>
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
