import { useCells, useGraph, useSelectionCollection } from '@joint/react-plus';
import { replaceShape } from '../../actions/replace-shape';

import type { AppElement, AppLink, AppShape, Marker, MarkerNames } from '../../shapes/shapes-typing';

/**
 * Multi-select buttons toggling the shape's markers.
 */
function MarkersSection({ shape }: { shape: AppElement }) {
    const markers = shape.getMarkers!();
    const selectedMarkers: MarkerNames[] = shape.get('markers') ?? [];

    const toggleMarker = (marker: Marker) => {
        const isSelected = selectedMarkers.includes(marker.name);
        const newMarkers = isSelected
            ? selectedMarkers.filter((name) => name !== marker.name)
            : [...selectedMarkers, marker.name];
        shape.setMarkers!(newMarkers);
    };

    return (
        <>
            <h3 className="content-label">Available markers</h3>
            <div className="select-button-group">
                {markers.map((marker) => (
                    <button
                        type="button"
                        key={marker.name}
                        className={`select-button-group-button${selectedMarkers.includes(marker.name) ? ' selected' : ''}`}
                        onClick={() => toggleMarker(marker)}
                    >
                        <span className={marker.cssClass} />
                        <span>{marker.name}</span>
                    </button>
                ))}
            </div>
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
            <h3 className="content-label">Available shapes</h3>
            <div className="select-button-group">
                {shapeTypes.map((type) => {
                    const shapeConstructor = graph.getTypeConstructor(type)!;
                    const { label, icon } = shapeConstructor as unknown as { label?: string; icon?: string };
                    return (
                        <button
                            type="button"
                            key={type}
                            className="select-button-group-button"
                            onClick={() => morphTo(type)}
                        >
                            <span className={icon} />
                            <span>{label ?? type}</span>
                        </button>
                    );
                })}
            </div>
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
