import { useCells, useSelectionCollection } from '@joint/react-plus';
import { getShapeConstructorByType } from '../../utils';
import { graph } from '../../editor/core';
import { replaceShape } from '../../editor/replace-shape';

import type { AppElement, AppLink, AppShape, Marker, MarkerNames } from '../../shapes/shapes-typing';

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
            <div className="joint-select-button-group">
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

function ShapesSection({ shape }: { shape: AppElement | AppLink }) {
    const selection = useSelectionCollection();
    const shapeTypes = shape.getShapeList();

    const morphTo = (type: string) => {
        const shapeConstructor = getShapeConstructorByType(type);
        const newShape = new shapeConstructor({ id: shape.id });

        replaceShape(graph, shape as unknown as AppShape, newShape as unknown as AppShape);

        // Re-select the new shape, which re-opens the inspector for it.
        selection.collection.reset([newShape]);
    };

    return (
        <>
            <h3 className="content-label">Available shapes</h3>
            <div className="joint-select-button-group">
                {shapeTypes.map((type) => {
                    const shapeConstructor = getShapeConstructorByType(type);
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
