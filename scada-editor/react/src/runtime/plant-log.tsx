import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useGraph, useOnPaperEvents, usePaper } from '@joint/react-plus';
import type { dia } from '@joint/plus';
import { X } from 'lucide-react';
import { PAPER_ID } from '../editor/paper-id';
import { indexByTag, type CellKey, type PlantCell, type PlantEvent } from '../plant/plant';
import { isShapeData } from '../shapes/shape-data';
import { useDiagramStyle } from '../shapes/style';
import { useEscapeLayer } from '../editor/escape-layers';
import { dimCells, markClickable, ping, removePings, setMarker, tagOfCell } from './highlighters';
import { isTyping } from './keys';
import {
    DIRECTION_FILTERS,
    dimmedCellsOf,
    filterWordsOf,
    formatLogTime,
    keptCellsOf,
    KIND_ARROWS,
    matchesEntry,
    toggleFilterTag,
    type LogEntry,
} from './log-model';
import { dimmedCellsStore, logEntriesStore, logOptionsStore, markedTagStore, plantStore, type LogOptions } from './run-state';
import { useStore } from './store';
import './runtime.css';
import './log.css';

/*
 * The log of the messages between the diagram and the plant: the updates the plant sends and the commands of the
 * operator (time, update or command, tag, property, value), the last 200 of the run. Filtered by words (dashes and
 * case ignored), by the direction, by the elements clicked on the diagram - while filtered by words the rest of the
 * diagram is grayed; a message clicked marks its element with an arrow; the elements pinged as their messages come
 * (if asked), the cells without an ID grayed (if asked). `L` opens it (or focuses its filter), `Escape` closes it.
 */

const PING_ID = 'log-ping';
// The pings of the messages: an update in the color of the updates, a command in the color of the commands
const PING_COLORS: Readonly<Record<PlantEvent, string>> = { update: 'var(--run-update)', command: 'var(--run-command)' };
const INTRO = 'Live traffic between this diagram and the plant. Readings come in addressed by element tags, and whatever you do to a valve or a pump goes out as a command. The plant is simulated here - in a real deployment, the same messages would travel over OPC UA, MQTT, WebSockets or a REST API. Hold Alt to see the tags of the elements.';
const LOG_KEY = 'l';

export interface PlantLogProps {
    /** Whether the log is shown (the Log button of the toolbar, `L`, `Escape`). */
    readonly isOpen: boolean;
    readonly onIsOpenChange: (isOpen: boolean) => void;
    readonly className?: string;
}

function cellsOf(graph: dia.Graph): PlantCell[] {
    return graph.getCells().flatMap((cell): PlantCell[] => {
        const data: unknown = cell.get('data');
        return isShapeData(data) ? [{ id: cell.id, isLink: cell.isLink(), data }] : [];
    });
}

const setOption = <Key extends keyof LogOptions>(key: Key, value: LogOptions[Key]) => logOptionsStore.set((options) => ({ ...options, [key]: value }));

/** The elements pinged as their messages come, while asked. */
function usePings(paper: dia.Paper | null, graph: dia.Graph, isActive: boolean): void {
    const plant = useStore(plantStore);
    useEffect(() => {
        if (!paper || !plant || !isActive) {
            return;
        }
        const onMessage = (kind: PlantEvent) => ({ tag }: { readonly tag: string }) => {
            const id = indexByTag(cellsOf(graph)).get(tag)?.id;
            const cell = id === undefined ? undefined : graph.getCell(id);
            if (cell?.isElement()) {
                ping(paper, cell, PING_COLORS[kind], PING_ID);
            }
        };
        const stops = (['update', 'command'] as const).map((kind) => plant.on(kind, onMessage(kind)));
        return () => {
            stops.forEach((stop) => stop());
            removePings(paper, PING_ID);
        };
    }, [paper, graph, plant, isActive]);
}

const keyOfIds = (ids: ReadonlySet<CellKey>) => [...ids].map(String).sort().join(' ');

