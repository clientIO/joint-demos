import Controller from '../controller';
import { dia, shapes } from '@joint/plus';
import { ShapeTypes } from '../shapes/shapes-typing';
import { addEffect, removeEffect, EffectType } from '../effects';
import { isForkEvent, getPoolParent, resolveDefaultLinkType, getSwimlaneParent } from '../utils';
import { PlaceholderShapeTypes } from '../shapes/placeholder/placeholder-config';
import { ZOOM_SETTINGS } from '../configs/navigator-config';

export default class ViewController extends Controller {
    
    startListening() {
        const { paper } = this.context;
        
        this.listenTo(paper, {
            'blank:pointerdown': onPaperBlankPointerDown,
            'element:pointerdown': onElementPointerDown,
            'element:pointerup': onElementPointerUp,
            'blank:pointerclick': onPaperBlankPointerClick,
            'cell:pointerup': onCellPointerUp,
            'cell:pointerclick': onCellPointerClick,
            'cell:highlight': onCellHighlight,
            'cell:unhighlight': onCellUnhighlight,
            'link:snap:connect': onLinkSnapConnect,
            'link:snap:disconnect': onLinkSnapDisconnect,
            'paper:pinch': onPaperPinch,
            'link:pointermove': onLinkPointerMove,
            'link:pointerup': onLinkPointerUp
        });
    }
}

// Paper event handlers

function onPaperBlankPointerDown(context, evt) {
    const { paper, paperScroller, keyboard, selection } = context;
    
    if (keyboard.isActive('shift', evt)) {
        selection.startSelecting(evt);
    }
    else {
        selection.collection.reset([]);
        paperScroller.startPanning(evt);
        paper.removeTools();
    }
}

function onElementPointerDown(context, elementView, evt) {
    const { keyboard, selection } = context;
    
    // Only allow shift selection
    if (!keyboard.isActive('shift', evt))
        return;
    if (!shapes.bpmn2.Swimlane.isSwimlane(elementView.model))
        return;
    
    selection.startSelecting(evt);
    evt.data.selectionOriginSwimlaneId = elementView.model.id;
}

function onElementPointerUp(context, cellView, evt) {
    const eventData = evt.data;
    
    if (!eventData.selectionOriginSwimlaneId)
        return;
    
    const { selection } = context;
    
    // Select only elements inside the pool which was used as the start of the shift selection, excluding everything else
    selection.collection.reset(selection.collection.filter((cell) => {
        // Never select pools or swimlanes if the shift selection started on a pool or swimlane
        if (shapes.bpmn2.CompositePool.isPool(cell) ||
            shapes.bpmn2.Swimlane.isSwimlane(cell))
            return false;
        
        const parent = getSwimlaneParent(cell);
        // Cell is not part of any pool
        if (!parent)
            return false;
        return parent.id === eventData.selectionOriginSwimlaneId;
    }));
}

function onCellPointerUp(context, cellView, evt) {
    if (isForkEvent(evt) && cellView.model.graph) {
        // If this is the end of fork and the cell wasn't removed - select it
        context.selection.collection.reset([cellView.model]);
    }
}

