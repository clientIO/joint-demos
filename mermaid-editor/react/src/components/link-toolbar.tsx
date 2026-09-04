import { Overlay } from '@joint/react-plus';
import type { CellId } from '@joint/react-plus';
import type { ChangeEvent } from 'react';
import type { EdgeRef } from '@/mermaid/edit-source';
import type { EdgeData } from '@/mermaid/to-cells';
import type { FlowArrow, FlowStroke } from '@/mermaid/types';
import type { EdgeEditHandlers } from './diagram';

/**
 * Formatting for the selected edge, floating above its midpoint.
 *
 * Same contract as the node toolbar: every control rewrites the Mermaid
 * source — the arrow token for line pattern and heads, a `linkStyle` line for
 * colour and curve, an `id@{ animate: true }` block for the animation — and
 * the change returns through the normal parse pass.
 */

const STROKES: ReadonlyArray<{ readonly id: FlowStroke; readonly label: string }> = [
    { id: 'normal', label: 'Solid line' },
    { id: 'dotted', label: 'Dotted line' },
    { id: 'thick', label: 'Thick line' },
];

const HEADS: ReadonlyArray<{ readonly id: FlowArrow; readonly label: string }> = [
    { id: 'arrow_point', label: 'Arrow head' },
    { id: 'arrow_circle', label: 'Circle head' },
    { id: 'arrow_cross', label: 'Cross head' },
    { id: 'none', label: 'No head' },
];

/** Line colours a `linkStyle stroke:` gets; strong enough to read at 2 px. */
const LINE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#64748b'];

/** The curve the toggle writes; Mermaid's own default family. */
const CURVED = 'basis';

/** Curves that read as "curved" for the toggle's pressed state. */
const SMOOTH = new Set([
    'basis', 'bumpX', 'bumpY', 'cardinal', 'catmullRom', 'monotoneX', 'monotoneY', 'natural',
]);

function StrokeIcon({ stroke }: Readonly<{ stroke: FlowStroke }>) {
    return (
        <svg viewBox="0 0 24 8" width={24} height={8} aria-hidden>
            <path
                d="M 1 4 H 23"
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke === 'thick' ? 3 : 1.75}
                strokeLinecap="round"
                strokeDasharray={stroke === 'dotted' ? '2 4' : undefined}
            />
        </svg>
    );
}

function HeadIcon({ head }: Readonly<{ head: FlowArrow }>) {
    return (
        <svg
            viewBox="0 0 24 12"
            width={24}
            height={12}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
        >
            <path d={head === 'none' ? 'M 2 6 H 22' : 'M 2 6 H 15'} />
            {head === 'arrow_point' && <path d="M 14 2 L 21 6 L 14 10 Z" fill="currentColor" />}
            {head === 'arrow_circle' && <circle cx={18} cy={6} r={3.5} />}
            {head === 'arrow_cross' && <path d="M 15 3 L 21 9 M 21 3 L 15 9" />}
        </svg>
    );
}

function BothEndsIcon() {
    return (
        <svg
            viewBox="0 0 24 12"
            width={24}
            height={12}
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden
        >
            <path d="M 8 6 H 16" fill="none" />
            <path d="M 8.5 2.5 L 2.5 6 L 8.5 9.5 Z" />
            <path d="M 15.5 2.5 L 21.5 6 L 15.5 9.5 Z" />
        </svg>
    );
}

function CurveIcon() {
    return (
        <svg viewBox="0 0 24 12" width={24} height={12} fill="none" stroke="currentColor"
            strokeWidth={1.75} strokeLinecap="round" aria-hidden
        >
            <path d="M 2 10 C 8 10 8 2 14 2 L 22 2" />
        </svg>
    );
}

function AnimateIcon() {
    return (
        <svg viewBox="0 0 24 8" width={24} height={8} aria-hidden>
            <path
                d="M 1 4 H 23"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeDasharray="4 3"
            />
        </svg>
    );
}

export interface LinkToolbarProps {
    readonly cellId: CellId;
    readonly data: EdgeData;
    /** Toolbar anchor: the link's midpoint, in paper-local coordinates. */
    readonly x: number;
    readonly y: number;
    readonly edit: EdgeEditHandlers;
}

