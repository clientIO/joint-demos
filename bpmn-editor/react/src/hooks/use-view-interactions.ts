import { dia } from '@joint/plus';
import { useSelectionCollection, useOnPaperEvents } from '@joint/react-plus';
import { addEffect, removeEffect, EffectType } from '../effects';
import { isForkEvent, getPoolParent, resolveDefaultLinkType, isSwimlane, isPool, isActivity } from '../utils';
import { PlaceholderShapeTypes } from '../shapes/placeholder/placeholder-config';

import type { ui , shapes } from '@joint/plus';
import type { AppElement, AppLink } from '../shapes/shapes-typing';
import type { BPMNLinkView } from '../shapes/placeholder/placeholder-shapes';

// Viewing interactions: panning, selection semantics, embedding highlights,
// link snap styling and invalid-target effects.
export function useViewInteractions() {

    const selection = useSelectionCollection();

    useOnPaperEvents({

        onCellPointerUp: ({ model, event }) => {
            if (isForkEvent(event) && model.graph) {
                // If this is the end of fork and the cell wasn't removed - select it
                selection.collection.reset([model]);
            }
        },

        onCellPointerClick: ({ model, event }) => onCellPointerClick(selection, model, event),

        // Embedding highlights have no dedicated React handler — raw events.
        'cell:highlight': (cellView: dia.CellView, _node: SVGElement, options: dia.CellView.EventHighlightOptions) => {
            if (options.type !== dia.CellView.Highlighting.EMBEDDING) return;

            const { model } = cellView;

            if (isSwimlane(model)) {
                addEffect(cellView, EffectType.TargetSwimlaneEmbed);
                return;
            }

            if (isActivity(model)) {
                addEffect(cellView, EffectType.ActivityBoundaryEmbed);
            }
        },

        'cell:unhighlight': (cellView: dia.CellView, _node: SVGElement, options: dia.CellView.EventHighlightOptions) => {
            if (options.type !== dia.CellView.Highlighting.EMBEDDING) return;

            const { model, paper } = cellView;

            if (isSwimlane(model)) {
                removeEffect(paper!, EffectType.TargetSwimlaneEmbed);
                return;
            }

            if (isActivity(model)) {
                removeEffect(paper!, EffectType.ActivityBoundaryEmbed);
            }
        },

        onLinkSnapConnect: ({ view }) => {
            const linkType = resolveDefaultLinkType(view.model as AppLink);
            (view as BPMNLinkView).changeStyle(linkType);
        },

        onLinkSnapDisconnect: ({ view }) => {
            (view as BPMNLinkView).changeStyle(PlaceholderShapeTypes.LINK);
        },

        onLinkPointerMove: ({ paper, view, event, x, y }) => onLinkPointerMove(paper, view, event, x, y),

        onLinkPointerUp: ({ paper }) => {
            removeEffect(paper, EffectType.MarkUnavailable);
        }
    });

}

// Standard non-Shift click behavior:
// If the element is already the only selected one, clicking it again without Shift does nothing.
// Otherwise, select only this model. With Shift, cherry-pick elements within
// one pool (or globally), never mixing the two scopes.
function onCellPointerClick(selection: Pick<ui.Selection, 'collection'>, model: dia.Cell, event: dia.Event) {
    if (!event.shiftKey) {
        if (selection.collection.has(model) && selection.collection.length === 1) {
            return;
        }
        selection.collection.reset([model]);
        return;
    }

    // Ensure we are only cherry picking elements
    if (!model.isElement()) {
        return;
    }

    const clickedItemPool = getPoolParent(model);

    let currentSelectionContextPool: shapes.bpmn2.CompositePool | null = null;
    let isCurrentSelectionGlobal = false;
    let isCurrentSelectionPoolBased = false;

    if (selection.collection.length > 0) {
        const firstSelected = selection.collection.first();
        if (firstSelected) {
            currentSelectionContextPool = getPoolParent(firstSelected);
            if (currentSelectionContextPool) {
                isCurrentSelectionPoolBased = true;
            } else {
                isCurrentSelectionGlobal = true;
            }
        }
    }

    let needsReset = false;
    // Only consider resetting if there's an existing selection
    if (selection.collection.length > 0) {
        if (isCurrentSelectionPoolBased) {
            // Current selection is from a specific pool
            if (!clickedItemPool) { // Clicked item is global
                needsReset = true;
            } else if (clickedItemPool.id !== currentSelectionContextPool!.id) {
                // Clicked item is in a different pool
                needsReset = true;
            }
        } else if (isCurrentSelectionGlobal) {
            // Current selection is global
            if (clickedItemPool) {
                // Clicked item is in a pool
                needsReset = true;
            }
        }
    }

    if (needsReset) {
        selection.collection.reset([]);
    }

    if (selection.collection.has(model)) {
        selection.collection.remove(model);
    } else {
        selection.collection.add(model);
    }
}

function onLinkPointerMove(paper: dia.Paper, linkView: dia.LinkView, evt: dia.Event, x: number, y: number) {

    removeEffect(paper, EffectType.MarkUnavailable);

    let hoveredView = paper.findElementViewsAtPoint({ x, y }).sort((a, b) => (b.model.get('z') ?? 0) - (a.model.get('z') ?? 0))[0];

    if (!hoveredView) {
        return;
    }

    const movingArrowhead = linkView.eventData(evt).arrowhead as 'source' | 'target';
    const isHoveredElementSource = movingArrowhead === 'source';

    let hoveredElement = hoveredView.model as AppElement;
    const secondaryElement = (isHoveredElementSource ? linkView.model.getTargetCell() : linkView.model.getSourceCell()) as AppElement;

    // If hovering a swimlane, validate its parent pool
    if (isSwimlane(hoveredElement)) {
        hoveredElement = hoveredElement.getParentCell() as AppElement;
        hoveredView = hoveredElement.findView(paper) as dia.ElementView;
    }

    const source = !isHoveredElementSource ? secondaryElement : hoveredElement;
    const target = isHoveredElementSource ? secondaryElement : hoveredElement;

    // If the connection is valid, do nothing
    if (source.validateConnection(target)) return;

    // Else add the invalid effect
    addEffect(hoveredView, EffectType.MarkUnavailable, { applyAll: true });

    if (isPool(hoveredElement)) {
        hoveredElement.getSwimlanes().forEach(swimlane => {
            addEffect(swimlane.findView(paper) as dia.ElementView, EffectType.MarkUnavailable);
        });
    }
}
