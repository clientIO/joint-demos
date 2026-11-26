import type { ShapeData } from '../shapes/types';
import { indexByTag, type CellKey, type PlantCell, type PlantDiagram } from './plant';

/** A diagram in memory for the tests of the plant: its cells by their ids, written in place. */
export interface TestDiagram extends PlantDiagram {
    readonly dataOf: (id: CellKey) => ShapeData;
    readonly writes: CellKey[];
}

export function testDiagram(cells: readonly PlantCell[]): TestDiagram {
    const byId = new Map(cells.map((cell) => [cell.id, cell]));
    const writes: CellKey[] = [];
    const all = () => [...byId.values()];
    return {
        cells: all,
        cellOfTag: (tag) => indexByTag(all()).get(tag),
        write: (id, data) => {
            const cell = byId.get(id);
            if (cell) {
                byId.set(id, { ...cell, data });
                writes.push(id);
            }
        },
        dataOf: (id) => {
            const cell = byId.get(id);
            if (!cell) {
                throw new Error(`no cell ${String(id)}`);
            }
            return cell.data;
        },
        writes,
    };
}

/** An element of the kind with its ID and plant values. */
export const element = (id: string, kind: string, plant: ShapeData['plant'] = {}, attributes: Partial<ShapeData> = {}): PlantCell => ({
    id,
    isLink: false,
    data: { kind, tag: id, plant, ...attributes },
});

/** A link of the kind between two cells. */
export const link = (id: string, kind: string, source: string, target: string, attributes: Partial<ShapeData> = {}): PlantCell => ({
    id,
    isLink: true,
    data: { kind, ...attributes },
    source,
    target,
});

/** A sequence of random numbers, repeated. */
export function sequence(...values: number[]): () => number {
    let index = 0;
    return () => values[index++ % values.length];
}
