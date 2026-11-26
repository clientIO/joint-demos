import type { ElementRecord, LinkRecord } from '@joint/react-plus';
import { CONNECTIONS, isConnectionKind, withConnectionLook, type ConnectionData, type ConnectionKind } from '../connections/connections';
import { isLayer, type Layer } from '../plant/layers';
import { portMapOf, shapePortsOf } from '../shapes/geometry';
import type { DiagramImages } from '../shapes/images';
import { specOf } from '../shapes/registry';
import type { DiagramStyle } from '../shapes/style';
import type { ShapeData, ShapeSpec } from '../shapes/types';
import { nextTag, seriesOf } from '../editor/new-cells';
import {
    animationsOf,
    diagramStyleOf,
    favoritesOf,
    imagesOf,
    isCellId,
    isFiniteNumber,
    isObject,
    numberOf,
    validAttributesOf,
    type AnimationLevel,
    type Json,
} from './guards';

export type { AnimationLevel } from './guards';

/*
 * The diagram as a file: the JSON the TypeScript version saves and opens (`graph.toJSON()` of its shapes), so a
 * diagram moves between the two. A cell of the file is a model of a shape: its geometry, its type and its own
 * attributes (`tag`, `label`, `style`, `data`, ...). Here it is a record: the geometry stays, the type and the
 * attributes go into `data` (the file's `data` - the plant values - into `data.plant`), the ports and the look of
 * the links are made from the kind.
 *
 * Opening is all or nothing (as `graph.fromJSON()`): a cell of a kind the editor doesn't know, a cell without an
 * id, a link to a cell the file doesn't have - the file is refused before anything changes. A value of a known
 * attribute that is not valid is dropped (Auto); a duplicate ID gets the next free one of its series.
 */

/** A cell of the diagram. */
export type DiagramCell = ElementRecord<ShapeData> | LinkRecord<ConnectionData>;

/** A diagram: its cells, uploaded images, favorite shapes, style and animation level. */
export interface Diagram {
    readonly cells: readonly DiagramCell[];
    readonly images: DiagramImages;
    readonly favorites: readonly string[];
    readonly style: DiagramStyle;
    readonly animations: AnimationLevel;
}

// The attributes of a model that are geometry or the library's (kept on the record, or made again).
const ELEMENT_KEYS = new Set(['id', 'type', 'position', 'size', 'angle', 'z', 'layer', 'parent', 'embeds', 'attrs', 'ports', 'markup']);
const LINK_KEYS = new Set(['id', 'type', 'source', 'target', 'vertices', 'z', 'layer', 'parent', 'embeds', 'attrs', 'markup', 'router', 'connector', 'labels']);
// The file's equipment layer is the graph's default one here.
const FILE_EQUIPMENT_LAYER = 'equipment';
const EQUIPMENT_LAYER: Layer = 'cells';
// The attributes of a link end a file keeps beyond its cell or point: what it connects to, how.
const END_NAMED_KEYS = ['anchor', 'connectionPoint', 'connectionStrategy'] as const;

/** Why a file is not opened: the message says what in it is wrong. */
export class DiagramFileError extends Error {
    override readonly name = 'DiagramFileError';
}

function layerOfFile(value: unknown, fallback: Layer): Layer {
    if (value === FILE_EQUIPMENT_LAYER) {
        return EQUIPMENT_LAYER;
    }
    return isLayer(value) ? value : fallback;
}

/** The model's own attributes as the record's data, checked: the type its kind, the plant values (`data`) under `plant`. */
function attributesOfModel(model: Json, skipped: ReadonlySet<string>): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(model)) {
        if (!skipped.has(key)) {
            attributes[key === 'data' ? 'plant' : key] = value;
        }
    }
    return validAttributesOf(attributes);
}

type LinkEnd = NonNullable<LinkRecord['source']>;

/** A point of a file, if it is one (finite coordinates). */
function pointOf(value: unknown): { readonly x: number; readonly y: number } | undefined {
    if (!isObject(value)) {
        return undefined;
    }
    const x = numberOf(value.x);
    const y = numberOf(value.y);
    return x === undefined || y === undefined ? undefined : { x, y };
}

/** A named function of an end (an anchor, a connection point) as the file has it: by its name, with its arguments. */
function namedOf(value: unknown): { readonly name: string; readonly args?: Json } | undefined {
    if (!isObject(value) || typeof value.name !== 'string') {
        return undefined;
    }
    return isObject(value.args) ? { name: value.name, args: value.args } : { name: value.name };
}

