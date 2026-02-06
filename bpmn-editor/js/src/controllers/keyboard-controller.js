import Controller from '../controller';
import { shapes } from '@joint/plus';
import { ZOOM_SETTINGS } from '../configs/navigator-config';

export default class KeyboardController extends Controller {
    
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

function onDelete(context, evt) {
    evt.preventDefault();
    const { graph, selection } = context;
    const selectedCells = selection.collection.toArray();
    
    // Separate swimlanes from other cells
    const swimlanes = selectedCells.filter(cell => shapes.bpmn2.Swimlane.isSwimlane(cell));
    const regularCells = selectedCells.filter(cell => !shapes.bpmn2.Swimlane.isSwimlane(cell));
    
    // Handle swimlane deletion with special rules
    handleSwimlanesDeletion(graph, swimlanes);
    
    graph.removeCells(regularCells);
}

function onUndo(context, evt) {
    evt.preventDefault();
    const { commandManager, selection } = context;
    commandManager.undo();
    selection.collection.reset([]);
}

function onRedo(context, evt) {
    evt.preventDefault();
    const { commandManager, selection } = context;
    commandManager.redo();
    selection.collection.reset([]);
}

function onSelectAll(context, evt) {
    evt.preventDefault();
    const { graph, selection } = context;
    selection.collection.reset(graph.getElements());
}

function onZoomIn(context, evt) {
    evt.preventDefault();
    const { paperScroller } = context;
    paperScroller.zoom(0.2, { max: ZOOM_SETTINGS.max, grid: 0.2 });
}

function onZoomOut(context, evt) {
    evt.preventDefault();
    const { paperScroller } = context;
    paperScroller.zoom(-0.2, { min: ZOOM_SETTINGS.min, grid: 0.2 });
}

function onEscape(context) {
    const { selection, paper } = context;
    selection.collection.reset([]);
    paper.removeTools();
}

function onShiftKeyDown(context) {
    const { paperScroller } = context;
    paperScroller.setCursor('crosshair');
}

function onShiftKeyUp(context) {
    const { paperScroller } = context;
    paperScroller.setCursor('grab');
}

// Helpers

function handleSwimlanesDeletion(graph, swimlanes) {
    // Group swimlanes by their parent pool
    const swimlanesByPool = new Map();
    
    // Find deletable swimlanes (those that won't leave their pool empty)
    swimlanes.forEach(swimlane => {
        const parentPool = swimlane.getParentCell();
        
        const poolId = parentPool.id;
        const canDelete = parentPool.getSwimlanes().length > 1;
        
        if (canDelete) {
            if (!swimlanesByPool.has(poolId)) {
                swimlanesByPool.set(poolId, []);
            }
            swimlanesByPool.get(poolId).push(swimlane);
        }
    });
    
    swimlanesByPool.forEach((poolSwimlanes, poolId) => {
        const pool = graph.getCell(poolId);
        poolSwimlanes.forEach(swimlane => {
            pool.removeSwimlane(swimlane);
        });
    });
}
