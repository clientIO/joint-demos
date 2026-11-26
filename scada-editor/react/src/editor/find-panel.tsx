import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { X } from 'lucide-react';
import { useCells, useGraph, usePaper, usePaperScroller, useSelectionCollection, type CellRecord, type Computed } from '@joint/react-plus';
import type { dia } from '@joint/plus';
import { CONNECTIONS, isConnectionData } from '../connections/connections';
import { setMarker } from '../runtime/highlighters';
import { specOf } from '../shapes/registry';
import { isShapeData } from '../shapes/shape-data';
import { useDiagramMeta } from './diagram-meta';
import { useEscapeLayer } from './escape-layers';
import { PAPER_ID } from './paper-id';

/*
 * Find a shape: the cells with an ID or a name listed - their ID, name and kind - filtered by the words typed (every
 * word has to match; case and dashes ignored). A row clicked shows its cell: selected (edit mode) or marked by an
 * arrow (run mode, while the list is open), scrolled into view. Several, in edit mode, as in a list of files: Cmd /
 * Ctrl adds a row or removes it, Shift the rows from the one clicked before - Cmd + Shift adds them; the arrows go
 * through the rows (with Shift: a range), Enter picks and closes, Escape closes. A selection on the canvas closes it.
 */

// How long the view glides to a shape (ms).
const SCROLL_DURATION = 300;
const ENTRY_SEPARATOR = '\u0001';
const FIELD_SEPARATOR = '\u0002';

/** A cell listed: what it is found by (its ID, its name: one of them at least). */
interface FindEntry {
    readonly id: string;
    /** Empty: not bound to the plant. */
    readonly tag: string;
    readonly name: string;
    /** The name of its kind of shape (as in the palette); its description as the tooltip. */
    readonly kind: string;
    readonly description: string;
}

/** A search ignores the case and the dashes. */
const normalize = (text: string) => text.toLowerCase().replaceAll('-', '');

/** The entry of a cell with an ID or a name (not a locked one: the background), as one line. */
function entryLineOf(cell: Computed<CellRecord>): string | null {
    const { data } = cell;
    if (!isShapeData(data) || data.locked === true) {
        return null;
    }
    const tag = data.tag ?? '';
    const name = data.label?.text ?? '';
    if (!tag && !name) {
        return null;
    }
    const spec = isConnectionData(data) ? CONNECTIONS[data.kind] : specOf(data.kind);
    return [String(cell.id), tag, name, spec?.title ?? data.kind, spec?.description ?? ''].join(FIELD_SEPARATOR);
}

/** The entries as one string (a primitive: the list renders again only when one of them changes). */
const selectEntryLines = (cells: ReadonlyArray<Computed<CellRecord>>): string =>
    cells.flatMap((cell) => entryLineOf(cell) ?? []).join(ENTRY_SEPARATOR);

/** The entries by their IDs (`P-2` before `P-10`); the ones without at the end, by their names. */
function entriesOf(lines: string): FindEntry[] {
    const compare = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });
    return lines.split(ENTRY_SEPARATOR).filter(Boolean).map((line) => {
        const [id, tag, name, kind, description] = line.split(FIELD_SEPARATOR);
        return { id, tag, name, kind, description };
    }).sort((a, b) => {
        if (Boolean(a.tag) !== Boolean(b.tag)) {
            return a.tag ? -1 : 1;
        }
        return a.tag ? compare(a.tag, b.tag) : compare(a.name, b.name);
    });
}

const matches = (entry: FindEntry, words: readonly string[]) => {
    const text = normalize(`${entry.tag} ${entry.name} ${entry.kind}`);
    return words.every((word) => text.includes(word));
};

/** The rows marked, the one clicked last (where the arrows go on from) and the anchor of a range. */
interface Marks {
    readonly ids: ReadonlySet<string>;
    readonly current: string | null;
    readonly anchor: string | null;
}

const NO_MARKS: Marks = { ids: new Set(), current: null, anchor: null };