/** An end of a link of the file: connected to a cell of the file (its port, anchor, ...), or a point; throws otherwise. */
function linkEndOf(value: unknown, ids: ReadonlySet<string>, linkId: string, end: 'source' | 'target'): LinkEnd {
    if (isObject(value) && isCellId(value.id)) {
        const id = String(value.id);
        if (!ids.has(id)) {
            throw new DiagramFileError(`the ${end} of the link "${linkId}" is the cell "${id}", which is not in the file`);
        }
        const named = Object.fromEntries(END_NAMED_KEYS.flatMap((key) => {
            const each = namedOf(value[key]);
            return each ? [[key, each]] : [];
        }));
        return {
            id,
            ...(isCellId(value.port) ? { port: String(value.port) } : {}),
            ...(typeof value.magnet === 'string' ? { magnet: value.magnet } : {}),
            ...named,
        };
    }
    const point = pointOf(value);
    if (!point) {
        throw new DiagramFileError(`the ${end} of the link "${linkId}" is neither a cell nor a point`);
    }
    return point;
}

/** The record of a link of the file. */
function linkOfModel(model: Json, kind: ConnectionKind, id: string, ids: ReadonlySet<string>): LinkRecord<ConnectionData> {
    const spec = CONNECTIONS[kind];
    const data: ConnectionData = { ...spec.defaults, ...attributesOfModel(model, LINK_KEYS), kind };
    const vertices = Array.isArray(model.vertices) ? model.vertices.flatMap((vertex: unknown) => pointOf(vertex) ?? []) : undefined;
    const record: LinkRecord<ConnectionData> = {
        id,
        type: 'link',
        source: linkEndOf(model.source, ids, id, 'source'),
        target: linkEndOf(model.target, ids, id, 'target'),
        layer: layerOfFile(model.layer, spec.layer),
        data,
        ...(vertices ? { vertices } : {}),
        ...(isFiniteNumber(model.z) ? { z: model.z } : {}),
    };
    return withConnectionLook(record);
}

/** The size of an element of the file: its own when both sides are positive numbers, its kind's otherwise. */
function sizeOfModel(model: Json, spec: ShapeSpec): { readonly width: number; readonly height: number } {
    if (!isObject(model.size)) {
        return spec.size;
    }
    const width = numberOf(model.size.width);
    const height = numberOf(model.size.height);
    return width !== undefined && height !== undefined && width > 0 && height > 0 ? { width, height } : spec.size;
}

/** The record of an element of the file. */
function elementOfModel(model: Json, spec: ShapeSpec, id: string): ElementRecord<ShapeData> {
    // The defaults of its kind under what the file says (a file leaves out what is the default, as vanilla does).
    const own = attributesOfModel(model, ELEMENT_KEYS);
    const defaults = spec.defaults ?? {};
    const ownLabel = isObject(own.label) ? own.label : undefined;
    const ownPlant = isObject(own.plant) ? own.plant : undefined;
    const data: ShapeData = {
        ...defaults,
        ...own,
        kind: spec.kind,
        ...(defaults.label || ownLabel ? { label: { ...defaults.label, ...ownLabel } } : {}),
        ...(defaults.plant || ownPlant ? { plant: { ...defaults.plant, ...ownPlant } } : {}),
    };
    const size = sizeOfModel(model, spec);
    return {
        id,
        type: 'element',
        position: pointOf(model.position) ?? { x: 0, y: 0 },
        size,
        angle: numberOf(model.angle) ?? 0,
        layer: layerOfFile(model.layer, spec.layer),
        portMap: portMapOf(shapePortsOf(spec, data, size)),
        data,
        ...(isFiniteNumber(model.z) ? { z: model.z } : {}),
    };
}

/** The id of a model of the file; throws when it has none. */
function idOfModel(model: Json, index: number): string {
    if (!isCellId(model.id)) {
        throw new DiagramFileError(`the cell ${index + 1} has no id`);
    }
    return String(model.id);
}

/** The record of a cell of the file (its parent left out: set once every cell is known); throws when it is not one. */
function cellOfModel(model: Json, id: string, ids: ReadonlySet<string>): DiagramCell {
    const kind = model.type;
    if (isConnectionKind(kind)) {
        return linkOfModel(model, kind, id, ids);
    }
    const spec = specOf(kind);
    if (!spec) {
        throw new DiagramFileError(`the cell "${id}" is of the kind "${String(kind)}", which this editor doesn't know`);
    }
    return elementOfModel(model, spec, id);
}

