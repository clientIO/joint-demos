import type { shapes } from '@joint/plus';
import { usePaper, usePaperScroller, useGraphHistory, useSelectionCollection, useOnKeyboardEvents } from '@joint/react-plus';
import { ZOOM_SETTINGS } from '../configs/paper-config';

import type { dia, ui } from '@joint/plus';
import { isSwimlane } from '../utils';

type KeyboardContext = {
    graph: dia.Graph;
    paper: dia.Paper;
    paperScroller: ui.PaperScroller;
    selection: Pick<ui.Selection, 'collection'>;
    commandManager: dia.CommandManager;
};

// Keyboard shortcuts, bound to the keyboard owned by `<Diagram>`.
export function useKeyboardShortcuts() {

    const { paper } = usePaper();
    const { paperScroller } = usePaperScroller();
    const { commandManager } = useGraphHistory();
    const selection = useSelectionCollection();

    const ctx = (): KeyboardContext => ({
        graph: paper!.model,
        paper: paper!,
        paperScroller: paperScroller!,
        selection,
        commandManager
    });

    useOnKeyboardEvents({
        'delete backspace': (evt: dia.Event) => onDelete(ctx(), evt),
        'ctrl+z command+z': (evt: dia.Event) => onUndo(ctx(), evt),
        'ctrl+y command+y': (evt: dia.Event) => onRedo(ctx(), evt),
        'ctrl+a command+a': (evt: dia.Event) => onSelectAll(ctx(), evt),
        'ctrl+plus command+plus': (evt: dia.Event) => onZoomIn(ctx(), evt),
        'ctrl+minus command+minus': (evt: dia.Event) => onZoomOut(ctx(), evt),
        'escape': () => onEscape(ctx()),
        'keydown:shift': () => paperScroller?.setCursor('crosshair'),
        'keyup:shift': () => paperScroller?.setCursor('grab')
    });
}

// Keyboard event handlers

function onDelete(context: KeyboardContext, evt: dia.Event) {
    evt.preventDefault();
    const { graph, selection } = context;
    const selectedCells = selection.collection.toArray();

    // Separate swimlanes from other cells
    const swimlanes = selectedCells.filter(cell => isSwimlane(cell)) as shapes.bpmn2.Swimlane[];
    const regularCells = selectedCells.filter(cell => !isSwimlane(cell));

    // Handle swimlane deletion with special rules
    handleSwimlanesDeletion(graph, swimlanes);

    graph.removeCells(regularCells);
}

function onUndo(context: KeyboardContext, evt: dia.Event) {
    evt.preventDefault();
    const { commandManager, selection } = context;
    commandManager.undo();
    selection.collection.reset([]);
}

function onRedo(context: KeyboardContext, evt: dia.Event) {
    evt.preventDefault();
    const { commandManager, selection } = context;
    commandManager.redo();
    selection.collection.reset([]);
}

function onSelectAll(context: KeyboardContext, evt: dia.Event) {
    evt.preventDefault();
    const { graph, selection } = context;
    selection.collection.reset(graph.getElements());
}

function onZoomIn(context: KeyboardContext, evt: dia.Event) {
    evt.preventDefault();
    const { paperScroller } = context;
    paperScroller.zoom(0.2, { max: ZOOM_SETTINGS.max, grid: 0.2 });
}

function onZoomOut(context: KeyboardContext, evt: dia.Event) {
    evt.preventDefault();
    const { paperScroller } = context;
    paperScroller.zoom(-0.2, { min: ZOOM_SETTINGS.min, grid: 0.2 });
}

function onEscape(context: KeyboardContext) {
    const { selection, paper } = context;
    selection.collection.reset([]);
    paper.removeTools();
}

// Helpers

function handleSwimlanesDeletion(graph: dia.Graph, swimlanes: shapes.bpmn2.Swimlane[]) {
    // Group swimlanes by their parent pool
    const swimlanesByPool = new Map<dia.Cell.ID, shapes.bpmn2.Swimlane[]>();

    // Find deletable swimlanes (those that won't leave their pool empty)
    swimlanes.forEach(swimlane => {
        const parentPool = swimlane.getParentCell() as shapes.bpmn2.CompositePool;

        const poolId = parentPool.id;
        const canDelete = parentPool.getSwimlanes().length > 1;

        if (canDelete) {
            if (!swimlanesByPool.has(poolId)) {
                swimlanesByPool.set(poolId, []);
            }
            swimlanesByPool.get(poolId)!.push(swimlane);
        }
    });

    swimlanesByPool.forEach((poolSwimlanes, poolId) => {
        const pool = graph.getCell(poolId) as shapes.bpmn2.CompositePool;
        poolSwimlanes.forEach(swimlane => {
            pool.removeSwimlane(swimlane);
        });
    });
}