interface FindPanelProps {
    readonly isRunning: boolean;
    /** Bumped by `Cmd + F` while the list is open: its filter focused again. */
    readonly focusRequest: number;
    readonly onClose: () => void;
    readonly className?: string;
}

/** Find (see above): open while it is mounted, with an empty filter - a new search. */
export function FindPanel({ isRunning, focusRequest, onClose, className }: FindPanelProps) {
    const { graph } = useGraph();
    const { paper } = usePaper(PAPER_ID);
    const { paperScroller } = usePaperScroller(PAPER_ID);
    const { collection, selectCells } = useSelectionCollection();
    const { meta } = useDiagramMeta();
    const lines = useCells(selectEntryLines);
    const [filter, setFilter] = useState('');
    const [marks, setMarks] = useState<Marks>(NO_MARKS);
    const input = useRef<HTMLInputElement>(null);
    const rows = useRef<HTMLDivElement>(null);
    // A change of the selection by the list itself: it doesn't close the list.
    const isSelecting = useRef(false);
    const isMultiple = !isRunning;
    // `Escape` (not typed into its filter): closed before the diagram's own.
    useEscapeLayer(true, onClose);

    const words = normalize(filter).split(/\s+/).filter(Boolean);
    const shown = entriesOf(lines).filter((entry) => matches(entry, words));

    useEffect(() => {
        input.current?.focus();
    }, [focusRequest]);

    // Selected on the canvas (a click, a region, Select All): done with the list; nothing selected (the blank canvas
    // pressed, it pans too): no rows marked, the list kept open.
    useEffect(() => {
        const onSelectionChange = () => {
            if (isSelecting.current) {
                return;
            }
            if (collection.length > 0) {
                onClose();
                return;
            }
            setMarks(NO_MARKS);
        };
        collection.on('reset add remove', onSelectionChange);
        return () => {
            collection.off('reset add remove', onSelectionChange);
        };
    }, [collection, onClose]);

    // Closed: nothing marked by it any more (the selection of the edit mode stays).
    useEffect(() => () => {
        if (paper) {
            setMarker(paper, null, meta.style);
        }
    }, [paper, meta.style]);

    /** The cells scrolled to the middle of the view: when they are out of view, or always (`isCentered`). */
    const scrollIntoView = (cells: readonly dia.Cell[], isCentered: boolean) => {
        const bbox = graph.getCellsBBox([...cells]);
        // Run mode with a screen: it fills the window, not panned.
        const isScreenShown = isRunning && graph.getElements().some((element) => {
            const data: unknown = element.get('data');
            return isShapeData(data) && data.kind === 'Screen';
        });
        if (!bbox || !paperScroller || isScreenShown) {
            return;
        }
        if (!isCentered && paperScroller.getVisibleArea().containsRect(bbox)) {
            return;
        }
        const { x, y } = bbox.center();
        paperScroller.center(x, y, { animation: { duration: SCROLL_DURATION } });
    };

    /** The marked rows shown on the diagram: the one clicked (or moved to) in view, all of them centered when picked. */
    const show = (next: Marks, focus: string, isCentered = false) => {
        setMarks(next);
        const cells = [...next.ids].flatMap((id) => graph.getCell(id) ?? []);
        const focused = graph.getCell(focus);
        if (isCentered) {
            scrollIntoView(cells, true);
        } else if (focused) {
            scrollIntoView([focused], false);
        }
        if (isRunning) {
            if (paper) {
                setMarker(paper, cells[0] ?? null, meta.style);
            }
            return;
        }
        isSelecting.current = true;
        selectCells(cells);
        isSelecting.current = false;
    };

    const markOnly = (id: string, isCentered = false) => show({ ids: new Set([id]), current: id, anchor: id }, id, isCentered);

    const toggleMark = (id: string) => {
        const ids = new Set(marks.ids);
        if (!ids.delete(id)) {
            ids.add(id);
        }
        show({ ids, current: id, anchor: id }, id);
    };

    /** The rows from the anchor to the one, instead of the marked ones or added to them. */
    const markRange = (id: string, isAdded: boolean) => {
        const ids = shown.map((entry) => entry.id);
        const from = ids.indexOf(marks.anchor ?? id);
        const to = ids.indexOf(id);
        const range = from === -1 ? [id] : ids.slice(Math.min(from, to), Math.max(from, to) + 1);
        show({ ids: new Set(isAdded ? [...marks.ids, ...range] : range), current: id, anchor: from === -1 ? id : marks.anchor }, id);
    };

    const onRowClick = (id: string, event: MouseEvent) => {
        const isAdded = event.metaKey || event.ctrlKey;
        if (!isMultiple || (!isAdded && !event.shiftKey)) {
            markOnly(id);
        } else if (event.shiftKey) {
            markRange(id, isAdded);
        } else {
            toggleMark(id);
        }
    };

    /** The marked rows (or the first one) picked, centered; the list closed. */
    const pick = () => {
        const [first] = marks.ids;
        if (first) {
            show(marks, first, true);
        } else if (shown[0]) {
            markOnly(shown[0].id, true);
        } else {
            return;
        }
        onClose();
    };

    /** The row after (1) or before (-1) the current one alone, or with Shift the range to it; in view. */
    const markNext = (step: 1 | -1, isRange: boolean) => {
        if (shown.length === 0) {
            return;
        }
        const index = shown.findIndex((entry) => entry.id === marks.current);
        const next = index === -1 ? (step === 1 ? 0 : shown.length - 1) : Math.min(Math.max(index + step, 0), shown.length - 1);
        const { id } = shown[next];
        if (isRange && isMultiple) {
            markRange(id, false);
        } else {
            markOnly(id);
        }
        rows.current?.querySelector(`[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'nearest' });
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            markNext(event.key === 'ArrowDown' ? 1 : -1, event.shiftKey);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            pick();
        } else if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
        }
    };

    return (
        <section role="dialog" aria-label="Find" onKeyDown={onKeyDown} className={`menu-enter w-[420px] overflow-hidden rounded-lg border border-rule bg-paper-2 text-ink shadow-[var(--shadow-panel)] ${className ?? ''}`}>
            <header className="flex items-center justify-between border-b border-rule px-3.5 py-2">
                <h2 className="font-display text-sm font-semibold">Find</h2>
                <button type="button" className="rounded p-1 text-muted hover:bg-paper-3 hover:text-ink" aria-label="Close" onClick={onClose}><X className="size-4" aria-hidden /></button>
            </header>
            <div className="border-b border-rule px-3.5 py-2">
                <input
                    ref={input}
                    type="search"
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="An ID, a name or a kind of shape"
                    aria-label="An ID, a name or a kind of shape"
                    className="field"
                />
            </div>
            <div ref={rows} role="listbox" aria-label="Shapes" aria-multiselectable={isMultiple} className="h-72 overflow-y-auto py-1 text-xs">
                {shown.length === 0 && <p className="px-3.5 py-3 text-muted">No shape found</p>}
                {shown.map((entry) => (
                    <div
                        key={entry.id}
                        data-id={entry.id}
                        role="option"
                        aria-selected={marks.ids.has(entry.id)}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={(event) => onRowClick(entry.id, event)}
                        onDoubleClick={() => {
                            markOnly(entry.id, true);
                            onClose();
                        }}
                        className="grid cursor-pointer grid-cols-[72px_1fr_auto] gap-2.5 px-3.5 py-1 whitespace-nowrap odd:bg-paper-3/50 hover:bg-accent/10 aria-selected:bg-accent/20"
                    >
                        <span className="font-mono font-semibold">{entry.tag}</span>
                        <span className="overflow-hidden text-ellipsis">{entry.name}</span>
                        <span className="text-muted" title={entry.description}>{entry.kind}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
