import type { CellId, CellRecord, Computed } from '@joint/react-plus';

/** Whether two id lists hold the same ids in the same order. */
export const isSameIds = (a: readonly CellId[], b: readonly CellId[]): boolean =>
    a.length === b.length && a.every((id, index) => id === b[index]);

/** Selects a cell's `data`. */
export const selectData = (cell: Computed<CellRecord>): unknown => cell.data;

/** What `connectedPortsOf()` reads of a cell: its type and, of a link, its ends. */
interface CellEnds {
    readonly type: string;
    readonly source?: Readonly<{ id?: CellId; port?: unknown }> | Readonly<{ x: number; y: number }>;
    readonly target?: Readonly<{ id?: CellId; port?: unknown }> | Readonly<{ x: number; y: number }>;
}

/** The ports of the element links are connected to, as one string (a primitive: no re-render unless it changes). */
export const connectedPortsOf = (cells: ReadonlyArray<CellEnds>, id: CellId): string => {
    const ports = new Set<string>();
    for (const cell of cells) {
        if (cell.type !== 'link') {
            continue;
        }
        for (const end of [cell.source, cell.target]) {
            if (end && 'id' in end && end.id === id && 'port' in end && end.port !== undefined) {
                ports.add(String(end.port));
            }
        }
    }
    return [...ports].sort().join(' ');
};
