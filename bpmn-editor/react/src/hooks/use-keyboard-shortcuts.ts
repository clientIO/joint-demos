import { util, type shapes } from '@joint/plus';
import { usePaper, usePaperScroller, useGraphHistory, useSelectionCollection, useOnKeyboardEvents, useClipboard, type ClipboardApi } from '@joint/react-plus';
import { printDiagram } from '../actions/export-actions';
import { openLabelEditor } from '../actions/label-editor';
import { insertSwimlaneIntoPool } from '../dnd/swimlanes';
import { ZOOM_SETTINGS } from '../configs/paper-config';

import type { dia, ui } from '@joint/plus';
import { adjustPoolToContainElement, isActivity, isEvent, isPool, isSwimlane, snapToParentBoundary } from '../utils';

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
        'up': (evt: dia.Event) => onMoveSelection(ctx(), evt, 0, -1),
        'down': (evt: dia.Event) => onMoveSelection(ctx(), evt, 0, 1),
        'left': (evt: dia.Event) => onMoveSelection(ctx(), evt, -1, 0),
        'right': (evt: dia.Event) => onMoveSelection(ctx(), evt, 1, 0),
        // Rename the selected cell without the pointer: `F2` is the platform
        // convention, `enter` matches the other diagram editors.
        'enter F2': (evt: dia.Event) => onEditLabel(ctx(), evt),
        // `enter` edits what is selected, `cmd+enter` adds a lane next to it.
        'command+enter ctrl+enter': (evt: dia.Event) => onAddSwimlane(ctx(), evt),
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

/**
 * The part of the selection the clipboard handles. Pools and lanes are left
 * out: a lane is not free-standing, and duplicating one means
 * `pool.addSwimlane()` (which places it in the stack and lays the pool out
 * again) rather than cloning a cell — a pasted clone lands embedded but
 * unpositioned, on top of the lane it was copied from. `cmd+enter` adds
 * lanes; removing them has its own rules in `onDelete`.
 */
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
 * Swimlanes cannot be moved — a single selected lane is resized instead;
 * boundary events stay snapped to their activity's border; pools grow to
 * keep containing the moved elements.
 */
function onMoveSelection(context: KeyboardContext, evt: dia.Event, dx: number, dy: number) {
    if (!isCanvasFocused(context, evt)) return;

    const { graph, paper, selection } = context;

    const selectedCells = selection.collection.toArray();

    if (selectedCells.length === 1 && isSwimlane(selectedCells[0])) {
        if (resizeSwimlane(context, selectedCells[0], dx, dy)) {
            evt.preventDefault();
        }
        return;
    }

    const elements = selectedCells
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
 * Resizes the swimlane by one grid step, the keyboard equivalent of
 * dragging its bottom (or right) border. A lane always spans its pool
 * across the other axis, so only the arrows running across the lane
 * change its size: down/up for a horizontal lane, right/left for a
 * vertical one. The pool lays the remaining lanes out again and grows
 * with them. Returns whether the arrow acted on the lane.
 */
function resizeSwimlane(context: KeyboardContext, lane: shapes.bpmn2.Swimlane, dx: number, dy: number): boolean {

    const pool = lane.getParentCell();
    if (!pool || !isPool(pool)) return false;

    // A lane is always laid out along its pool, and the free transform keys
    // its constraints off the pool too.
    const isHorizontal = pool.isHorizontal();

    // The arrows along the lane leave it alone.
    const direction = isHorizontal ? dy : dx;
    if (direction === 0) return false;

    const { width, height } = lane.size();
    const size = isHorizontal ? height : width;
    const nextSize = Math.max(
        getMinimumSwimlaneSize(pool, lane, isHorizontal),
        size + direction * gridStep(context.paper)
    );

    // The arrow still belongs to the lane once it is down to its minimum —
    // consume it either way, so hitting the limit does not start scrolling
    // the canvas instead.
    if (nextSize !== size) {
        const batchName = 'keyboard-resize';
        context.graph.startBatch(batchName);
        pool.changeSwimlaneSize(lane, isHorizontal ? 'bottom' : 'right', nextSize);
        context.graph.stopBatch(batchName);
    }

    return true;
}

/**
 * How far the lane can shrink from the border the arrows move — its bottom
 * in a horizontal pool, its right in a vertical one.
 *
 * The library has no public method for this: it lives in
 * `ui.BPMNFreeTransform`'s internal `swimlaneMinSize()`, which is not part
 * of the widget's typed API and cannot be reached without a widget. This
 * mirrors that method for these two borders, from the public pool and lane
 * methods it is built on, so the keyboard stops exactly where dragging the
 * same border stops.
 */
function getMinimumSwimlaneSize(pool: shapes.bpmn2.CompositePool, lane: shapes.bpmn2.Swimlane, isHorizontal: boolean) {

    const padding = pool.getSwimlanePadding();
    const elementsBBox = lane.getElementsBBox();

    // An empty lane bottoms out at the pool's minimum lane size.
    if (!elementsBBox) {
        const start = (isHorizontal ? padding.top : padding.left) ?? 0;
        return start + pool.getMinimumLaneSize();
    }

    // Otherwise the lane keeps its top-left corner, so the content (with
    // its margin) has to fit between that corner and the moving border.
    const content = elementsBBox.inflate(lane.getContentMargin());
    const { x, y } = lane.getBBox();

    return isHorizontal ? content.y + content.height - y : content.x + content.width - x;
}

/**
 * Adds a swimlane next to the selection: a selected pool gets one
 * appended, a selected lane gets a sibling right after it — the position
 * a stencil drop cannot express. The new lane is selected, so it can be
 * named straight away (`cmd+enter`, `enter`, type, `enter`).
 *
 * Anything else keeps the key: a lane only exists inside a pool, so there
 * is nothing sensible to add next to a task or a link.
 */
function onAddSwimlane(context: KeyboardContext, evt: dia.Event) {
    if (!isCanvasFocused(context, evt)) return;

    const { graph, selection } = context;

    const cells = selection.collection.toArray();
    if (cells.length !== 1) return;

    const [cell] = cells;

    let pool: shapes.bpmn2.CompositePool | null = null;
    // Left undefined for a pool — the lane is appended.
    let index: number | undefined;

    if (isPool(cell)) {
        pool = cell;
    } else if (isSwimlane(cell)) {
        const parent = cell.getParentCell();
        if (parent && isPool(parent)) {
            pool = parent;
            index = parent.getSwimlanes().indexOf(cell) + 1;
        }
    }

    if (!pool) return;

    evt.preventDefault();

    const batchName = 'keyboard-add-swimlane';
    graph.startBatch(batchName);
    const swimlane = insertSwimlaneIntoPool(pool, index);
    graph.stopBatch(batchName);

    selection.collection.reset([swimlane]);
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
