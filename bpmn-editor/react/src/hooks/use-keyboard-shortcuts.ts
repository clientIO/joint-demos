import { util, type shapes } from '@joint/plus';
import { usePaper, usePaperScroller, useGraphHistory, useSelectionCollection, useOnKeyboardEvents, useClipboard, type ClipboardApi } from '@joint/react-plus';
import { printDiagram } from '../actions/export-actions';
import { openLabelEditor } from '../actions/label-editor';
import { ZOOM_SETTINGS } from '../configs/paper-config';

import type { dia, ui } from '@joint/plus';
import { adjustPoolToContainElement, isActivity, isEvent, isPool, isSwimlane, snapToParentBoundary } from '../utils';
import type { AppElement } from '../shapes/shapes-typing';
import type { AppPool, AppSwimlane } from '../shapes/pool/pool-shapes';

type KeyboardContext = {
    graph: dia.Graph;
    paper: dia.Paper;
    paperScroller: ui.PaperScroller;
    selection: Pick<ui.Selection, 'collection'>;
    commandManager: dia.CommandManager;
    clipboard: ClipboardApi;
};

// Where a copied cell was embedded, remembered on the copy so the paste can
// put the clone back into the same parent. `util.cloneCells()` only keeps
// the embedding of parents that were copied too, so a task copied out of a
// swimlane would otherwise paste loose onto the canvas.
const COPIED_FROM_PARENT = 'copiedFromParent';
// The cell the copy was taken from, so a pasted lane can go in below it.
const COPIED_FROM = 'copiedFrom';

// How far a pasted copy lands from its original, in grid steps.
const PASTE_OFFSET_STEPS = 3;

// Keyboard shortcuts, bound to the keyboard owned by `<Diagram>`.
export function useKeyboardShortcuts() {

    const { paper } = usePaper();
    const { paperScroller } = usePaperScroller();
    const { commandManager } = useGraphHistory();
    const selection = useSelectionCollection();
    const clipboard = useClipboard();

    const ctx = (): KeyboardContext => ({
        graph: paper!.model,
        paper: paper!,
        paperScroller: paperScroller!,
        selection,
        commandManager,
        clipboard
    });

    useOnKeyboardEvents({
        'delete backspace': (evt: dia.Event) => onDelete(ctx(), evt),
        'ctrl+z command+z': (evt: dia.Event) => onUndo(ctx(), evt),
        'ctrl+y command+y shift+ctrl+z shift+command+z': (evt: dia.Event) => onRedo(ctx(), evt),
        'ctrl+a command+a': (evt: dia.Event) => onSelectAll(ctx(), evt),
        'ctrl+c command+c': (evt: dia.Event) => onCopy(ctx(), evt),
        'ctrl+x command+x': (evt: dia.Event) => onCut(ctx(), evt),
        'ctrl+v command+v': (evt: dia.Event) => onPaste(ctx(), evt),
        // Print the diagram instead of the browser's page print — that is
        // what printing means in a diagram editor.
        'ctrl+p command+p': (evt: dia.Event) => onPrint(ctx(), evt),
        'ctrl+plus command+plus': (evt: dia.Event) => onZoomIn(ctx(), evt),
        'ctrl+minus command+minus': (evt: dia.Event) => onZoomOut(ctx(), evt),
        'escape': () => onEscape(ctx()),
        'shift+up': (evt: dia.Event) => onResizeSelection(ctx(), evt, 0, -1),
        'shift+down': (evt: dia.Event) => onResizeSelection(ctx(), evt, 0, 1),
        'shift+left': (evt: dia.Event) => onResizeSelection(ctx(), evt, -1, 0),
        'shift+right': (evt: dia.Event) => onResizeSelection(ctx(), evt, 1, 0),
        'up': (evt: dia.Event) => onMoveSelection(ctx(), evt, 0, -1),
        'down': (evt: dia.Event) => onMoveSelection(ctx(), evt, 0, 1),
        'left': (evt: dia.Event) => onMoveSelection(ctx(), evt, -1, 0),
        'right': (evt: dia.Event) => onMoveSelection(ctx(), evt, 1, 0),
        // Rename the selected cell without the pointer: `F2` is the platform
        // convention, `enter` matches the other diagram editors.
        'enter F2': (evt: dia.Event) => onEditLabel(ctx(), evt),
        'keydown:shift': () => paperScroller?.setCursor('crosshair'),
        'keyup:shift': () => paperScroller?.setCursor('grab')
    });
}

