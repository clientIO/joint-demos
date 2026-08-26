import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as Toolbar from '@radix-ui/react-toolbar';
import { useCells, useGraph, useSelectionCollection } from '@joint/react-plus';
import { replaceShape } from '../../actions/replace-shape';

import type { AppElement, AppLink, AppShape, MarkerNames } from '../../shapes/shapes-typing';

/**
 * Multi-select toggles for the shape's markers (Radix ToggleGroup: roving
 * focus, arrow-key navigation and pressed states out of the box).
 */
function MarkersSection({ shape }: { shape: AppElement }) {
    const markers = shape.getMarkers!();
    const selectedMarkers: MarkerNames[] = shape.get('markers') ?? [];

    return (
        <>
            <h2 className="content-label">Available markers</h2>
            <ToggleGroup.Root
                type="multiple"
                className="select-button-group"
                aria-label="Available markers"
                value={selectedMarkers}
                onValueChange={(values) => shape.setMarkers!(values as MarkerNames[])}
            >
                {markers.map((marker) => (
                    <ToggleGroup.Item
                        key={marker.name}
                        value={marker.name}
                        className="select-button-group-button"
                    >
                        {/* Icon-font glyph (PUA codepoint) — hidden so it
                            does not pollute the accessible name. */}
                        <span className={marker.cssClass} aria-hidden="true" />
                        <span>{marker.name}</span>
                    </ToggleGroup.Item>
                ))}
            </ToggleGroup.Root>
        </>
    );
}

/**
 * Buttons morphing the cell into a related shape type (same id).
 */
function ShapesSection({ shape }: { shape: AppElement | AppLink }) {
    const { graph } = useGraph();
    const selection = useSelectionCollection();
    const shapeTypes = shape.getShapeList();

    const morphTo = (type: string) => {
        const shapeConstructor = graph.getTypeConstructor(type)!;
        const newShape = new shapeConstructor({ id: shape.id });

        replaceShape(graph, shape, newShape as AppShape);

        // Re-select the new shape, which re-opens the inspector for it.
        selection.collection.reset([newShape]);
    };

    return (
        <>
            <h2 className="content-label">Available shapes</h2>
            {/* Radix Toolbar: one-shot action buttons with roving focus and
                arrow-key navigation (same keyboard UX as the marker toggles). */}
            <Toolbar.Root
                orientation="vertical"
                className="select-button-group"
                aria-label="Available shapes"
            >
                {shapeTypes.map((type) => {
                    const shapeConstructor = graph.getTypeConstructor(type)!;
                    const { label, icon } = shapeConstructor as unknown as { label?: string; icon?: string };
                    return (
                        <Toolbar.Button
                            key={type}
                            className="select-button-group-button"
                            onClick={() => morphTo(type)}
                        >
                            <span className={icon} aria-hidden="true" />
                            <span>{label ?? type}</span>
                        </Toolbar.Button>
                    );
                })}
            </Toolbar.Root>
        </>
    );
}

/**
 * The Content inspector tab: marker toggles and shape morphing.
 */
export function ContentTab({ cell }: { cell: AppElement | AppLink }) {
    // Re-render on marker changes (including undo/redo).
    useCells(cell.id);

    const hasMarkers = cell.isElement() && !!cell.getMarkers && cell.getMarkers().length > 0;
    const hasShapes = cell.getShapeList().length > 0;

    return (
        <div className="inspector-content-wrapper">
            {hasMarkers && <MarkersSection shape={cell as AppElement} />}
            {hasShapes && <ShapesSection shape={cell} />}
        </div>
    );
}