/** The cells with an ID each of its own: a duplicate gets the next free one of its series (the first keeps it). */
export function withUniqueTags<T extends { readonly data?: ShapeData }>(cells: readonly T[]): T[] {
    const used = new Set(cells.flatMap((cell) => cell.data?.tag ?? []));
    const seen = new Set<string>();
    return cells.map((cell) => {
        const tag = cell.data?.tag;
        if (!cell.data || tag === undefined) {
            return cell;
        }
        if (!seen.has(tag)) {
            seen.add(tag);
            return cell;
        }
        const free = nextTag(seriesOf(tag) ?? 'ID', used);
        used.add(free);
        seen.add(free);
        return { ...cell, data: { ...cell.data, tag: free } };
    });
}

/** The models of the file's cells with their ids; throws on a cell that is not an object, without an id, or a duplicate id. */
function identifiedModelsOf(cells: readonly unknown[]): ReadonlyArray<readonly [Json, string]> {
    const ids = new Set<string>();
    return cells.map((model, index) => {
        if (!isObject(model)) {
            throw new DiagramFileError(`the cell ${index + 1} is not an object`);
        }
        const id = idOfModel(model, index);
        if (ids.has(id)) {
            throw new DiagramFileError(`two cells have the id "${id}"`);
        }
        ids.add(id);
        return [model, id] as const;
    });
}

/** Throws when cells are each other's ancestors (A in B, B in A): the chains of the groups would never end. */
function rejectParentLoops(cells: ReadonlyArray<{ readonly id?: unknown; readonly parent?: unknown }>): void {
    const parents = new Map(cells.map((cell) => [cell.id, cell.parent]));
    for (const { id } of cells) {
        const seen = new Set<unknown>([id]);
        for (let parent = parents.get(id); parent !== undefined; parent = parents.get(parent)) {
            if (seen.has(parent)) {
                throw new DiagramFileError(`its groups contain each other (${String(id)})`);
            }
            seen.add(parent);
        }
    }
}

/** The diagram of a file (parsed JSON); throws a `DiagramFileError`, before anything changes, when it is not a diagram. */
export function diagramOfFile(json: unknown): Diagram {
    if (!isObject(json) || !Array.isArray(json.cells)) {
        throw new DiagramFileError('it has no cells');
    }
    const models = identifiedModelsOf(json.cells);
    const ids = new Set(models.map(([, id]) => id));
    const cells = models.map(([model, id]) => {
        const cell = cellOfModel(model, id, ids);
        // A parent the file doesn't have, or the cell itself: in no group.
        const parent = isCellId(model.parent) ? String(model.parent) : undefined;
        return parent !== undefined && parent !== id && ids.has(parent) ? { ...cell, parent } : cell;
    });
    rejectParentLoops(cells);
    return {
        cells: withUniqueTags(cells),
        images: imagesOf(json.images),
        favorites: favoritesOf(json.favorites),
        style: diagramStyleOf(json.style),
        animations: animationsOf(json.animations),
    };
}

// The attributes of a record made from its kind, not saved: the ports of an element, the look of a link.
const DERIVED_KEYS = new Set(['portMap', 'ports', 'markup', 'attrs', 'router', 'connector']);

/** The model of a record as the file stores it (the data spread back, its plant values as `data`). */
function modelOfCell(cell: Json): Json {
    const model: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(cell)) {
        if (key !== 'data' && !DERIVED_KEYS.has(key)) {
            model[key] = value;
        }
    }
    if (cell.layer === EQUIPMENT_LAYER) {
        model.layer = FILE_EQUIPMENT_LAYER;
    }
    if (!isObject(cell.data)) {
        return model;
    }
    for (const [key, value] of Object.entries(cell.data)) {
        if (key === 'kind') {
            model.type = value;
        } else {
            model[key === 'plant' ? 'data' : key] = value;
        }
    }
    return model;
}

/** The file of a diagram (its cells as the graph exports them): the JSON both versions open. */
export function fileOfDiagram(diagram: Omit<Diagram, 'cells'> & { readonly cells: readonly unknown[] }): Json {
    return {
        cells: diagram.cells.filter(isObject).map(modelOfCell),
        images: diagram.images,
        favorites: diagram.favorites,
        style: diagram.style,
        animations: diagram.animations,
    };
}
