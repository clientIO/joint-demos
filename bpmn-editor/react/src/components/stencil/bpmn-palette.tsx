import { useGraph, useStencil } from '@joint/react-plus';
import { stencilPaletteItems, type StencilPaletteItem } from '../../configs/stencil-config';
import { Tip } from '../ui/tip';

import type { PointerEvent } from 'react';

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

export function BpmnPalette() {
    return (
        <div className="stencil-palette">
            {stencilPaletteItems.map((item) => (
                <PaletteItem key={item.type} {...item} />
            ))}
        </div>
    );
}
