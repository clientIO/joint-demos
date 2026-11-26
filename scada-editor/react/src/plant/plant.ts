import type { ShapeData } from '../shapes/types';
import { readProperty, writeProperty, type TagValue } from './properties';

/*
 * The interface of the diagram to the plant (in run mode): any system - a SCADA server, a PLC gateway, an MQTT or
 * OPC UA client, the mock in `mock/` - changes the diagram by calling `update()` with the tag of a cell, the name
 * of a property and its value; it is told the commands of the operator (a pump turned on, a valve opened) by the
 * `command` event. The diagram binds the properties to its cells (see `properties.ts`).
 *
 *     plant.update('FM-101', 'value', 18.6);
 *     plant.update('HV-101', 'open', false);
 *     plant.on('command', ({ tag, property, value }) => server.send({ tag, property, value }));
 *
 * A plant is created for each run (see `runtime/plant-session.ts`); in the browser console: `window.plant`.
 */

/** The id of a cell of the diagram. */
export type CellKey = string | number;

/** A cell of the diagram as the plant sees it: its data and, for a link, the cells at its ends. */
export interface PlantCell {
    readonly id: CellKey;
    readonly isLink: boolean;
    readonly data: ShapeData;
    /** The defaults of its kind (an attribute the data does not have: the unit of a display). */
    readonly defaults?: Partial<ShapeData>;
    readonly source?: CellKey;
    readonly target?: CellKey;
}

/** The diagram the plant reads and writes: its cells (as they are now), the cell of a tag, a new data of a cell. */
export interface PlantDiagram {
    readonly cells: () => readonly PlantCell[];
    readonly cellOfTag: (tag: string) => PlantCell | undefined;
    /** A change of the plant: not an edit (no undo step), restored when the run ends. */
    readonly write: (id: CellKey, data: ShapeData) => void;
}

/** The events of the plant: an update from it (applied to the diagram), a command of the operator to it. */
export type PlantEvent = 'update' | 'command';

/** A message between the diagram and the plant: a new value of a property of a cell (by its tag). */
export interface PlantMessage {
    readonly tag: string;
    readonly property: string;
    readonly value: TagValue;
    readonly time: Date;
}

export type PlantListener = (message: PlantMessage) => void;

/** The tag of a cell (its ID), if it has one. */
export function tagOf(data: ShapeData): string | undefined {
    return typeof data.tag === 'string' && data.tag !== '' ? data.tag : undefined;
}

/** The cells by their tags: a tag taken twice belongs to the first cell (the other one gets another one). */
export function indexByTag(cells: readonly PlantCell[]): ReadonlyMap<string, PlantCell> {
    const index = new Map<string, PlantCell>();
    for (const cell of cells) {
        const tag = tagOf(cell.data);
        if (tag && !index.has(tag)) {
            index.set(tag, cell);
        }
    }
    return index;
}

export class Plant {
    protected readonly diagram: PlantDiagram;
    protected readonly listeners: Record<PlantEvent, Set<PlantListener>> = { update: new Set(), command: new Set() };

    constructor(diagram: PlantDiagram) {
        this.diagram = diagram;
    }

    /**
     * A new value of the property of the cell of the tag, from the plant: shown on the diagram (the `update`
     * event). `false` if it is not shown (no cell of the tag, no such property of it).
     */
    update(tag: string, property: string, value: TagValue): boolean {
        const cell = this.diagram.cellOfTag(tag);
        const data = cell ? writeProperty(cell.data, property, value) : null;
        if (!cell || !data) {
            return false;
        }
        this.diagram.write(cell.id, data);
        this.emit('update', { tag, property, value, time: new Date() });
        return true;
    }

    /** A command of the operator (by a control of a cell): sent to the plant (the `command` event). */
    send(tag: string, property: string, value: TagValue): void {
        this.emit('command', { tag, property, value, time: new Date() });
    }

    /** The value of the property of the cell of the tag, as the diagram shows it now. */
    get(tag: string, property: string): TagValue | undefined {
        const cell = this.diagram.cellOfTag(tag);
        return cell ? readProperty(cell.data, property) : undefined;
    }

    /** Listen to the event; returns the function that stops listening. */
    on(event: PlantEvent, listener: PlantListener): () => void {
        this.listeners[event].add(listener);
        return () => this.off(event, listener);
    }

    off(event: PlantEvent, listener: PlantListener): void {
        this.listeners[event].delete(listener);
    }

    protected emit(event: PlantEvent, message: PlantMessage): void {
        // A copy: a listener may stop listening meanwhile.
        [...this.listeners[event]].forEach((listener) => listener(message));
    }
}
