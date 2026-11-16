// Opening a saved plant. A file comes from the user's disk and may have been
// edited or crafted, so it is never loaded as it is: each cell is rebuilt from
// the few fields the editor saves, checked one by one, and its markup, size and
// ports come from the catalog. Anything else in the file (a link's markup, an
// `html` attribute) is dropped, so a file cannot inject script.
import { isEquipmentKind } from '../shapes/catalog';
import { createEquipment, createPipe } from './cells';
import { isLayer } from './layers';
import type { EquipmentData, Medium, PlantRecord } from './model';

/** Larger files are refused: parsing and rendering them would freeze the tab. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_CELLS = 2000;
const MEDIA: readonly Medium[] = ['water', 'steam', 'fuel', 'air', 'power'];

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields => typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isMedium = (value: unknown): value is Medium => MEDIA.some((medium) => medium === value);
const textOf = (value: unknown): string | undefined => (typeof value === 'string' ? value.slice(0, 80) : undefined);
const numberOf = (value: unknown): number | undefined => (isFiniteNumber(value) ? value : undefined);
const flagOf = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);
const idOf = (value: unknown): string | undefined => (typeof value === 'string' && value.length > 0 && value.length <= 80 ? value : undefined);

function pointOf(value: unknown): { x: number; y: number } | undefined {
    return isObject(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y) ? { x: value.x, y: value.y } : undefined;
}

/** The data an element saves: only the fields the editor and the plant know. */
function equipmentDataOf(value: Fields): Partial<EquipmentData> {
    return {
        tag: textOf(value.tag),
        name: textOf(value.name),
        active: flagOf(value.active),
        level: numberOf(value.level),
        value: numberOf(value.value),
        temperature: numberOf(value.temperature),
        source: textOf(value.source),
        locked: flagOf(value.locked),
    };
}

function elementOf(cell: Fields): PlantRecord | undefined {
    const id = idOf(cell.id);
    const position = pointOf(cell.position);
    const data = cell.data;
    if (!id || !position || !isObject(data) || typeof data.kind !== 'string' || !isEquipmentKind(data.kind)) {
        return undefined;
    }
    const { tag, ...rest } = equipmentDataOf(data);
    const definedFields = Object.fromEntries(Object.entries(rest).filter(([, field]) => field !== undefined));
    const record = createEquipment(data.kind, tag ?? id, position, definedFields);
    return { ...record, id, ...(isLayer(cell.layer) ? { layer: cell.layer } : {}) };
}

function endOf(value: unknown): { id: string; port: string } | { x: number; y: number } | undefined {
    if (!isObject(value)) {
        return undefined;
    }
    const id = idOf(value.id);
    const port = idOf(value.port);
    return id && port ? { id, port } : pointOf(value);
}

function linkOf(cell: Fields): PlantRecord | undefined {
    const id = idOf(cell.id);
    const source = endOf(cell.source);
    const target = endOf(cell.target);
    const medium = isObject(cell.data) && isMedium(cell.data.medium) ? cell.data.medium : undefined;
    if (!id || !source || !target || !medium) {
        return undefined;
    }
    const vertices = Array.isArray(cell.vertices) ? cell.vertices.map(pointOf).filter((point) => point !== undefined) : [];
    // A pipe end may be a point (a pipe disconnected from its equipment).
    return { ...createPipe(id, { id: '', port: '' }, { id: '', port: '' }, medium), source, target, vertices };
}

/**
 * The cells of a saved plant, rebuilt from the file's JSON, or the reason the
 * file can't be opened. Cells the editor can't read are skipped.
 */
export function plantFromJSON(json: unknown): { readonly cells: PlantRecord[] } | { readonly error: string } {
    if (!isObject(json) || !Array.isArray(json.cells)) {
        return { error: 'is not a saved plant.' };
    }
    if (json.cells.length > MAX_CELLS) {
        return { error: `has more than ${MAX_CELLS} cells.` };
    }
    const cells: PlantRecord[] = [];
    for (const cell of json.cells) {
        if (!isObject(cell)) {
            continue;
        }
        const record = cell.type === 'link' ? linkOf(cell) : elementOf(cell);
        if (record) {
            cells.push(record);
        }
    }
    // A pipe whose equipment was skipped would hang in the air: drop it too.
    const ids = new Set(cells.map((cell) => cell.id));
    const isEndKnown = (end: unknown) => !isObject(end) || typeof end.id !== 'string' || ids.has(end.id);
    return { cells: cells.filter((cell) => cell.type !== 'link' || (isEndKnown(cell.source) && isEndKnown(cell.target))) };
}
