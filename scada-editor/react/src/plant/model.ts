import type { CellId, ElementRecord, LinkRecord, useGraph } from '@joint/react-plus';

/** What a pipe carries; `power` is an electrical wire. */
export type Medium = 'water' | 'steam' | 'fuel' | 'air' | 'power';

/** A kind of equipment, a key of the catalog. */
export type EquipmentKind =
    | 'pump'
    | 'compressor'
    | 'fan'
    | 'motor'
    | 'handValve'
    | 'controlValve'
    | 'checkValve'
    | 'boiler'
    | 'heatExchanger'
    | 'filter'
    | 'tank'
    | 'silo'
    | 'flowMeter'
    | 'pressureGauge'
    | 'thermometer'
    | 'display'
    | 'beacon'
    | 'generator'
    | 'transformer'
    | 'breaker';

/**
 * Everything an element shows. The plant owns the live values (`active`,
 * `level`, `value`, `alarm`); the editor owns the rest.
 */
export interface EquipmentData {
    readonly kind: EquipmentKind;
    /** The plant's tag, e.g. `P-101`: how the plant addresses the equipment. */
    readonly tag: string;
    readonly name: string;
    /** Running, open or closed (a breaker): whether it passes flow. */
    readonly active?: boolean;
    /** Tank fill, 0 to 100. */
    readonly level?: number;
    /** The reading of an instrument, the pressure of a boiler, the output of a generator. */
    readonly value?: number;
    readonly temperature?: number;
    /** The tag an instrument or beacon reads. */
    readonly source?: string;
    /** A command was sent and the plant has not confirmed it yet. */
    readonly pending?: boolean;
    readonly alarm?: boolean;
    /** Locked while editing: the pointer goes through it to what is below. */
    readonly locked?: boolean;
}

/** Everything a pipe (or a wire) holds: what it carries, whether it flows now. */
export interface PipeData {
    readonly medium: Medium;
    readonly flowing?: boolean;
}

/** An element of the diagram: a piece of equipment. */
export type EquipmentRecord = ElementRecord<EquipmentData>;
/** A link of the diagram: a pipe or a wire. */
export type PipeRecord = LinkRecord<PipeData>;
/** Any cell of the diagram. */
export type PlantRecord = EquipmentRecord | PipeRecord;
/** The diagram's graph, as `useGraph` gives it. */
export type Graph = ReturnType<typeof useGraph>['graph'];

/** One message between the operator and the plant, as a SCADA log shows it. */
export interface PlantMessage {
    readonly id: number;
    readonly time: number;
    readonly cellId: CellId;
    readonly tag: string;
    readonly property: string;
    readonly value: string;
    readonly direction: 'update' | 'command';
}

/** Whether a cell's data is an element's. */
export function isEquipmentData(data: unknown): data is EquipmentData {
    return typeof data === 'object' && data !== null && 'kind' in data && 'tag' in data;
}

/** Whether a cell's data is a pipe's. */
export function isPipeData(data: unknown): data is PipeData {
    return typeof data === 'object' && data !== null && 'medium' in data;
}
