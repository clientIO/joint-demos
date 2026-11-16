import { createContext, use, useState, type ReactNode } from 'react';
import {
    useCell,
    useCells,
    useGraph,
    useOnPaperEvents,
    usePaperScroller,
    type CellId,
    type CellRecord,
    type Computed,
} from '@joint/react-plus';
import { isEquipmentData, type PlantMessage } from '../plant/model';
import { usePlant, type Plant } from '../plant/use-plant';
import { CATALOG } from '../shapes/catalog';
import { PAPER_ID } from './paper-id';
import { isSameIds, selectData } from './selectors';

// How long the view glides to an element picked in the log.
const LOCATE_SCROLL_MS = 300;
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });

const selectControlIds = (cells: ReadonlyArray<Computed<CellRecord>>): readonly CellId[] =>
    cells.flatMap((cell) => (isEquipmentData(cell.data) && CATALOG[cell.data.kind].control ? [cell.id] : []));

function ControlRow({ id, onOperate }: { readonly id: CellId; readonly onOperate: (id: CellId) => void }) {
    const data = useCell(id, selectData);
    if (!isEquipmentData(data)) {
        return null;
    }
    const control = CATALOG[data.kind].control;
    if (!control) {
        return null;
    }
    const state = data.active ? control.on : control.off;
    return (
        <li className="flex items-center gap-3 py-1.5">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{data.name}</p>
                <p className="font-mono text-xs text-muted">{data.tag}</p>
            </div>
            <span className={data.active ? 'text-sm text-accent' : 'text-sm text-muted'}>
                {data.pending ? 'Sending…' : state}
            </span>
            <button
                type="button"
                className="key"
                disabled={data.pending}
                aria-label={`${data.active ? control.stop : control.start} ${data.tag} ${data.name}`}
                onClick={() => onOperate(id)}
            >
                {data.active ? control.stop : control.start}
            </button>
        </li>
    );
}

function MessageRow({ message, onLocate }: { readonly message: PlantMessage; readonly onLocate: (id: CellId) => void }) {
    return (
        <li className="log-row">
            <button
                type="button"
                onClick={() => onLocate(message.cellId)}
                className="grid w-full grid-cols-[auto_4.5rem_1fr] items-baseline gap-x-3 px-4 py-1.5 text-left transition-colors duration-[var(--dur-micro)] hover:bg-paper-2"
            >
                <span className="font-mono text-xs text-muted tabular-nums">{TIME_FORMAT.format(message.time)}</span>
                <span className="truncate font-mono text-xs text-ink">{message.tag}</span>
                <span className={message.direction === 'command' ? 'text-sm text-accent' : 'text-sm text-ink-2'}>
                    {message.direction === 'command' ? `Command: ${message.value}` : `${message.property} ${message.value}`}
                </span>
            </button>
        </li>
    );
}

const PlantContext = createContext<Plant | null>(null);

/**
 * Runs the plant for as long as it is mounted (the run mode), whether its
 * panel is shown or not; a click on a control on the diagram operates it.
 */
export function PlantProvider({ children }: { readonly children: ReactNode }) {
    const plant = usePlant();
    useOnPaperEvents(PAPER_ID, {
        onElementPointerClick: ({ id }) => plant.sendCommand(id),
    });
    return <PlantContext value={plant}>{children}</PlantContext>;
}

/** The run mode's side panel: the operator's controls and the log of the plant's messages. */
export function RunPanel() {
    const plant = use(PlantContext);
    if (!plant) {
        throw new Error('RunPanel must be rendered inside a PlantProvider');
    }
    const { messages, sendCommand } = plant;
    const { graph } = useGraph();
    const { paperScroller } = usePaperScroller(PAPER_ID);
    const controlIds = useCells(selectControlIds, isSameIds);
    const [filter, setFilter] = useState('');

    const locate = (id: CellId) => {
        const cell = graph.getCell(id);
        if (cell?.isElement()) {
            const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            paperScroller?.scrollToElement(cell, isReducedMotion ? {} : { animation: { duration: LOCATE_SCROLL_MS }});
        }
    };

    const needle = filter.trim().toLowerCase();
    const shown = needle
        ? messages.filter((message) => `${message.tag} ${message.property} ${message.value}`.toLowerCase().includes(needle))
        : messages;

    return (
        <div className="flex h-full min-h-0 flex-col">
            <section aria-labelledby="controls-heading" className="border-b border-rule px-4 pt-4 pb-3">
                <h2 id="controls-heading" className="font-display text-lg font-semibold tracking-tight">Controls</h2>
                <ul className="mt-1 max-h-72 overflow-y-auto">
                    {controlIds.map((id) => <ControlRow key={id} id={id} onOperate={sendCommand} />)}
                </ul>
            </section>
            <section aria-labelledby="log-heading" className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                    <h2 id="log-heading" className="font-display text-lg font-semibold tracking-tight">Log</h2>
                    <label className="ml-auto w-40">
                        <span className="sr-only">Filter the log</span>
                        <input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter" className="field" />
                    </label>
                </div>
                {shown.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted">
                        {messages.length === 0 ? 'Waiting for the plant. Start a pump or fire the boiler.' : 'No message matches the filter.'}
                    </p>
                ) : (
                    <ol className="min-h-0 flex-1 overflow-y-auto pb-3">
                        {shown.map((message) => <MessageRow key={message.id} message={message} onLocate={locate} />)}
                    </ol>
                )}
            </section>
        </div>
    );
}
