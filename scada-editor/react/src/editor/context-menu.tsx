import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
    useClipboard,
    useGraph,
    useOnGraphEvents,
    useOnPaperEvents,
    useSelectionCollection,
    type CellId,
} from '@joint/react-plus';
import { isEquipmentData, isPipeData, type Graph } from '../plant/model';
import { adjacentLayer, isLayer, LAYER_NAMES, LAYERS, type Layer } from '../plant/layers';
import { CATALOG } from '../shapes/catalog';
import { MODIFIER_KEY } from '../ui/keys';
import { PAPER_ID } from './paper-id';

/*
 * The context menus of the canvas, in the edit mode: of a cell (the clipboard,
 * the order in its layer, the layer, locking, the removal; the selection, or the
 * cell alone when it is not selected) and of the blank canvas (paste where it was
 * opened, the selections, unlocking).
 */

// How far the menu keeps from the edges of the window (px).
const WINDOW_MARGIN = 8;
// More z steps than one layer ever holds, so in the draw order the layer always wins over the z.
const LAYER_STRIDE = 1e6;

interface MenuItem {
    readonly label: string;
    /** A shortcut, or a note on the right (the layer the order is within). */
    readonly hint?: string;
    readonly isDisabled?: boolean;
    /** A rule above the item: the items in groups. */
    readonly isSeparated?: boolean;
    readonly run: () => void;
}

interface OpenMenu {
    readonly clientX: number;
    readonly clientY: number;
    readonly items: readonly MenuItem[];
}

/** A point on the paper. */
type Point = { readonly x: number; readonly y: number };

const dataOf = (graph: Graph, id: CellId): unknown => graph.getCell(id)?.get('data');

const layerOf = (graph: Graph, id: CellId): Layer => {
    const cell = graph.getCell(id);
    const layer = cell ? graph.getCellLayerId(cell) : undefined;
    return isLayer(layer) ? layer : 'cells';
};

const isLocked = (graph: Graph, id: CellId): boolean => {
    const data = dataOf(graph, id);
    return isEquipmentData(data) && data.locked === true;
};

/** The kind of a cell as the palette names it: a pump, a pipe, a wire. */
function kindOf(graph: Graph, id: CellId): string | undefined {
    const data = dataOf(graph, id);
    if (isEquipmentData(data)) {
        return CATALOG[data.kind].name;
    }
    if (isPipeData(data)) {
        return data.medium === 'power' ? 'Wire' : 'Pipe';
    }
    return undefined;
}

/** The order cells are drawn in, bottom first: by layer, then within it. */
function drawOrder(graph: Graph, id: CellId): number {
    return LAYERS.indexOf(layerOf(graph, id)) * LAYER_STRIDE + (graph.getCell(id)?.z() ?? 0);
}

/** The unlocked element drawn right under the cell at the point, if any. */
function elementBelow(graph: Graph, id: CellId, point: Point): CellId | undefined {
    const top = drawOrder(graph, id);
    return graph.findElementsAtPoint(point)
        .map((element) => element.id)
        .filter((other) => other !== id && !isLocked(graph, other) && drawOrder(graph, other) < top)
        .sort((a, b) => drawOrder(graph, b) - drawOrder(graph, a))[0];
}

/** The locked element drawn on top at the point, if any. */
function lockedAt(graph: Graph, point: Point): CellId | undefined {
    return graph.findElementsAtPoint(point)
        .map((element) => element.id)
        .filter((id) => isLocked(graph, id))
        .sort((a, b) => drawOrder(graph, b) - drawOrder(graph, a))[0];
}

function tagOf(graph: Graph, id: CellId): string | undefined {
    const data = dataOf(graph, id);
    return isEquipmentData(data) ? data.tag : undefined;
}

/** Keep the menu in the window: opened up or to the left of the pointer when it doesn't fit. */
function placeInWindow(element: HTMLElement, clientX: number, clientY: number) {
    const { width, height } = element.getBoundingClientRect();
    const left = clientX + width > window.innerWidth - WINDOW_MARGIN ? Math.max(WINDOW_MARGIN, clientX - width) : clientX;
    const top = clientY + height > window.innerHeight - WINDOW_MARGIN ? Math.max(WINDOW_MARGIN, clientY - height) : clientY;
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
}

