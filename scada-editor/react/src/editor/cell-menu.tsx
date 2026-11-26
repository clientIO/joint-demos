import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useClipboard, useGraph, useOnGraphEvents, useOnPaperEvents, useSelectionCollection, type CellId } from '@joint/react-plus';
import type { dia } from '@joint/plus';
import { CONNECTIONS, isConnectionData } from '../connections/connections';
import { adjacentLayer, LAYER_NAMES } from '../plant/layers';
import { specOf } from '../shapes/registry';
import { MODIFIER_KEY, SHIFT_KEY } from '../ui/keys';
import { useEscapeLayer } from './escape-layers';
import { clickTarget } from './group-levels';
import { PAPER_ID } from './paper-id';
import { dataOfCell, layerOfCell, useEditorActions } from './use-editor-actions';

/*
 * The context menus of the canvas while editing: of a cell (the clipboard, groups, splitting a link, the
 * selections, flipping, the order and the layers, disconnecting, locking, deleting - for the selection, or the cell
 * alone when it is not selected) and of the blank canvas (unlocking, paste, the selections).
 */

// How far the menu keeps from the edges of the window (px).
const WINDOW_MARGIN = 8;

interface MenuItem {
    readonly label: string;
    /** A shortcut, or a note on the right. */
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

type Point = { readonly x: number; readonly y: number };

/** The name of a cell in a hint: its ID, else its kind. */
function hintOf(cell: dia.Cell): string {
    const data = dataOfCell(cell);
    if (!data) {
        return '';
    }
    return data.tag ?? (isConnectionData(data) ? CONNECTIONS[data.kind].title : specOf(data.kind)?.title ?? data.kind);
}

/** Keep the menu in the window: opened up or to the left of the pointer when it doesn't fit. */
function placeInWindow(element: HTMLElement, clientX: number, clientY: number) {
    const { width, height } = element.getBoundingClientRect();
    const left = clientX + width > window.innerWidth - WINDOW_MARGIN ? Math.max(WINDOW_MARGIN, clientX - width) : clientX;
    const top = clientY + height > window.innerHeight - WINDOW_MARGIN ? Math.max(WINDOW_MARGIN, clientY - height) : clientY;
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;
}

function useMenus() {
    const { graph } = useGraph();
    const { collection, selectCells } = useSelectionCollection();
    const { isClipboardEmpty } = useClipboard();
    const actions = useEditorActions();

    const cellMenu = (id: CellId, point: Point): MenuItem[] => {
        const pressed = graph.getCell(id);
        if (!pressed) {
            return [];
        }
        // The cell selected (or its group selected): the menu of the selection; otherwise of what a click selects.
        const selectedLevel = [pressed, ...pressed.getAncestors()].find((each) => collection.has(each));
        const cell = selectedLevel ?? clickTarget([], pressed) ?? pressed;
        if (!collection.has(cell)) {
            selectCells([cell.id]);
        }
        const selected = collection.has(cell) ? collection.toArray() : [cell];
        const layers = new Set(selected.map((each) => layerOfCell(graph, each)));
        const [layer] = layers;
        const layerHint = layers.size === 1 ? `in ${LAYER_NAMES[layer]}` : 'in their layers';
        const up = layers.size === 1 ? adjacentLayer(layer, 1) : undefined;
        const down = layers.size === 1 ? adjacentLayer(layer, -1) : undefined;
        const below = actions.elementBelow(cell, point);
        const sameType = actions.sameType();
        const kinds = new Set(sameType.map((each) => dataOfCell(each)?.kind));
        const isLink = cell.isLink();
        const isGroup = dataOfCell(cell)?.kind === 'Group';
        const isPipe = dataOfCell(cell)?.kind === 'Pipe';
        const ends = actions.connectedEnds().length;
        const flipItems: MenuItem[] = [
            ...(actions.flipTargets('x').length > 0 ? [{ label: 'Flip Horizontally', hint: `${SHIFT_KEY}H`, run: () => actions.flip('x') }] : []),
            ...(actions.flipTargets('y').length > 0 ? [{ label: 'Flip Vertically', hint: `${SHIFT_KEY}V`, run: () => actions.flip('y') }] : []),
        ].map((item, index) => (index === 0 ? { ...item, isSeparated: true } : item));
        return [
            { label: 'Cut', hint: `${MODIFIER_KEY}X`, run: actions.cut },
            { label: 'Copy', hint: `${MODIFIER_KEY}C`, run: actions.copy },
            isGroup && selected.length === 1
                ? { label: 'Ungroup', hint: `${MODIFIER_KEY}${SHIFT_KEY}G`, isSeparated: true, run: actions.ungroup }
                : { label: 'Group', hint: `${MODIFIER_KEY}G`, isDisabled: actions.groupable().length < 2, isSeparated: true, run: actions.group },
            ...(isLink ? [{ label: 'Split Here', isSeparated: true, run: () => actions.splitLink(id, point) }] : []),
            ...(isPipe ? [{ label: 'Insert Join', run: () => actions.insertJoin(id, point) }] : []),
            { label: 'Select Below', hint: below ? hintOf(below) : undefined, isDisabled: !below, isSeparated: true, run: () => below && selectCells([below.id]) },
            {
                label: 'Select Same Type',
                hint: kinds.size === 1 ? `${hintOf(cell) && !dataOfCell(cell)?.tag ? hintOf(cell) : specOf(dataOfCell(cell)?.kind)?.title ?? hintOf(cell)} · ${sameType.length}` : `${kinds.size} types · ${sameType.length}`,
                isDisabled: sameType.length === 0,
                run: () => selectCells(sameType.map((each) => each.id)),
            },
            ...flipItems,
            { label: 'Bring to Front', hint: layerHint, isSeparated: true, run: () => actions.order(true) },
            { label: 'Send to Back', hint: layerHint, run: () => actions.order(false) },
            ...(up ? [{ label: `Move to ${LAYER_NAMES[up]}`, hint: 'the layer above', run: () => actions.moveToLayer(up, true) }] : []),
            ...(down ? [{ label: `Move to ${LAYER_NAMES[down]}`, hint: 'the layer below', run: () => actions.moveToLayer(down, false) }] : []),
            ...(isLink ? [] : [
                { label: 'Disconnect', hint: ends > 0 ? `${ends} ${ends === 1 ? 'connection' : 'connections'}` : undefined, isDisabled: ends === 0, isSeparated: true, run: actions.disconnect },
                { label: 'Lock', isSeparated: true, run: actions.lock },
            ]),
            { label: 'Delete', hint: 'Del', isSeparated: isLink, run: actions.remove },
        ];
    };

    const blankMenu = (point: Point): MenuItem[] => {
        const isLocked = (cell: dia.Cell) => dataOfCell(cell)?.locked === true;
        const locked = graph.findElementsAtPoint(point).filter(isLocked).at(-1);
        const lockedAll = graph.getElements().filter(isLocked);
        const cells = graph.getCells().filter((cell) => !isLocked(cell));
        return [
            ...(locked ? [{ label: 'Unlock', hint: hintOf(locked), run: () => actions.unlock([locked.id]) }] : []),
            { label: 'Paste', hint: `${MODIFIER_KEY}V`, isSeparated: Boolean(locked), isDisabled: isClipboardEmpty(), run: () => actions.pasteAt(point) },
            { label: 'Select All', hint: `${MODIFIER_KEY}A`, isSeparated: true, isDisabled: cells.length === 0, run: actions.selectAll },
            { label: 'Select Elements', hint: `${MODIFIER_KEY}${SHIFT_KEY}A`, isDisabled: !cells.some((cell) => cell.isElement()), run: actions.selectElements },
            { label: 'Select Connections', isDisabled: !cells.some((cell) => cell.isLink()), run: actions.selectConnections },
            ...(lockedAll.length > 0 ? [{ label: 'Unlock All', hint: String(lockedAll.length), isSeparated: true, run: () => actions.unlock(lockedAll.map((cell) => cell.id)) }] : []),
        ];
    };

    return { cellMenu, blankMenu };
}

/** Right-click menus of the diagram while editing. */
export function CellMenu() {
    const [menu, setMenu] = useState<OpenMenu | null>(null);
    const popover = useRef<HTMLDivElement>(null);
    const { cellMenu, blankMenu } = useMenus();

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

    // `Escape`: closed first - the selection stays (see `useEscapeLayer()`).
    useEscapeLayer(menu !== null, () => setMenu(null));

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
        window.addEventListener('blur', closeMenu);
        window.addEventListener('resize', closeMenu);
        return () => {
            element.removeEventListener('focusout', closeOnFocusOut);
            returnFocus?.focus({ preventScroll: true });
            document.removeEventListener('pointerdown', closeOutside, true);
            document.removeEventListener('wheel', closeOutside, { capture: true });
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