// The keyboard is bound on `document`, so the canvas shortcuts would fire
// while another part of the app has the focus — `enter` on a stencil item
// drops a shape, the arrow keys move the toolbar's roving focus and
// `backspace` would delete the selection from anywhere. The keys that act
// on the diagram only apply when the focus is on the canvas (or nowhere).
// Text fields are already filtered out by `ui.Keyboard` itself.
function isCanvasFocused(context: KeyboardContext, evt: dia.Event) {
    const target = evt.target as Node | null;
    if (!target) return false;
    if (target === document.body) return true;
    const canvas = context.paperScroller.el;
    return target === canvas || canvas.contains(target);
}

// How far one arrow key press moves or resizes.
function gridStep(paper: dia.Paper) {
    return paper.options.gridSize || 10;
}

// Keyboard event handlers

function onDelete(context: KeyboardContext, evt: dia.Event) {
    if (!isCanvasFocused(context, evt)) return;
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

/**
 * Copy options that record, on each clone, the parent its original was
 * embedded in — unless that parent is being copied too, in which case the
 * clone keeps the embedding on its own.
 */
function rememberParents(graph: dia.Graph) {
    return {
        // Copy what is embedded too: a lane brings its shapes, a pool brings
        // its lanes and their shapes, an activity brings its boundary events.
        deep: true,
        cloneCells: (cells: dia.Cell[]) => {
            const clones = util.cloneCells(cells);

            Object.entries(clones).forEach(([originalId, clone]) => {
                clone.set(COPIED_FROM, originalId);

                const parent = graph.getCell(originalId)?.getParentCell();
                if (parent && !clones[parent.id]) {
                    clone.set(COPIED_FROM_PARENT, parent.id);
                }
            });

            return Object.values(clones);
        }
    };
}

function onCopy(context: KeyboardContext, evt: dia.Event) {
    if (!isCanvasFocused(context, evt)) return;

    const { graph, selection, clipboard } = context;
    const cells = selection.collection.toArray();
    if (cells.length === 0) return;

    evt.preventDefault();
    clipboard.copyCells(cells, rememberParents(graph));
}

function onCut(context: KeyboardContext, evt: dia.Event) {
    if (!isCanvasFocused(context, evt)) return;

    const { graph, selection, clipboard } = context;
    const selected = selection.collection.toArray();
    if (selected.length === 0) return;

    evt.preventDefault();

    // A lane can be copied but not cut: removing one has rules of its own
    // (a pool must keep a lane — see `onDelete`). Copying is still what the
    // user asked for, so the clipboard is filled either way.
    const cells = selected.filter((cell) => !isSwimlane(cell));

    if (cells.length === 0) {
        clipboard.copyCells(selected, rememberParents(graph));
        return;
    }

    clipboard.cutCells(cells, rememberParents(graph));
    selection.collection.reset([]);
}

/**
 * Pastes the clipboard one grid step off the original and restores the
 * embedding, so a copy of a task in a swimlane lands in that swimlane
 * rather than loose on the canvas. The pool grows to fit the copies.
 */
function onPaste(context: KeyboardContext, evt: dia.Event) {
    if (!isCanvasFocused(context, evt)) return;

    const { graph, paper, selection, clipboard } = context;
    if (clipboard.isClipboardEmpty()) return;

    evt.preventDefault();

    const step = gridStep(paper);
    const batchName = 'paste';

    graph.startBatch(batchName);

    // Offset in whole grid steps, so the copy stays snapped to the grid and
    // still sits clear enough of the original to grab.
    const offset = step * PASTE_OFFSET_STEPS;
    const pasted = clipboard.pasteCells({ translate: { dx: offset, dy: offset }});

    pasted.forEach((cell) => {
        const parentId = cell.get(COPIED_FROM_PARENT);
        const originalId = cell.get(COPIED_FROM);
        cell.unset(COPIED_FROM_PARENT);
        cell.unset(COPIED_FROM);

        // No recorded parent: either the copy was taken from the canvas, or
        // its parent came along with it (a pool brings its own lanes).
        if (!parentId) return;

        // The parent may be gone by now — the copy outlives the cells it
        // was taken from.
        const parent = graph.getCell(parentId);
        if (!parent) return;

        if (isSwimlane(cell) && isPool(parent)) {
            // A lane belongs to the pool's stack, so it is inserted rather
            // than embedded — that lays the pool out again and moves the
            // lane's own shapes with it. It goes in below the lane it was
            // copied from, or last when that one is gone.
            const lanes = parent.getSwimlanes();
            const original = originalId ? graph.getCell(originalId) : null;
            const index = original && isSwimlane(original) ? lanes.indexOf(original) + 1 : lanes.length;

            parent.addSwimlane(cell as shapes.bpmn2.Swimlane, index);
            return;
        }

        parent.embed(cell);

        if (cell.isElement()) adjustPoolToContainElement(cell as dia.Element);
    });

    graph.stopBatch(batchName);

    selection.collection.reset(pasted.filter((cell) => cell.isElement()));
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

function onPrint(context: KeyboardContext, evt: dia.Event) {
    evt.preventDefault();
    printDiagram(context.paper);
}

/**
 * Moves the selected elements by one grid step in the given direction.
 * Swimlanes cannot be moved (`shift` and the arrows resize them instead);
 * boundary events stay snapped to their activity's border; pools grow to
 * keep containing the moved elements.
 */
function onMoveSelection(context: KeyboardContext, evt: dia.Event, dx: number, dy: number) {
    if (!isCanvasFocused(context, evt)) return;

    const { graph, paper, selection } = context;

    const elements = selection.collection.toArray()
        .filter((cell): cell is dia.Element => cell.isElement() && !isSwimlane(cell));

    // `translate()` moves embedded cells too — skip elements whose ancestor
    // is also selected, so they are not translated twice.
    const selectedIds = new Set(elements.map((element) => element.id));
    const movedElements = elements.filter(
        (element) => !element.getAncestors().some((ancestor) => selectedIds.has(ancestor.id))
    );

    if (movedElements.length === 0) return;

    // Consume the key press only when it moves something — otherwise leave
    // it to the paper scroller (arrow keys scroll the canvas).
    evt.preventDefault();

    const step = gridStep(paper);

    graph.startBatch('keyboard-move');

    movedElements.forEach((element) => {
        element.translate(dx * step, dy * step);

        // A boundary event slides along its activity's border instead of
        // moving freely.
        const parent = element.getParentCell();
        if (parent && parent.isElement() && isActivity(parent) && isEvent(element)) {
            const center = element.getBBox().center();
            const { x, y } = snapToParentBoundary(element, parent, center.x, center.y);
            element.position(x, y);
        }

        adjustPoolToContainElement(element);
    });

    graph.stopBatch('keyboard-move');
}

/**
 * Resizes the selected shape by one grid step from its far border: right
 * and down grow it, left and up shrink it. Everything the free transform
 * can resize answers to it — a pool, a lane, a group, an annotation.
 */
function onResizeSelection(context: KeyboardContext, evt: dia.Event, dx: number, dy: number) {
    if (!isCanvasFocused(context, evt)) return;

    const cells = context.selection.collection.toArray();
    if (cells.length !== 1) return;

    const [cell] = cells;
    if (!cell.isElement() || !(cell as AppElement).isResizable) return;

    evt.preventDefault();

    const step = gridStep(context.paper);
    const batchName = 'keyboard-resize';

    context.graph.startBatch(batchName);

    if (isSwimlane(cell)) {
        resizeSwimlane(cell, dx * step, dy * step);
    } else if (isPool(cell)) {
        resizePool(cell, dx * step, dy * step);
    } else {
        resizeShape(cell as AppElement, dx * step, dy * step);
    }

    context.graph.stopBatch(batchName);
}

/**
 * A lane resizes along both axes, but only one of them is its own: across
 * the pool it is the lane's size, and along the pool it is the pool's,
 * since every lane spans it. Both go through `changeSwimlaneSize()`, which
 * lays the pool out again either way.
 */
function resizeSwimlane(lane: AppSwimlane, dx: number, dy: number) {

    const pool = lane.getParentCell();
    if (!pool || !isPool(pool)) return;

    const { width, height } = lane.size();

    if (dy !== 0) {
        const next = Math.max(getMinimumSwimlaneSize(pool, lane, 'bottom'), height + dy);
        if (next !== height) pool.changeSwimlaneSize(lane, 'bottom', next);
    }

    if (dx !== 0) {
        const next = Math.max(getMinimumSwimlaneSize(pool, lane, 'right'), width + dx);
        if (next !== width) pool.changeSwimlaneSize(lane, 'right', next);
    }
}

function resizePool(pool: AppPool, dx: number, dy: number) {

    const { width, height } = pool.size();

    if (dx !== 0) pool.changeSize('right', Math.max(pool.getMinimalWidth(), width + dx));
    if (dy !== 0) pool.changeSize('bottom', Math.max(pool.getMinimalHeight(), height + dy));
}

function resizeShape(element: AppElement, dx: number, dy: number) {

    const { width, height } = element.size();
    const minimum = element.getMinimalSize?.() ?? { width: 0, height: 0 };

    element.resize(
        Math.max(minimum.width, width + dx),
        Math.max(minimum.height, height + dy)
    );

    // A shape can outgrow the lane it sits in, exactly as it can be moved
    // out of it — the pool has to take the new size either way.
    adjustPoolToContainElement(element);
}

/**
 * How far the lane can shrink from the given border.
 *
 * The library has no public method for this: it lives in
 * `ui.BPMNFreeTransform`'s internal `swimlaneMinSize()`, which is not part
 * of the widget's typed API and cannot be reached without a widget. This
 * mirrors it from the public pool and lane methods it is built on, so the
 * keyboard stops exactly where dragging the same border stops.
 *
 * Across the pool the limit is the lane's own content; along the pool it is
 * everything the pool has to keep covering, which is what the pool's
 * minimal range reports.
 */
function getMinimumSwimlaneSize(pool: AppPool, lane: AppSwimlane, border: 'bottom' | 'right') {

    const padding = pool.getSwimlanePadding();
    const bbox = lane.getBBox();
    const acrossThePool = pool.isHorizontal() ? border === 'bottom' : border === 'right';
    const fallback = ((border === 'bottom' ? padding.top : padding.left) ?? 0) + pool.getMinimumLaneSize();

    if (acrossThePool) {
        const elementsBBox = lane.getElementsBBox();
        if (!elementsBBox) return fallback;

        // The lane keeps its top-left corner, so the content (with its
        // margin) has to fit between that corner and the moving border.
        const content = elementsBBox.inflate(lane.getContentMargin());
        return border === 'bottom' ? content.y + content.height - bbox.y : content.x + content.width - bbox.x;
    }

    const range = border === 'bottom' ? pool.getMinimalYRange() : pool.getMinimalXRange();
    if (!range) return fallback;

    return range[1] - (border === 'bottom' ? bbox.y : bbox.x);
}

/**
 * Opens the inline label editor over the single selected cell — the
 * keyboard equivalent of double-clicking it. Cells without a label (the
 * shape decides) are left alone.
 */
function onEditLabel(context: KeyboardContext, evt: dia.Event) {
    if (!isCanvasFocused(context, evt)) return;

    const { paper, selection } = context;

    const cells = selection.collection.toArray();
    if (cells.length !== 1) return;

    const view = paper.findViewByModel(cells[0]);
    if (!view) return;

    // Enter would otherwise be re-dispatched to the editor it just opened.
    evt.preventDefault();

    openLabelEditor(paper, selection, view);
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
