// Draw-to-create + canvas keyboard interactions, extracted from CanvasArea so the
// board component stays small and under the file-size cap. Owns:
//   - the draw-to-create gesture: a pointerdown on the capture overlay starts a
//     react-plus `useRegion` rectangle — the library draws the rubber band and
//     resolves the swept rect (a plain click resolves null and places at the
//     pressed point instead),
//   - `placeAtViewportCenter`, the keyboard placement path (so arming a tool and
//     dropping a cell is fully operable without a pointer — WCAG 2.1.1),
//   - the canvas shortcuts, bound through the Diagram's keyboard via
//     `useOnKeyboardEvents` (Escape cancels an armed draw; arrows nudge the
//     selection; Cmd/Ctrl+Z undo/redo; Delete removes the selection). The
//     Diagram keyboard already ignores typing in inputs/selects/textareas/
//     contenteditable, so no per-handler field guard is needed.
// Every placement / removal / undo is announced for screen readers.

import { useCallback, useEffect, useRef } from 'react';
import {
    useGraph,
    useGraphHistory,
    useOnKeyboardEvents,
    usePaper,
    useRegion,
    useSelection,
    useSelectionCollection,
} from '@joint/react-plus';
import { useAnnounce } from '@/components/ui/announcer-context';
import { nativeKeyboardEvent } from '@/utils/native-keyboard-event';
import { useAddTool, type AddTool } from '@/context/add-tool-context';
import { isGroupCell, type Cell } from '@/model/cell-data';
import {
    createGroupCell,
    createNoteCell,
    createTableCell,
    type Bounds,
} from '@/model/factories';

interface Point {
  readonly x: number;
  readonly y: number;
}

// Each armed tool maps to the factory that mints its cell at the drawn bounds.
// The factories own default sizing (fixed table width, clamped group min,
// content-sized note), so a tiny drag — or a zero-size click / keyboard
// placement — works with no special case.
const FACTORY = {
    table: createTableCell,
    group: createGroupCell,
    note: createNoteCell,
} satisfies Record<AddTool, (bounds: Bounds) => Cell>;

const TOOL_LABEL: Record<AddTool, string> = {
    table: 'Table',
    group: 'Group',
    note: 'Note',
};

// Per-key [dx, dy] unit step for arrow-key nudging of the selection (scaled by the step size).
const ARROW_NUDGE: Record<string, readonly [number, number]> = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
};

// A lightweight, non-reactive read of one graph element — id + embedding parent —
// projected off the raw dia element. Enough for the delete-focus consumer below
// without subscribing to a Cell[] (which would re-render the board every drag
// frame — see currentElements).
interface ElementSnapshot {
  readonly id: string;
  readonly parentId: string | undefined;
}

// Move DOM focus onto a cell's card once it renders (retry a few frames), so a
// keyboard user isn't dropped to <body> after placing or deleting a cell (WCAG
// 2.4.3 Focus Order). Targets the first focusable element inside the cell view.
function focusCellSoon(cellId: string, attempt = 0): void {
    const card = document.querySelector(`[model-id="${cellId}"]`);
    const focusable = card?.querySelector('[tabindex], button, textarea, input, [role="group"], [role="button"]');
    if (focusable instanceof HTMLElement) {
        focusable.focus();
        return;
    }
    if (attempt < 12) requestAnimationFrame(() => focusCellSoon(cellId, attempt + 1));
}

// After deleting cells, pick a sensible survivor to focus next (selection drives
// focus) so a keyboard user isn't dumped back to <body> (WCAG 2.4.3): the parent
// group of a removed cell if it survives, else the last remaining element (the
// snapshot list is elements only — links carry no focusable card).
function nextFocusAfterRemoval(
    elements: readonly ElementSnapshot[],
    removedIds: ReadonlySet<string>,
): string | undefined {
    for (const element of elements) {
        if (!removedIds.has(element.id)) continue;
        if (element.parentId !== undefined && !removedIds.has(element.parentId)) return element.parentId;
    }
    for (let i = elements.length - 1; i >= 0; i -= 1) {
        if (!removedIds.has(elements[i].id)) return elements[i].id;
    }
    return undefined;
}

export interface CanvasTools {
  readonly armed: AddTool | null;
  readonly onDrawPointerDown: (event: React.PointerEvent) => void;
  // Keyboard placement: drop the armed tool at the current viewport centre.
  readonly placeAtViewportCenter: () => void;
}