function useMenuActions() {
    const { graph, removeCells, setCell, setCellData, transaction } = useGraph();
    const { collection, selectCells } = useSelectionCollection();
    const { copyCells, cutCells, pasteCellsAtPoint, isClipboardEmpty } = useClipboard();

    const unlock = (ids: readonly CellId[]) => {
        transaction(() => {
            for (const id of ids) {
                setCellData(id, (previous) => ({ ...previous, locked: false }));
            }
        }, { name: 'unlock' });
        selectCells(ids);
    };

    const cellMenu = (id: CellId, point: Point): MenuItem[] => {
        // The menu acts on the selection, the clicked cell alone when it is not selected.
        const ids = collection.has(id) ? collection.map((cell) => cell.id) : [id];
        if (!collection.has(id)) {
            selectCells([id]);
        }
        const elementIds = ids.filter((selected) => graph.getCell(selected)?.isElement());
        const layers = new Set(ids.map((selected) => layerOf(graph, selected)));
        const [layer] = layers;
        const layerHint = layers.size === 1 ? `in ${LAYER_NAMES[layer]}` : 'in their layers';
        const below = elementBelow(graph, id, point);
        const kind = kindOf(graph, id);
        const sameKind = kind ? graph.getCells().filter((cell) => kindOf(graph, cell.id) === kind && !isLocked(graph, cell.id)) : [];
        const connections = graph.getLinks().filter((link) =>
            elementIds.includes(link.source().id ?? '') || elementIds.includes(link.target().id ?? ''));
        const up = layers.size === 1 ? adjacentLayer(layer, 1) : undefined;
        const down = layers.size === 1 ? adjacentLayer(layer, -1) : undefined;

        const order = (toFront: boolean) => transaction(() => {
            const cells = ids.flatMap((selected) => graph.getCell(selected) ?? []);
            cells.sort((a, b) => (toFront ? a.z() - b.z() : b.z() - a.z()));
            for (const cell of cells) {
                if (toFront) {
                    cell.toFront();
                } else {
                    cell.toBack();
                }
            }
        }, { name: toFront ? 'to-front' : 'to-back' });

        const moveToLayer = (target: Layer) => transaction(() => {
            for (const selected of ids) {
                setCell(selected, (previous) => ({ ...previous, layer: target }));
                graph.getCell(selected)?.toFront();
            }
        }, { name: 'to-layer' });

        // A connection is kept where it was drawn: its end at the element becomes a free point.
        const disconnect = () => transaction(() => {
            for (const link of connections) {
                const sourcePoint = link.getSourcePoint();
                const targetPoint = link.getTargetPoint();
                setCell(link.id, (previous) => ({
                    ...previous,
                    ...(elementIds.includes(link.source().id ?? '') ? { source: { x: sourcePoint.x, y: sourcePoint.y }} : {}),
                    ...(elementIds.includes(link.target().id ?? '') ? { target: { x: targetPoint.x, y: targetPoint.y }} : {}),
                }));
            }
        }, { name: 'disconnect' });

        const lock = () => {
            selectCells([]);
            transaction(() => {
                for (const element of elementIds) {
                    setCellData(element, (previous) => ({ ...previous, locked: true }));
                }
            }, { name: 'lock' });
        };

        const isLink = graph.getCell(id)?.isLink() === true;
        return [
            { label: 'Cut', hint: `${MODIFIER_KEY}X`, run: () => cutCells(ids) },
            { label: 'Copy', hint: `${MODIFIER_KEY}C`, run: () => copyCells(ids) },
            { label: 'Select Below', hint: below ? tagOf(graph, below) : undefined, isDisabled: !below, isSeparated: true, run: () => below && selectCells([below]) },
            { label: 'Select Same Type', hint: kind ? `${kind} · ${sameKind.length}` : undefined, isDisabled: sameKind.length === 0, run: () => selectCells(sameKind.map((cell) => cell.id)) },
            { label: 'Bring to Front', hint: layerHint, isSeparated: true, run: () => order(true) },
            { label: 'Send to Back', hint: layerHint, run: () => order(false) },
            ...(up ? [{ label: `Move to ${LAYER_NAMES[up]}`, hint: 'the layer above', run: () => moveToLayer(up) }] : []),
            ...(down ? [{ label: `Move to ${LAYER_NAMES[down]}`, hint: 'the layer below', run: () => moveToLayer(down) }] : []),
            ...(isLink
                ? []
                : [
                    {
                        label: 'Disconnect',
                        hint: connections.length > 0 ? `${connections.length} ${connections.length === 1 ? 'connection' : 'connections'}` : undefined,
                        isDisabled: connections.length === 0,
                        isSeparated: true,
                        run: disconnect,
                    },
                    { label: 'Lock', isSeparated: true, isDisabled: elementIds.length === 0, run: lock },
                ]),
            { label: 'Delete', hint: 'Del', isSeparated: isLink, run: () => removeCells(ids) },
        ];
    };

    const blankMenu = (point: Point): MenuItem[] => {
        const unlockedCells = graph.getCells().filter((cell) => !isLocked(graph, cell.id));
        const locked = lockedAt(graph, point);
        const lockedIds = graph.getElements().filter((element) => isLocked(graph, element.id)).map((element) => element.id);
        return [
            ...(locked ? [{ label: 'Unlock', hint: tagOf(graph, locked), run: () => unlock([locked]) }] : []),
            { label: 'Paste', hint: `${MODIFIER_KEY}V`, isSeparated: Boolean(locked), isDisabled: isClipboardEmpty(), run: () => pasteCellsAtPoint(point) },
            { label: 'Select All', hint: `${MODIFIER_KEY}A`, isSeparated: true, isDisabled: unlockedCells.length === 0, run: () => selectCells(unlockedCells.map((cell) => cell.id)) },
            {
                label: 'Select Elements',
                isDisabled: !unlockedCells.some((cell) => cell.isElement()),
                run: () => selectCells(unlockedCells.filter((cell) => cell.isElement()).map((cell) => cell.id)),
            },
            {
                label: 'Select Connections',
                isDisabled: !unlockedCells.some((cell) => cell.isLink()),
                run: () => selectCells(unlockedCells.filter((cell) => cell.isLink()).map((cell) => cell.id)),
            },
            ...(lockedIds.length > 0 ? [{ label: 'Unlock All', hint: String(lockedIds.length), isSeparated: true, run: () => unlock(lockedIds) }] : []),
        ];
    };

    return { cellMenu, blankMenu };
}