export function LinkToolbar({ cellId, data, x, y, edit }: LinkToolbarProps) {
    const edge: EdgeRef = {
        id: String(cellId),
        source: data.source,
        target: data.target,
        index: data.index,
        pairIndex: data.pairIndex,
    };
    const isBidirectional = data.sourceArrow !== 'none';
    const isCurved = data.curve !== undefined && SMOOTH.has(data.curve);
    const isAnimated = data.animation !== undefined;

    // Only the DELTA is sent: the unchanged parts are read back from the
    // source at edit time (see `setEdgeArrow`), so a quick second click never
    // composes from data that lags a parse behind.
    const arrow = (change: Partial<{ stroke: FlowStroke; sourceArrow: FlowArrow; targetArrow: FlowArrow }>) =>
        edit.onArrowChange(edge, change);

    return (
        <Overlay x={x} y={y} origin="bottom" dy={-12}>
            <div className="node-toolbar" onPointerDown={(event) => event.stopPropagation()}>
                <span className="node-toolbar-row">
                    <span className="node-toolbar-cluster" role="radiogroup" aria-label="Line style">
                        {STROKES.map((entry) => (
                            <button
                                key={entry.id}
                                type="button"
                                role="radio"
                                aria-checked={data.stroke === entry.id}
                                aria-label={entry.label}
                                title={entry.label}
                                className={`node-toolbar-toggle${data.stroke === entry.id ? ' is-active' : ''}`}
                                onClick={() => arrow({ stroke: entry.id })}
                            >
                                <StrokeIcon stroke={entry.id} />
                            </button>
                        ))}
                    </span>
                    <span className="node-toolbar-cluster" role="radiogroup" aria-label="Arrow head">
                        {HEADS.map((entry) => (
                            <button
                                key={entry.id}
                                type="button"
                                role="radio"
                                aria-checked={data.targetArrow === entry.id}
                                aria-label={entry.label}
                                title={entry.label}
                                className={`node-toolbar-toggle${data.targetArrow === entry.id ? ' is-active' : ''}`}
                                onClick={() => arrow({
                                    targetArrow: entry.id,
                                    // A mirrored start head follows the end head;
                                    // a plain one keeps its `none`.
                                    sourceArrow: isBidirectional && entry.id !== 'none'
                                        ? entry.id
                                        : 'none',
                                })}
                            >
                                <HeadIcon head={entry.id} />
                            </button>
                        ))}
                    </span>
                    <span className="node-toolbar-cluster">
                        <button
                            type="button"
                            className={`node-toolbar-toggle${isBidirectional ? ' is-active' : ''}`}
                            aria-pressed={isBidirectional}
                            aria-label="Arrow on both ends"
                            title="Arrow on both ends"
                            onClick={() => arrow({
                                sourceArrow: isBidirectional
                                    ? 'none'
                                    : data.targetArrow === 'none' ? 'arrow_point' : data.targetArrow,
                                targetArrow: !isBidirectional && data.targetArrow === 'none'
                                    ? 'arrow_point'
                                    : data.targetArrow,
                            })}
                        >
                            <BothEndsIcon />
                        </button>
                        <button
                            type="button"
                            className={`node-toolbar-toggle${isCurved ? ' is-active' : ''}`}
                            aria-pressed={isCurved}
                            aria-label="Curved line"
                            title={isCurved ? 'Straight line' : `Curved line (interpolate ${CURVED})`}
                            onClick={() => edit.onCurveChange(data.index, isCurved ? null : CURVED)}
                        >
                            <CurveIcon />
                        </button>
                        <button
                            type="button"
                            className={`node-toolbar-toggle${isAnimated ? ' is-active' : ''}`}
                            aria-pressed={isAnimated}
                            aria-label="Animate edge"
                            title={isAnimated ? 'Stop the marching dashes' : 'Animate (marching dashes)'}
                            onClick={() => edit.onAnimationChange(edge, !isAnimated)}
                        >
                            <AnimateIcon />
                        </button>
                    </span>
                </span>
                <span className="node-toolbar-swatches">
                    {LINE_COLORS.map((color) => (
                        <button
                            key={color}
                            type="button"
                            className="node-toolbar-swatch"
                            style={{ background: color }}
                            aria-label={`Line colour ${color}`}
                            title={color}
                            onClick={() => edit.onColorChange(data.index, color)}
                        />
                    ))}
                    <label className="node-toolbar-swatch is-custom" title="Custom line colour">
                        <input
                            type="color"
                            aria-label="Custom line colour"
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                                edit.onColorChange(data.index, event.target.value)}
                        />
                    </label>
                    <button
                        type="button"
                        className="node-toolbar-swatch is-clear"
                        aria-label="Reset line colour"
                        disabled={data.color === undefined}
                        title={data.color === undefined ? 'Theme colour' : 'Reset line colour'}
                        onClick={() => edit.onColorChange(data.index, null)}
                    />
                </span>
            </div>
        </Overlay>
    );
}
