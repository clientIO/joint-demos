import { useEffect } from 'react';
import { ui } from '@joint/plus';
import { FreeTransform, usePaper } from '@joint/react-plus';
import { useSelectedCell } from '../hooks/use-selected-cell';

import type { dia } from '@joint/plus';
import type { BpmnElement } from '../shapes/shapes-typing';
import { isSwimlane, isPool } from '../utils';

const FREE_TRANSFORM_OPTIONS = {
    allowRotation: false,
    useBordersToResize: true,
    padding: 4
} as const;

/**
 * Resize handles for the selected element. Plain elements use the react
 * FreeTransform component; pools and swimlanes need `ui.BPMNFreeTransform`
 * (pool/lane-aware resizing), which has no react component — it is managed
 * imperatively with the same selection-derived lifecycle.
 */
export function BpmnFreeTransform() {

    const { paper } = usePaper();
    const selected = useSelectedCell();

    const element = selected?.isElement() && (selected as BpmnElement).isResizable
        ? selected as BpmnElement
        : null;

    const isBPMNShape = !!element
        && (isPool(element) || isSwimlane(element));

    useEffect(() => {
        if (!paper || !element || !isBPMNShape) return;

        const cellView = paper.findViewByModel(element);
        if (!cellView) return;

        const freeTransform = new ui.BPMNFreeTransform({
            cellView: cellView as dia.ElementView,
            ...FREE_TRANSFORM_OPTIONS
        });
        // Pick up the free-transform styling of the react components
        // (the widget renders with joint-* class names of its own).
        freeTransform.el.classList.add('jj-free-transform');

        return () => {
            freeTransform.remove();
        };
    }, [paper, element, isBPMNShape]);

    if (!element || isBPMNShape) return null;

    return (
        <FreeTransform
            // Remount when the model instance changes: shape morphing replaces
            // the cell with a new model under the same id, which the component
            // alone does not detect (it compares cells by id).
            key={element.cid}
            cell={element}
            minWidth={element.getMinimalSize?.().width}
            minHeight={element.getMinimalSize?.().height}
            {...FREE_TRANSFORM_OPTIONS}
        />
    );
}