/** The cells dimmed: the ones the filter by words leaves out, the ones without an ID if asked; none while closed. */
function useDimmedCells(paper: dia.Paper | null, graph: dia.Graph, isOpen: boolean, shown: readonly LogEntry[], words: readonly string[], grayUntagged: boolean): void {
    const appliedKey = useRef('');
    useEffect(() => {
        if (!paper) {
            return;
        }
        const cells = cellsOf(graph);
        const dimmed = isOpen ? dimmedCellsOf(cells, keptCellsOf(cells, shown, words), grayUntagged) : new Set<CellKey>();
        const key = keyOfIds(dimmed);
        // Only a change shown: the messages come every second
        if (key === appliedKey.current) {
            return;
        }
        appliedKey.current = key;
        dimCells(paper, dimmed);
        dimmedCellsStore.set(dimmed);
    }, [paper, graph, isOpen, shown, words, grayUntagged]);
    useEffect(() => () => {
        appliedKey.current = '';
        dimmedCellsStore.set(new Set());
        if (paper) {
            dimCells(paper, new Set());
        }
    }, [paper]);
}

/** The log of the plant's messages, in a panel that can be moved by its title. Mount it inside `<Diagram>` while running. */
export function PlantLog({ isOpen, onIsOpenChange, className }: PlantLogProps): ReactNode {
    const { paper } = usePaper(PAPER_ID);
    const { graph } = useGraph();
    const style = useDiagramStyle();
    const entries = useStore(logEntriesStore);
    const options = useStore(logOptionsStore);
    const markedTag = useStore(markedTagStore);
    const filterRef = useRef<HTMLInputElement>(null);
    const shouldFocusFilter = useRef(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const words = filterWordsOf(options.filter);
    const shown = entries.filter((entry) => matchesEntry(entry, options.direction, words));

    usePings(paper, graph, isOpen && options.pings);
    useDimmedCells(paper, graph, isOpen, shown, words, options.grayUntagged);

    // The cells a click filters the log by (with an ID) marked while it is open
    useEffect(() => {
        if (!paper || !isOpen) {
            return;
        }
        markClickable(paper, true);
        return () => markClickable(paper, false);
    }, [paper, isOpen]);

    // The cell of the messages marked: an arrow pointing at it (none while closed)
    useEffect(() => {
        if (!paper || !isOpen || !markedTag) {
            return;
        }
        const id = indexByTag(cellsOf(graph)).get(markedTag)?.id;
        setMarker(paper, id === undefined ? null : graph.getCell(id) ?? null, style);
        return () => setMarker(paper, null, style);
    }, [paper, graph, isOpen, markedTag, style]);

    // Closed: no messages marked
    useEffect(() => {
        if (!isOpen) {
            markedTagStore.set(null);
        }
    }, [isOpen]);

    // A cell clicked while the log is open: its tag in the filter of the log (or out of it)
    useOnPaperEvents(PAPER_ID, {
        'cell:pointerclick': (cellView: dia.CellView) => {
            const tag = tagOfCell(cellView.model);
            if (tag && isOpen) {
                setOption('filter', toggleFilterTag(logOptionsStore.get().filter, tag));
            }
        },
    });

    // `Escape`: closed - one thing a press, what was opened last first (see `useEscapeLayer()`).
    useEscapeLayer(isOpen, () => onIsOpenChange(false));

    // `L`: the log opened, or its filter focused if it is open (not typed into a field); `Escape` typed into its
    // filter: closed (the shortcuts skip the fields)
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen && isTyping(event)) {
                onIsOpenChange(false);
                return;
            }
            if (event.key.toLowerCase() !== LOG_KEY || event.altKey || event.ctrlKey || event.metaKey || isTyping(event)) {
                return;
            }
            event.preventDefault();
            if (isOpen) {
                filterRef.current?.focus();
            } else {
                shouldFocusFilter.current = true;
                onIsOpenChange(true);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onIsOpenChange]);

    // Opened by `L`: its filter focused
    useEffect(() => {
        if (isOpen && shouldFocusFilter.current) {
            shouldFocusFilter.current = false;
            filterRef.current?.focus();
        }
    }, [isOpen]);

    const startMove = (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button'))) {
            return;
        }
        const start = { x: event.clientX - offset.x, y: event.clientY - offset.y };
        const header = event.currentTarget;
        header.setPointerCapture(event.pointerId);
        const onMove = (move: PointerEvent) => setOffset({ x: move.clientX - start.x, y: move.clientY - start.y });
        const onEnd = () => {
            header.removeEventListener('pointermove', onMove);
            header.removeEventListener('pointerup', onEnd);
            header.removeEventListener('pointercancel', onEnd);
        };
        header.addEventListener('pointermove', onMove);
        header.addEventListener('pointerup', onEnd);
        header.addEventListener('pointercancel', onEnd);
    };

    if (!isOpen) {
        return null;
    }
    return (
        <section
            role="dialog"
            aria-labelledby="scada-log-title"
            className={`scada-log${className ? ` ${className}` : ''}`}
            style={{ translate: `${offset.x}px ${offset.y}px` }}
        >
            <header className="scada-log-header" onPointerDown={startMove}>
                <h2 id="scada-log-title" className="scada-log-title">Plant Messages</h2>
                <button type="button" className="scada-log-close" aria-label="Close the log" onClick={() => onIsOpenChange(false)}>
                    <X className="size-4" aria-hidden />
                </button>
            </header>
            <p className="scada-log-intro">{INTRO}</p>
            <div className="scada-log-options">
                <label className="scada-log-option">
                    <input type="checkbox" checked={options.pings} onChange={(event) => setOption('pings', event.target.checked)} />
                    Ping the changes
                </label>
                <label className="scada-log-option">
                    <input type="checkbox" checked={options.grayUntagged} onChange={(event) => setOption('grayUntagged', event.target.checked)} />
                    Gray what has no ID
                </label>
            </div>
            <div className="scada-log-filter">
                <input
                    ref={filterRef}
                    type="search"
                    value={options.filter}
                    placeholder="Filter: a tag or a property - or click an element"
                    aria-label="Filter the messages"
                    onChange={(event) => setOption('filter', event.target.value)}
                />
                <div className="scada-log-directions" role="group" aria-label="Direction">
                    {DIRECTION_FILTERS.map(([direction, text]) => (
                        <button key={direction} type="button" aria-pressed={options.direction === direction} onClick={() => setOption('direction', direction)}>
                            {text}
                        </button>
                    ))}
                </div>
            </div>
            <div className="scada-log-rows">
                {shown.length === 0 ? (
                    <p className="scada-log-empty">No messages</p>
                ) : (
                    <ol aria-label="Messages">
                        {shown.map((entry) => (
                            <LogRow key={entry.id} entry={entry} isMarked={entry.tag === markedTag} onClick={() => markedTagStore.set(entry.tag === markedTag ? null : entry.tag)} />
                        ))}
                    </ol>
                )}
            </div>
        </section>
    );
}

interface LogRowProps {
    readonly entry: LogEntry;
    readonly isMarked: boolean;
    readonly onClick: () => void;
}

/** A message: its time, its direction, the tag, the property and the value; clicked, its element marked. */
function LogRow({ entry, isMarked, onClick }: LogRowProps) {
    const { kind, tag, property, value, time } = entry;
    return (
        <li>
            <button type="button" className="scada-log-message" data-kind={kind} aria-pressed={isMarked} onClick={onClick}>
                <span className="scada-log-time">{formatLogTime(time)}</span>
                <span className="scada-log-kind">{`${KIND_ARROWS[kind]} ${kind}`}</span>
                <span className="scada-log-tag">{tag}</span>
                <span className="scada-log-property">{property}</span>
                <span className="scada-log-value">{String(value)}</span>
            </button>
        </li>
    );
}