export function useCanvasTools(): CanvasTools {
    const { armed, disarm } = useAddTool();
    const { graph, setCell, removeCells } = useGraph();
    const { collection, selectCells } = useSelectionCollection();
    const { selection } = useSelection();
    const { undo, redo } = useGraphHistory();
    const { paper } = usePaper();
    const { startRectangleRegion } = useRegion();
    const announce = useAnnounce();

    // Snapshot the live elements straight off the dia graph, on demand. This data is
    // only needed at EVENT time (delete focus-survivor), never in render, so a
    // reactive `useCells()` subscription here would re-render the whole board
    // ~60×/sec during any drag for nothing — and it's exactly that avoided
    // subscription that lets CanvasArea be memoized. The raw-graph read (via the
    // public `GraphApi.graph` handle) runs only on deletion, so per-frame cost is
    // zero. ponytail: raw graph is deliberate + confined to this reader.
    const currentElements = useCallback((): readonly ElementSnapshot[] => {
        return graph.getElements().map((element) => {
            const parent = element.getParentCell();
            return {
                id: String(element.id),
                parentId: parent ? String(parent.id) : undefined,
            };
        });
    }, [graph]);

    // The smallest group covering `point` (so a cell drawn or placed inside a group
    // becomes its member). The point query goes through `graph.findElementsAtPoint`
    // — a quad-tree lookup under <Diagram spatialIndex>.
    const containingGroupId = useCallback(
        (point: Point): string | undefined => {
            let best: string | undefined;
            let bestArea = Infinity;
            for (const container of graph.findElementsAtPoint(point)) {
                if (!isGroupCell(container.get('data'))) continue;
                const box = container.getBBox();
                const area = box.width * box.height;
                if (area < bestArea) {
                    best = String(container.id);
                    bestArea = area;
                }
            }
            return best;
        },
        [graph],
    );

    // Screen (client) point -> paper-local coords via the paper's current matrix
    // (accounts for scroll + zoom).
    const toLocal = useCallback(
        (clientX: number, clientY: number): Point | null => {
            if (!paper) return null;
            const local = paper.clientToLocalPoint(clientX, clientY);
            return { x: local.x, y: local.y };
        },
        [paper],
    );

    // Shared placement: mint the armed tool's cell at `bounds`, embed it in a
    // containing group (tables/notes only — groups don't nest), select + announce,
    // then disarm.
    const placeCell = useCallback(
        (tool: AddTool, bounds: Bounds) => {
            const cell = FACTORY[tool](bounds);
            const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
            const parentId = tool === 'group' ? undefined : containingGroupId(center);
            setCell(parentId ? { ...cell, parent: parentId } : cell);
            // The factory always assigns an id; the guard satisfies Cell['id']?.
            if (cell.id !== undefined) {
                selectCells([cell.id]);
                focusCellSoon(String(cell.id)); // keep keyboard focus on the new cell
            }
            announce(`${TOOL_LABEL[tool]} added${parentId ? ' to group' : ''}.`);
            disarm();
        },
        [announce, containingGroupId, disarm, selectCells, setCell],
    );

    // Monotonic token for the in-flight draw gesture. Cancelling (Escape, unmount)
    // bumps it, so a region promise that settles afterwards places nothing — the
    // token check is race-free where reading `armed` back would not be (the
    // rejection microtask runs before React commits the disarm).
    const gestureRef = useRef(0);

    // Draw-to-create, powered by the library region: the capture layer's
    // pointerdown starts a `useRegion` rectangle, the region draws the rubber band
    // and resolves the swept rect on release. The region has no pointerdown of its
    // own (it accumulates document pointermoves), so starting it inside the press
    // gives the classic press-drag-release gesture. A plain click sweeps no points
    // and resolves `null` — then the cell is placed with zero-size bounds at the
    // pressed point (the factories apply their default size there).
    const onDrawPointerDown = useCallback(
        (event: React.PointerEvent) => {
            if (!armed || event.button !== 0) return;
            const pressed = toLocal(event.clientX, event.clientY);
            if (!pressed) return;
            const tool = armed;
            const token = (gestureRef.current += 1);
            void startRectangleRegion().then((rect) => {
                if (gestureRef.current !== token) return; // cancelled while in flight
                const bounds: Bounds = rect
                    ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                    : { x: pressed.x, y: pressed.y, width: 0, height: 0 };
                placeCell(tool, bounds);
            });
        },
        [armed, placeCell, startRectangleRegion, toLocal],
    );

    // Keyboard placement: drop the armed tool at the centre of the visible paper.
    // Zero-size bounds -> the factory applies its default size at that point.
    const placeAtViewportCenter = useCallback(() => {
        if (!armed || !paper) return;
        const rect = paper.el.getBoundingClientRect();
        const point = toLocal(rect.left + rect.width / 2, rect.top + rect.height / 2);
        if (!point) return;
        placeCell(armed, { x: point.x, y: point.y, width: 0, height: 0 });
    }, [armed, paper, placeCell, toLocal]);

    // Canvas shortcuts on the Diagram's keyboard (ui.Keyboard). Inline handlers are
    // supported — each shortcut always calls the latest callback — and the keyboard
    // itself skips events while the user types in a form field.
    useOnKeyboardEvents({
    // Escape cancels an armed draw. A region drag may be in flight: it has no
    // Escape handling of its own, so a synthetic `pointercancel` (its documented
    // cancel path) reaps it — the pending promise resolves null and, with the
    // tool already disarmed, places nothing.
        escape: () => {
            if (!armed) return;
            gestureRef.current += 1; // invalidate any in-flight draw BEFORE the region settles
            disarm();
            document.dispatchEvent(new PointerEvent('pointercancel'));
            announce('Cancelled.');
        },
        // Arrow keys NUDGE the selected element(s) — a keyboard equivalent of drag-to-move
        // (WCAG 2.1.1). Shift = a coarser 10px step. Only fires with a live selection, so it
        // never steals the paper's arrow-key panning when nothing is selected.
        // `translateSelectedElements` is the Selection feature's own move — the exact path
        // a pointer drag takes, so embedded tables follow their group and connected link
        // vertices come along, in one batch.
        'up down left right shift+up shift+down shift+left shift+right': (event) => {
            const native = nativeKeyboardEvent(event);
            if (!native) return;
            const nudge = ARROW_NUDGE[native.key];
            if (!nudge || collection.length === 0) return;
            event.preventDefault();
            const step = native.shiftKey ? 10 : 1;
            const [dx, dy] = nudge;
            selection?.translateSelectedElements(dx * step, dy * step);
            announce(`Moved ${collection.length} ${collection.length === 1 ? 'item' : 'items'}.`);
        },
        // One handler for both directions: branch on Shift instead of trusting the
        // modifier grammar to keep plain-Z and Shift+Z apart.
        'ctrl+z command+z ctrl+shift+z command+shift+z': (event) => {
            event.preventDefault();
            const native = nativeKeyboardEvent(event);
            if (native !== null && native.shiftKey) {
                redo();
                announce('Redo.');
            } else {
                undo();
                announce('Undo.');
            }
        },
        'delete backspace': (event) => {
            if (collection.length === 0) return;
            // Groups go through this same plain delete (taking their content with
            // them); the keep-the-tables variant lives in the group header's ⋮ menu.
            event.preventDefault();
            const count = collection.length;
            const removedIds = new Set(collection.models.map((cell) => String(cell.id)));
            const focusId = nextFocusAfterRemoval(currentElements(), removedIds);
            // The reworked removeCells wants a plain CellRef[], not the mvc.Collection — pass
            // its backing models array (removeCells snapshots before mutating, so live is safe).
            removeCells(collection.models);
            // CLEAR the selection synchronously: the Diagram's BUILT-IN Delete/Backspace
            // interaction (`deleteSelected`) fires on this same keypress right after this
            // handler, and it removes whatever is selected at that moment. Selecting the
            // survivor here made it delete the survivor too — a selected table's parent
            // GROUP (with everything in it) vanished on one Backspace.
            selectCells([]);
            // Hand focus (and selection) to a sensible survivor AFTER the keypress has
            // fully settled, so a keyboard user keeps their place instead of dropping
            // to <body>.
            if (focusId) {
                queueMicrotask(() => {
                    selectCells([focusId]);
                    focusCellSoon(focusId);
                });
            }
            announce(`${count} ${count === 1 ? 'item' : 'items'} deleted.`);
        },
    });

    // Reap a possibly in-flight region if the hook unmounts mid-drag.
    useEffect(() => {
        const gestures = gestureRef;
        return () => {
            gestures.current += 1;
            document.dispatchEvent(new PointerEvent('pointercancel'));
        };
    }, []);

    return { armed, onDrawPointerDown, placeAtViewportCenter };
}
