import { useCallback, useEffect, useRef, useState } from 'react';
import { useGraph, type CellId } from '@joint/react-plus';
import { CATALOG } from '../shapes/catalog';
import { pipeLook } from './cells';
import {
    isEquipmentData,
    isPipeData,
    type EquipmentData,
    type EquipmentRecord,
    type Graph,
    type PipeRecord,
    type PlantMessage,
} from './model';
import { simulate, type SimElement, type SimPipe } from './simulate';

const TICK_MS = 500;
const MAX_MESSAGES = 200;
// The plant answers a command after a short, realistic delay.
const ANSWER_MIN_MS = 300;
const ANSWER_JITTER_MS = 500;
// The plant's writes are not edits: keep them off the undo stack.
const PLANT_WRITE = { skipHistory: true } as const;
const LOGGED_NUMBERS = ['level', 'value', 'temperature'] as const;
// A reading is logged when it crosses a step, not on every tick.
const LOG_STEPS: Record<string, number> = { level: 5, temperature: 10, pressure: 1, flow: 5, output: 100, reading: 5 };

const jitter = (): number => Math.random() * 2 - 1;

/** A message before the log stamps it with its id and time. */
type PlantEvent = Omit<PlantMessage, 'id' | 'time'>;

/** The running plant: its log, and the operator's way to command it. */
export interface Plant {
    readonly messages: readonly PlantMessage[];
    /** Operate a control: the plant confirms it with an update, or not at all. */
    readonly sendCommand: (id: CellId) => void;
}

/**
 * Runs the simulated plant while the calling component is mounted: steps it on
 * a timer, writes the new state into the diagram, logs what changed and answers
 * the operator's commands. Unmounting restores the values the diagram had
 * before the run.
 */
export function usePlant(): Plant {
    const { graph, setCell, setCellData, transaction } = useGraph<EquipmentRecord, PipeRecord>();
    const [messages, setMessages] = useState<readonly PlantMessage[]>([]);
    const nextMessageId = useRef(0);
    const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

    const log = useCallback((entries: PlantEvent[]) => {
        if (entries.length === 0) {
            return;
        }
        const time = Date.now();
        const stamped = entries.map((entry) => ({ ...entry, id: nextMessageId.current++, time }));
        setMessages((previous) => [...stamped.reverse(), ...previous].slice(0, MAX_MESSAGES));
    }, []);

    useEffect(() => {
        const designed = new Map<CellId, EquipmentData>();
        for (const element of graph.getElements()) {
            const data: unknown = element.get('data');
            if (isEquipmentData(data)) {
                designed.set(element.id, data);
            }
        }

        const step = () => {
            const { elements, pipes } = readPlant(graph);
            const result = simulate(elements, pipes, TICK_MS / 1000, jitter);
            const before = new Map(elements.map((element) => [element.id, element.data]));
            const changes: PlantEvent[] = [];
            transaction(() => {
                for (const [id, data] of result.elements) {
                    const previous = before.get(id);
                    if (previous) {
                        changes.push(...describeChanges(id, previous, data));
                    }
                    setCellData(id, data, PLANT_WRITE);
                }
                for (const [id, isFlowing] of result.pipes) {
                    setCell(id, (previous) => withFlow(previous, isFlowing), PLANT_WRITE);
                }
            }, { name: 'plant' });
            log(changes);
        };
        const interval = setInterval(step, TICK_MS);
        const pending = timers.current;
        return () => {
            clearInterval(interval);
            for (const timer of pending) {
                clearTimeout(timer);
            }
            pending.clear();
            transaction(() => {
                for (const [id, data] of designed) {
                    if (graph.getCell(id)) {
                        setCellData(id, data, PLANT_WRITE);
                    }
                }
                for (const link of graph.getLinks()) {
                    const data: unknown = link.get('data');
                    if (isPipeData(data) && data.flowing) {
                        setCell(link.id, (previous) => withFlow(previous, false), PLANT_WRITE);
                    }
                }
            }, { name: 'plant' });
        };
    }, [graph, setCell, setCellData, transaction, log]);

    const sendCommand = useCallback((id: CellId) => {
        const data: unknown = graph.getCell(id)?.get('data');
        if (!isEquipmentData(data) || data.pending) {
            return;
        }
        const control = CATALOG[data.kind].control;
        if (!control) {
            return;
        }
        const wanted = !data.active;
        setCellData(id, { ...data, pending: true }, PLANT_WRITE);
        log([{ cellId: id, tag: data.tag, property: 'command', value: wanted ? control.on : control.off, direction: 'command' }]);
        const timer = setTimeout(() => {
            timers.current.delete(timer);
            const current: unknown = graph.getCell(id)?.get('data');
            if (!isEquipmentData(current)) {
                return;
            }
            setCellData(id, { ...current, active: wanted, pending: false }, PLANT_WRITE);
            log([{ cellId: id, tag: current.tag, property: 'state', value: wanted ? control.on : control.off, direction: 'update' }]);
        }, ANSWER_MIN_MS + Math.random() * ANSWER_JITTER_MS);
        timers.current.add(timer);
    }, [graph, setCellData, log]);

    return { messages, sendCommand };
}

function withFlow(previous: EquipmentRecord | PipeRecord, isFlowing: boolean): EquipmentRecord | PipeRecord {
    if (previous.type !== 'link') {
        return previous;
    }
    return { ...previous, data: { ...previous.data, flowing: isFlowing }, ...pipeLook(previous.data.medium, isFlowing) };
}

function readPlant(graph: Graph): { elements: SimElement[]; pipes: SimPipe[] } {
    const elements: SimElement[] = [];
    for (const element of graph.getElements()) {
        const data: unknown = element.get('data');
        if (isEquipmentData(data)) {
            elements.push({ id: element.id, data });
        }
    }
    const pipes: SimPipe[] = [];
    for (const link of graph.getLinks()) {
        const data: unknown = link.get('data');
        if (isPipeData(data)) {
            const source = link.source();
            const target = link.target();
            pipes.push({ id: link.id, source: source.id, sourcePort: source.port, target: target.id, targetPort: target.port, data });
        }
    }
    return { elements, pipes };
}

function describeChanges(cellId: CellId, previous: EquipmentData, next: EquipmentData): PlantEvent[] {
    const changes: PlantEvent[] = [];
    const spec = CATALOG[next.kind];
    // A motor's state is news; a fitting carrying flow is not.
    if (previous.active !== next.active && next.kind === 'motor') {
        changes.push({ cellId, tag: next.tag, property: 'state', value: next.active ? 'On' : 'Off', direction: 'update' });
    }
    if (previous.alarm !== next.alarm) {
        changes.push({ cellId, tag: next.tag, property: 'alarm', value: next.alarm ? 'Raised' : 'Cleared', direction: 'update' });
    }
    for (const key of LOGGED_NUMBERS) {
        const before = previous[key];
        const after = next[key];
        const property = key === 'value' ? spec.reading ?? 'value' : key;
        const step = LOG_STEPS[property] ?? 1;
        if (after !== undefined && Math.floor(after / step) !== Math.floor((before ?? Number.NaN) / step)) {
            const unit = key === 'level' ? '%' : key === 'temperature' ? ' °C' : spec.unit ? ` ${spec.unit}` : '';
            changes.push({ cellId, tag: next.tag, property, value: `${Math.round(after)}${unit}`, direction: 'update' });
        }
    }
    return changes;
}
