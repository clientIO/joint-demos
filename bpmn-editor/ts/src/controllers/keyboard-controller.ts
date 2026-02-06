import Controller from '../controller';
import type { dia, ui } from '@joint/plus';
import { shapes } from '@joint/plus';
import { ZOOM_SETTINGS } from '../configs/navigator-config';

type KeyboardControllerArgs = {
    graph: dia.Graph;
    paper: dia.Paper;
    paperScroller: ui.PaperScroller;
    keyboard: ui.Keyboard;
    selection: ui.Selection;
    commandManager: dia.CommandManager;
    clipboard: ui.Clipboard;
};

export default class KeyboardController extends Controller<KeyboardControllerArgs> {

    startListening() {
        const { keyboard } = this.context;

        this.listenTo(keyboard, {
            'delete backspace': onDelete,
            'ctrl+z command+z': onUndo,
            'ctrl+y command+y': onRedo,
            'ctrl+a command+a': onSelectAll,
            'ctrl+plus command+plus': onZoomIn,
            'ctrl+minus command+minus': onZoomOut,
            'escape': onEscape,
            'keydown:shift': onShiftKeyDown,
            'keyup:shift': onShiftKeyUp
        });
    }
}

// Keyboard event handlers

function onDelete(context: KeyboardControllerArgs, evt: dia.Event) {
    evt.preventDefault();
    const { graph, selection } = context;
    const selectedCells = selection.collection.toArray();

    // Separate swimlanes from other cells
    const swimlanes = selectedCells.filter(cell => shapes.bpmn2.Swimlane.isSwimlane(cell)) as shapes.bpmn2.Swimlane[];
    const regularCells = selectedCells.filter(cell => !shapes.bpmn2.Swimlane.isSwimlane(cell));

    // Handle swimlane deletion with special rules
    handleSwimlanesDeletion(graph, swimlanes);

    graph.removeCells(regularCells);
}

function onUndo(context: KeyboardControllerArgs, evt: dia.Event) {
    evt.preventDefault();
    const { commandManager, selection } = context;
    commandManager.undo();
    selection.collection.reset([]);
}

function onRedo(context: KeyboardControllerArgs, evt: dia.Event) {
    evt.preventDefault();
    const { commandManager, selection } = context;
    commandManager.redo();
    selection.collection.reset([]);
}

function onSelectAll(context: KeyboardControllerArgs, evt: dia.Event) {
    evt.preventDefault();
    const { graph, selection } = context;
    selection.collection.reset(graph.getElements());
}

function onZoomIn(context: KeyboardControllerArgs, evt: dia.Event) {
    evt.preventDefault();
    const { paperScroller } = context;
    paperScroller.zoom(0.2, { max: ZOOM_SETTINGS.max, grid: 0.2 });
}

function onZoomOut(context: KeyboardControllerArgs, evt: dia.Event) {
    evt.preventDefault();
    const { paperScroller } = context;
    paperScroller.zoom(-0.2, { min: ZOOM_SETTINGS.min, grid: 0.2 });
}

function onEscape(context: KeyboardControllerArgs) {
    const { selection, paper } = context;
    selection.collection.reset([]);
    paper.removeTools();
}

function onShiftKeyDown(context: KeyboardControllerArgs) {
    const { paperScroller } = context;
    paperScroller.setCursor('crosshair');
}

function onShiftKeyUp(context: KeyboardControllerArgs) {
    const { paperScroller } = context;
    paperScroller.setCursor('grab');
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
