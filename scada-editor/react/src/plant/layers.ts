import type { LayerRecord } from '@joint/react-plus';

/*
 * The graph has a layer for each kind of cell: the pipes are drawn under the
 * equipment they connect, the instruments (a gauge on a tank) over it, whatever
 * the order of adding. Front and back act within a layer.
 */

/** The layers, from the bottom one up. `cells` is the graph's default layer: the equipment. */
export const LAYERS = ['background', 'pipes', 'cells', 'instruments', 'foreground'] as const;
/** A layer of the graph. */
export type Layer = (typeof LAYERS)[number];

/** The names of the layers, as the menus show them. */
export const LAYER_NAMES: Record<Layer, string> = {
    background: 'Background',
    pipes: 'Pipes',
    cells: 'Equipment',
    instruments: 'Instruments',
    foreground: 'Foreground',
};

/** The graph's layers when it is created. */
export const INITIAL_LAYERS: ReadonlyArray<LayerRecord<Layer>> = LAYERS.map((id) => ({ id }));

/** Whether a value names a layer. */
export function isLayer(value: unknown): value is Layer {
    return LAYERS.some((layer) => layer === value);
}

/** The layer next to this one, up (1) or down (-1), if there is one. */
export function adjacentLayer(layer: Layer, direction: 1 | -1): Layer | undefined {
    return LAYERS[LAYERS.indexOf(layer) + direction];
}
