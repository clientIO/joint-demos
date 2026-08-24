import { useGraph, useStencil } from '@joint/react-plus';
import { stencilPaletteItems, type StencilPaletteItem } from '../../configs/stencil-config';
import { Tip } from '../tooltip/tooltip';

import type { PointerEvent } from 'react';

/**
 * One palette button rendering the shape icon (icon font).
 */
function PaletteItem({ type, icon }: StencilPaletteItem) {
    const { graph } = useGraph();
    const { startCellDrag } = useStencil();

    const shapeConstructor = graph.getTypeConstructor(type)!;
    const label = (shapeConstructor as unknown as { label?: string }).label ?? type;

    const onPointerDown = (evt: PointerEvent) => {
        startCellDrag(new shapeConstructor(), evt);
    };

    return (
        <Tip label={label} side="right">
            <button
                type="button"
                className="stencil-item"
                aria-label={label}
                onPointerDown={onPointerDown}
            >
                <span className="stencil-item-icon">{icon}</span>
            </button>
        </Tip>
    );
}

/**
 * The stencil buttons — pointer-down starts a stencil drag with a freshly
 * constructed shape.
 */
export function BpmnPalette() {
    return (
        <div className="stencil-palette">
            {stencilPaletteItems.map((item) => (
                <PaletteItem key={item.type} {...item} />
            ))}
        </div>
    );
}
