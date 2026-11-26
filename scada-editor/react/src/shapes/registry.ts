import { BACKGROUND_SHAPES } from './background';
import { BULK_SHAPES } from './bulk';
import { CHARTS_SHAPES } from './charts';
import { DIAGRAM_SHAPES } from './diagram';
import { ELECTRICAL_SHAPES } from './electrical';
import { INSTRUMENTS_SHAPES } from './instruments';
import { PIPING_SHAPES } from './piping';
import { PROCESS_SHAPES } from './process';
import { ROTATING_SHAPES } from './rotating';
import { STORAGE_SHAPES } from './storage';
import { STRUCTURES_SHAPES } from './structures';
import { VALVES_SHAPES } from './valves';
import type { PaletteGroup, ShapeSpec } from './types';

/** The sections of the palette, in order. */
export const PALETTE_GROUPS: readonly PaletteGroup[] = [
    'Piping',
    'Rotating Equipment',
    'Valves',
    'Process',
    'Storage',
    'Bulk Handling',
    'Structures',
    'Instruments',
    'Electrical',
    'Charts',
    'Background',
];

/** Every kind of element, in the order of the palette. */
export const SHAPE_LIST: readonly ShapeSpec[] = [
    ...PIPING_SHAPES,
    ...ROTATING_SHAPES,
    ...VALVES_SHAPES,
    ...PROCESS_SHAPES,
    ...STORAGE_SHAPES,
    ...BULK_SHAPES,
    ...STRUCTURES_SHAPES,
    ...INSTRUMENTS_SHAPES,
    ...ELECTRICAL_SHAPES,
    ...CHARTS_SHAPES,
    ...BACKGROUND_SHAPES,
];

// A kind's first palette entry is its spec (a table with a header); the others are presets of it.
const SHAPES: ReadonlyMap<string, ShapeSpec> = new Map([...DIAGRAM_SHAPES, ...SHAPE_LIST].reverse().map((spec) => [spec.kind, spec]));

/** The kind of element of the name, if the editor knows it. */
export function specOf(kind: unknown): ShapeSpec | undefined {
    return typeof kind === 'string' ? SHAPES.get(kind) : undefined;
}
