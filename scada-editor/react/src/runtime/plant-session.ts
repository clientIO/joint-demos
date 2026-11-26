import type { GraphApi } from '@joint/react-plus';
import { withConnectionLook } from '../connections/connections';
import { MockPlant } from '../plant/mock/mock-plant';
import { indexByTag, Plant, type CellKey, type PlantCell, type PlantDiagram } from '../plant/plant';
import { specOf } from '../shapes/registry';
import { isShapeData } from '../shapes/shape-data';
import type { ShapeData } from '../shapes/types';
import { flowWrites } from './flows';
import type { LogEntry } from './log-model';
import { withEntry } from './log-model';
import { logEntriesStore, markedTagStore, plantStore } from './run-state';

/*
 * A run of the plant: the diagram bound to a new plant (see `plant/plant.ts`) and the mock driving it, the links
 * flowing as the plant is, the messages logged. The plant's writes are no edits: none is recorded in the history,
 * and the diagram is restored exactly as it was when the run ends (the data of every cell the run changed).
 * To connect a real plant, replace the `MockPlant` here with an adapter of your own: it calls `plant.update()`
 * with the messages of its system and sends the `command` events to it.
 */

/** The graph writes the run uses. */
export type RunGraph = Pick<GraphApi, 'graph' | 'setCell' | 'setCellData'>;

// The plant's writes are not edits: off the undo stack.
const PLANT_WRITE = { skipHistory: true, plant: true } as const;

declare global {
    interface Window {
        /** The plant of the run, for the console: `plant.update('LI-101', 'level', 90)`. */
        plant?: Plant | null;
    }
}

/** The cell of the diagram as the plant sees it, if it is a shape. */
function plantCellOf(cell: ReturnType<RunGraph['graph']['getCells']>[number]): PlantCell | null {
    const data: unknown = cell.get('data');
    if (!isShapeData(data)) {
        return null;
    }
    if (cell.isLink()) {
        return { id: cell.id, isLink: true, data, source: cell.source().id, target: cell.target().id };
    }
    return { id: cell.id, isLink: false, data, defaults: specOf(data.kind)?.defaults };
}

export class PlantSession {
    readonly plant: Plant;
    protected readonly api: RunGraph;
    protected readonly mock: MockPlant;
    /** The data of every cell when the run started: restored when it ends. */
    protected readonly snapshot = new Map<CellKey, unknown>();
    protected stopLogging: Array<() => void> = [];
    /** The cells by their tags: indexed once a tick (the tags don't change while it runs), the cells read fresh. */
    protected tagIds: ReadonlyMap<string, CellKey> | null = null;
    protected nextEntryId = 0;
    protected isFlowSyncScheduled = false;

    constructor(api: RunGraph) {
        this.api = api;
        const diagram: PlantDiagram = {
            cells: () => this.cells(),
            cellOfTag: (tag) => this.cellOfTag(tag),
            write: (id, data) => this.write(id, data),
        };
        this.plant = new Plant(diagram);
        this.mock = new MockPlant(diagram);
    }

    start(): void {
        this.snapshot.clear();
        this.api.graph.getCells().forEach((cell) => this.snapshot.set(cell.id, cell.get('data')));
        // A new run starts a new log.
        logEntriesStore.set([]);
        markedTagStore.set(null);
        this.stopLogging = (['update', 'command'] as const).map((kind) => this.plant.on(kind, (message) => this.log({ ...message, kind, id: this.nextEntryId++ })));
        this.mock.start(this.plant);
        this.syncFlows();
        plantStore.set(this.plant);
        window.plant = this.plant;
    }

    stop(): void {
        this.mock.stop();
        this.stopLogging.forEach((stop) => stop());
        this.stopLogging = [];
        this.restore();
        plantStore.set(null);
        markedTagStore.set(null);
        window.plant = null;
    }

    protected cells(): PlantCell[] {
        return this.api.graph.getCells().flatMap((cell) => plantCellOf(cell) ?? []);
    }

    /** The cell of the tag as it is now; the tags indexed once a tick (a burst of updates in one task). */
    protected cellOfTag(tag: string): PlantCell | undefined {
        if (!this.tagIds) {
            this.tagIds = new Map([...indexByTag(this.cells())].map(([each, cell]) => [each, cell.id]));
            queueMicrotask(() => {
                this.tagIds = null;
            });
        }
        const id = this.tagIds.get(tag);
        const cell = id === undefined ? undefined : this.api.graph.getCell(id);
        return cell ? plantCellOf(cell) ?? undefined : undefined;
    }

    protected log(entry: LogEntry): void {
        logEntriesStore.set((entries) => withEntry(entries, entry));
    }

    /** A new data of a cell, off the history; the look of a link made of it. The flows follow (once per change). */
    protected write(id: CellKey, data: ShapeData): void {
        const cell = this.api.graph.getCell(id);
        if (!cell) {
            return;
        }
        if (cell.isLink()) {
            this.api.setCell(id, (previous) => withConnectionLook({ ...previous, data }), PLANT_WRITE);
        } else {
            this.api.setCellData(id, data, PLANT_WRITE);
        }
        this.scheduleFlowSync();
    }

    protected scheduleFlowSync(): void {
        if (this.isFlowSyncScheduled) {
            return;
        }
        this.isFlowSyncScheduled = true;
        queueMicrotask(() => {
            this.isFlowSyncScheduled = false;
            if (this.mock.isRunning) {
                this.syncFlows();
            }
        });
    }

    /** The pipes flowing, the wires live: as the plant is now. */
    protected syncFlows(): void {
        flowWrites(this.cells()).forEach(({ id, data }) => {
            if (this.api.graph.getCell(id)) {
                this.api.setCell(id, (previous) => withConnectionLook({ ...previous, data }), PLANT_WRITE);
            }
        });
    }

    /** The data of the cells as they were before the run. */
    protected restore(): void {
        this.api.graph.getCells().forEach((cell) => {
            if (!this.snapshot.has(cell.id)) {
                return;
            }
            const data = this.snapshot.get(cell.id);
            if (cell.get('data') === data) {
                return;
            }
            if (cell.isLink()) {
                this.api.setCell(cell.id, (previous) => withConnectionLook({ ...previous, data }), PLANT_WRITE);
            } else if (isShapeData(data)) {
                this.api.setCellData(cell.id, data, PLANT_WRITE);
            }
        });
        this.snapshot.clear();
    }
}
