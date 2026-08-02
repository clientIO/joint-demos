import { ElementOverlay } from '@joint/react-plus';
import type { CellId } from '@joint/react-plus';
import type { EditableShape } from '@/mermaid/edit-source';
import type { NodeData } from '@/mermaid/to-cells';
import { SVGShape } from './svg-shape';

/**
 * Shape and fill for the selected node, floating above it on the canvas.
 *
 * Both write back into the Mermaid source — the text stays the single source of
 * truth, and the change returns through the normal parse pass.
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

/** Icon canvas, sized so every shape's clamped details still read. */
const ICON = { width: 30, height: 20, padding: 1.5 };

/**
 * Draws the button's shape with the very geometry the canvas uses, so a picker
 * icon can never drift from what choosing it produces.
 */
function ShapeIcon({ shape }: Readonly<{ shape: EditableShape }>) {
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

export interface NodeToolbarProps {
    readonly cellId: CellId;
    readonly data: NodeData;
    readonly onShapeChange: (id: CellId, shape: EditableShape) => void;
    readonly onFillChange: (id: CellId, fill: string | null) => void;
}

export function NodeToolbar({ cellId, data, onShapeChange, onFillChange }: NodeToolbarProps) {
    const shape = SHAPES.some((entry) => entry.id === data.shape)
        ? (data.shape as EditableShape)
        : 'squareRect';

    return (
        <ElementOverlay cell={cellId} position="top" origin="bottom" dy={-10}>
            <div className="node-toolbar" onPointerDown={(event) => event.stopPropagation()}>
                <span className="node-toolbar-group" role="radiogroup" aria-label="Node shape">
                    {SHAPES.map((entry) => (
                        <button
                            key={entry.id}
                            type="button"
                            role="radio"
                            aria-checked={entry.id === shape}
                            aria-label={entry.label}
                            title={entry.label}
                            className={`node-toolbar-shape${entry.id === shape ? ' is-active' : ''}`}
                            onClick={() => onShapeChange(cellId, entry.id)}
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
                            onClick={() => onFillChange(cellId, fill)}
                        />
                    ))}
                    <button
                        type="button"
                        className="node-toolbar-swatch is-clear"
                        aria-label="Clear fill"
                        // A fill inherited from a `classDef` is not this node's
                        // to drop, so say so rather than offer a dead click.
                        disabled={!data.hasOwnFill}
                        title={data.hasOwnFill ? 'Clear fill' : 'No fill of its own to clear'}
                        onClick={() => onFillChange(cellId, null)}
                    />
                </span>
            </div>
        </ElementOverlay>
    );
}
