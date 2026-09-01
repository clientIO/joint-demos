import { useEffect } from 'react';
import { dia } from '@joint/plus';
import { useSelectionCollection, useOnPaperEvents } from '@joint/react-plus';
import { addEffect, removeEffect, EffectType } from '../effects';
import { isForkEvent, getPoolParent, resolveDefaultLinkType, isSwimlane, isPool, isActivity } from '../utils';
import { PlaceholderShapeTypes } from '../shapes/link-config';

import type { AppElement, AppLink } from '../shapes/shapes-typing';
import type { AppLinkView } from '../shapes/link-view';

// Viewing interactions: panning, selection semantics, embedding highlights,
// link snap styling and invalid-target effects.
export function useViewInteractions() {

    const selection = useSelectionCollection();
    const { collection } = selection;

    // The built-in `ctrl`/`cmd`+click toggles cells in the selection. Shapes
    // are kept to one pool at a time, so a selection never mixes elements from
    // different participants (or a pool with global elements). Connectors are
    // not scoped: a message flow crosses pools by definition, and the
    // inspector edits them as their own group.
    useEffect(() => {
        const scopeOf = (cell: dia.Cell) => getPoolParent(cell)?.id ?? null;

        const onAdd = (model: dia.Cell) => {
            if (!model.isElement()) return;

            const scope = scopeOf(model);
            const outOfScope = collection.filter((cell) => cell.isElement() && scopeOf(cell) !== scope);
            if (outOfScope.length > 0) {
                collection.remove(outOfScope);
            }
        };

        collection.on('add', onAdd);

        return () => {
            collection.off('add', onAdd);
        };
    }, [collection]);

    useOnPaperEvents({

        onCellPointerUp: ({ model, event }) => {
            if (isForkEvent(event) && model.graph) {
                // If this is the end of fork and the cell wasn't removed - select it
                selection.collection.reset([model]);
            }
        },


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
            (view as AppLinkView).changeStyle(linkType);
        },

        onLinkSnapDisconnect: ({ view }) => {
            (view as AppLinkView).changeStyle(PlaceholderShapeTypes.LINK);
        },

        onLinkPointerMove: ({ paper, view, event, x, y }) => onLinkPointerMove(paper, view, event, x, y),

        onLinkPointerUp: ({ paper }) => {
            removeEffect(paper, EffectType.MarkUnavailable);
        }
    });

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