function onCellPointerClick(context, cellView, evt) {
    const { keyboard, selection } = context;
    const { model } = cellView;
    
    // Standard non-Shift click behavior:
    // If the element is already the only selected one, clicking it again without Shift does nothing.
    // Otherwise, select only this model.
    if (!keyboard.isActive('shift', evt)) {
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
    
    let currentSelectionContextPool = null;
    let isCurrentSelectionGlobal = false;
    let isCurrentSelectionPoolBased = false;
    
    if (selection.collection.length > 0) {
        const firstSelected = selection.collection.first();
        if (firstSelected) {
            currentSelectionContextPool = getPoolParent(firstSelected);
            if (currentSelectionContextPool) {
                isCurrentSelectionPoolBased = true;
            }
            else {
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
            }
            else if (clickedItemPool.id !== currentSelectionContextPool.id) {
                // Clicked item is in a different pool
                needsReset = true;
            }
        }
        else if (isCurrentSelectionGlobal) {
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
    }
    else {
        selection.collection.add(model);
    }
}

function onPaperBlankPointerClick(context) {
    const { inspectorService } = context;
    
    inspectorService.close();
}

function onCellHighlight(_context, cellView, node, options) {
    if (options.type !== dia.CellView.Highlighting.EMBEDDING)
        return;
    
    const { model } = cellView;
    
    if (shapes.bpmn2.Swimlane.isSwimlane(model)) {
        addEffect(cellView, EffectType.TargetSwimlaneEmbed);
        return;
    }
    
    if (model.get('shapeType') === ShapeTypes.ACTIVITY) {
        addEffect(cellView, EffectType.ActivityBoundaryEmbed);
    }
}

function onCellUnhighlight(context, cellView, node, options) {
    if (options.type !== dia.CellView.Highlighting.EMBEDDING)
        return;
    
    const { model } = cellView;
    const { paper } = context;
    
    if (shapes.bpmn2.Swimlane.isSwimlane(model)) {
        removeEffect(paper, EffectType.TargetSwimlaneEmbed);
        return;
    }
    
    if (model.get('shapeType') === ShapeTypes.ACTIVITY) {
        removeEffect(paper, EffectType.ActivityBoundaryEmbed);
    }
}

function onLinkSnapConnect(_context, linkView, _evt) {
    const linkType = resolveDefaultLinkType(linkView.model);
    linkView.changeStyle(linkType);
}

function onLinkSnapDisconnect(_context, linkView, _evt) {
    linkView.changeStyle(PlaceholderShapeTypes.LINK);
}

function onPaperPinch(context, _evt, ox, oy, scale) {
    const { paperScroller } = context;
    const currentZoom = paperScroller.zoom();
    
    // Apply the zoom with the pinch scale factor
    paperScroller.zoom(currentZoom * scale, {
        min: ZOOM_SETTINGS.min,
        max: ZOOM_SETTINGS.max,
        ox,
        oy,
        absolute: true
    });
}

function onLinkPointerMove({ paper }, linkView, evt, x, y) {
    
    removeEffect(paper, EffectType.MarkUnavailable);
    
    let hoveredView = paper.findElementViewsAtPoint({ x, y }).sort((a, b) => (b.model.get('z') ?? 0) - (a.model.get('z') ?? 0))[0];
    
    if (!hoveredView) {
        return;
    }
    
    const movingArrowhead = linkView.eventData(evt).arrowhead;
    const isHoveredElementSource = movingArrowhead === 'source';
    
    let hoveredElement = hoveredView.model;
    const secondaryElement = (isHoveredElementSource ? linkView.model.getTargetCell() : linkView.model.getSourceCell());
    
    // If hovering a swimlane, validate its parent pool
    if (shapes.bpmn2.Swimlane.isSwimlane(hoveredElement)) {
        hoveredElement = hoveredElement.getParentCell();
        hoveredView = hoveredElement.findView(paper);
    }
    
    const source = !isHoveredElementSource ? secondaryElement : hoveredElement;
    const target = isHoveredElementSource ? secondaryElement : hoveredElement;
    
    // If the connection is valid, do nothing
    if (source.validateConnection(target))
        return;
    
    // Else add the invalid effect
    addEffect(hoveredView, EffectType.MarkUnavailable, { applyAll: true });
    
    if (shapes.bpmn2.CompositePool.isPool(hoveredElement)) {
        hoveredElement.getSwimlanes().forEach(swimlane => {
            addEffect(swimlane.findView(paper), EffectType.MarkUnavailable);
        });
    }
}

function onLinkPointerUp({ paper }) {
    removeEffect(paper, EffectType.MarkUnavailable);
}