/** Right-click menus of the diagram while editing. */
export function ContextMenu() {
    const [menu, setMenu] = useState<OpenMenu | null>(null);
    const popover = useRef<HTMLDivElement>(null);
    const { cellMenu, blankMenu } = useMenuActions();

    useOnPaperEvents(PAPER_ID, {
        onCellContextMenu: ({ id, event, x, y }) => {
            event.preventDefault();
            setMenu({ clientX: event.clientX ?? 0, clientY: event.clientY ?? 0, items: cellMenu(id, { x, y }) });
        },
        onBlankContextMenu: ({ event, x, y }) => {
            event.preventDefault();
            setMenu({ clientX: event.clientX ?? 0, clientY: event.clientY ?? 0, items: blankMenu({ x, y }) });
        },
    });

    // The items act on the cells under the pointer when it opened: a removal or
    // a reset (Delete, undo, another example) makes them stale, so it closes.
    useOnGraphEvents({
        remove: () => setMenu(null),
        reset: () => setMenu(null),
    });

    // Shown in the top layer. A manual popover: the browser's light dismiss would
    // close it on the release of the very right-click that opened it.
    useLayoutEffect(() => {
        const element = popover.current;
        if (!menu || !element) {
            return;
        }
        // Focus goes back where it was when the menu closes, not to the page.
        const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        element.showPopover();
        placeInWindow(element, menu.clientX, menu.clientY);
        element.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();

        const closeOutside = (event: Event) => {
            if (!(event.target instanceof Node) || !element.contains(event.target)) {
                setMenu(null);
            }
        };
        const closeOnEscape = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') {
                setMenu(null);
            }
        };
        const closeMenu = () => setMenu(null);
        // Tab out of the menu closes it, as a native menu does.
        const closeOnFocusOut = (event: FocusEvent) => {
            if (!(event.relatedTarget instanceof Node) || !element.contains(event.relatedTarget)) {
                setMenu(null);
            }
        };
        element.addEventListener('focusout', closeOnFocusOut);
        document.addEventListener('pointerdown', closeOutside, true);
        document.addEventListener('wheel', closeOutside, { capture: true, passive: true });
        document.addEventListener('keydown', closeOnEscape);
        window.addEventListener('blur', closeMenu);
        window.addEventListener('resize', closeMenu);
        return () => {
            element.removeEventListener('focusout', closeOnFocusOut);
            returnFocus?.focus({ preventScroll: true });
            document.removeEventListener('pointerdown', closeOutside, true);
            document.removeEventListener('wheel', closeOutside, { capture: true });
            document.removeEventListener('keydown', closeOnEscape);
            window.removeEventListener('blur', closeMenu);
            window.removeEventListener('resize', closeMenu);
        };
    }, [menu]);

    const close = () => setMenu(null);

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
            return;
        }
        event.preventDefault();
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
        const index = buttons.findIndex((button) => button === document.activeElement);
        const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
        buttons[(next + buttons.length) % buttons.length]?.focus();
    };

    if (!menu) {
        return null;
    }
    return (
        <div
            ref={popover}
            popover="manual"
            role="menu"
            aria-label="Actions"
            onKeyDown={onKeyDown}
            className="menu-enter fixed inset-auto m-0 min-w-60 rounded-lg border border-rule bg-paper-2 py-1.5 text-ink shadow-[var(--shadow-panel)]"
        >
            {menu.items.map((item) => (
                <div key={item.label} role="none" className={item.isSeparated ? 'mt-1.5 border-t border-rule pt-1.5' : undefined}>
                    <button
                        type="button"
                        role="menuitem"
                        disabled={item.isDisabled}
                        onClick={() => {
                            close();
                            item.run();
                        }}
                        className="mx-1.5 flex h-8 w-[calc(100%-0.75rem)] items-center justify-between gap-6 rounded-md px-2.5 text-left text-sm transition-colors duration-[var(--dur-micro)] hover:bg-paper-3 focus-visible:bg-paper-3 focus-visible:outline-none disabled:text-muted disabled:hover:bg-transparent"
                    >
                        <span>{item.label}</span>
                        {item.hint && <span className="text-xs text-muted">{item.hint}</span>}
                    </button>
                </div>
            ))}
        </div>
    );
}
