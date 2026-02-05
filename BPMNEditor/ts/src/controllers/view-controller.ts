import Controller from '../controller';
import type { ui } from '@joint/plus';
import { dia, shapes } from '@joint/plus';
import type InspectorService from '../services/inspector-service';
import type { AppElement, AppLink } from '../shapes/shapes-typing';
import { ShapeTypes } from '../shapes/shapes-typing';
import { addEffect, removeEffect, EffectType } from '../effects';
import type { BPMNLinkView } from '../shapes/placeholder/placeholder-shapes';
import { isForkEvent, getPoolParent, resolveDefaultLinkType, getSwimlaneParent } from '../utils';
import { PlaceholderShapeTypes } from '../shapes/placeholder/placeholder-config';
import { ZOOM_SETTINGS } from '../configs/navigator-config';

type ViewControllerArgs = {
    paper: dia.Paper;
    paperScroller: ui.PaperScroller;
    keyboard: ui.Keyboard;
    selection: ui.Selection;
    inspectorService: InspectorService;
};

export default class ViewController extends Controller<ViewControllerArgs> {

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

function onPaperBlankPointerDown(context: ViewControllerArgs, evt: dia.Event) {
    const { paper, paperScroller, keyboard, selection } = context;

    if (keyboard.isActive('shift', evt)) {
        selection.startSelecting(evt);
    } else {
        selection.collection.reset([]);
        paperScroller.startPanning(evt);
        paper.removeTools();
    }
}

function onElementPointerDown(context: ViewControllerArgs, elementView: dia.ElementView, evt: dia.Event) {
    const { keyboard, selection } = context;

    // Only allow shift selection
    if (!keyboard.isActive('shift', evt)) return;
    if (!shapes.bpmn2.Swimlane.isSwimlane(elementView.model)) return;

    selection.startSelecting(evt);
    evt.data.selectionOriginSwimlaneId = elementView.model.id;
}

function onElementPointerUp(context: ViewControllerArgs, cellView: dia.CellView, evt: dia.Event) {
    const eventData = evt.data;

    if (!eventData.selectionOriginSwimlaneId) return;

    const { selection } = context;

    // Select only elements inside the pool which was used as the start of the shift selection, excluding everything else
    selection.collection.reset(selection.collection.filter((cell) => {
        // Never select pools or swimlanes if the shift selection started on a pool or swimlane
        if (shapes.bpmn2.CompositePool.isPool(cell) ||
            shapes.bpmn2.Swimlane.isSwimlane(cell)) return false;

        const parent = getSwimlaneParent(cell);
        // Cell is not part of any pool
        if (!parent) return false;
        return parent.id === eventData.selectionOriginSwimlaneId;
    }));
}

function onCellPointerUp(context: ViewControllerArgs, cellView: dia.CellView, evt: dia.Event) {
    if (isForkEvent(evt) && cellView.model.graph) {
        // If this is the end of fork and the cell wasn't removed - select it
        context.selection.collection.reset([cellView.model]);
    }
}

function onCellPointerClick(context: ViewControllerArgs, cellView: dia.CellView, evt: dia.Event) {
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

function onPaperBlankPointerClick(context: ViewControllerArgs) {
    const { inspectorService } = context;

    inspectorService.close();
}

function onCellHighlight(_context: ViewControllerArgs, cellView: dia.CellView, node: SVGElement, options: dia.CellView.EventHighlightOptions) {
    if (options.type !== dia.CellView.Highlighting.EMBEDDING) return;

    const { model } = cellView;

    if (shapes.bpmn2.Swimlane.isSwimlane(model)) {
        addEffect(cellView, EffectType.TargetSwimlaneEmbed);
        return;
    }

    if (model.get('shapeType') === ShapeTypes.ACTIVITY) {
        addEffect(cellView, EffectType.ActivityBoundaryEmbed);
    }
}

function onCellUnhighlight(context: ViewControllerArgs, cellView: dia.CellView, node: SVGElement, options: dia.CellView.EventHighlightOptions) {
    if (options.type !== dia.CellView.Highlighting.EMBEDDING) return;

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

function onLinkSnapConnect(_context: ViewControllerArgs, linkView: dia.LinkView, _evt: dia.Event) {
    const linkType = resolveDefaultLinkType(linkView.model as AppLink);
    (linkView as BPMNLinkView).changeStyle(linkType);
}

function onLinkSnapDisconnect(_context: ViewControllerArgs, linkView: dia.LinkView, _evt: dia.Event) {
    (linkView as BPMNLinkView).changeStyle(PlaceholderShapeTypes.LINK);
}

function onPaperPinch(context: ViewControllerArgs, _evt: dia.Event, ox: number, oy: number, scale: number) {
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

function onLinkPointerMove({ paper }: ViewControllerArgs, linkView: dia.LinkView, evt: dia.Event, x: number, y: number) {

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
    if (shapes.bpmn2.Swimlane.isSwimlane(hoveredElement)) {
        hoveredElement = hoveredElement.getParentCell() as AppElement;
        hoveredView = hoveredElement.findView(paper) as dia.ElementView;
    }

    const source = !isHoveredElementSource ? secondaryElement : hoveredElement;
    const target = isHoveredElementSource ? secondaryElement : hoveredElement;

    // If the connection is valid, do nothing
    if (source.validateConnection(target)) return;

    // Else add the invalid effect
    addEffect(hoveredView, EffectType.MarkUnavailable, { applyAll: true });

    if (shapes.bpmn2.CompositePool.isPool(hoveredElement)) {
        (hoveredElement as unknown as shapes.bpmn2.CompositePool).getSwimlanes().forEach(swimlane => {
            addEffect(swimlane.findView(paper) as dia.ElementView, EffectType.MarkUnavailable);
        });
    }
}

function onLinkPointerUp({ paper }: ViewControllerArgs) {
    removeEffect(paper, EffectType.MarkUnavailable);
}
