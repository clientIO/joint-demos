import type { ComponentType } from 'react';
import type { Layer } from '../plant/layers';
import type { CellStyle } from './style';
import type { Surface } from './surface';

/** A side of an element's box. */
export type Side = 'left' | 'right' | 'top' | 'bottom';

/** How a shape is flipped: horizontally, vertically or both; none - as it is. */
export type Flip = 'x' | 'y' | 'xy';

/** Where the label of a shape is, on the side of the shape as it is seen: horizontal on a rotated shape. */
export type LabelPosition = 'bottom' | 'top' | 'left' | 'right';

/** A style of a text (several at once): its slant, its lines. */
export type TextStyle = 'italic' | 'underline' | 'line-through';

/** The alignment of a text in its box. */
export type TextAlign = 'left' | 'middle' | 'right';

/** The label of a shape: its text (the name), its side, how far it is; the Label shape also its font. */
export interface ShapeLabel {
    readonly text?: string;
    readonly position?: LabelPosition;
    /** How much further from the shape it is (px): clear of a pipe beside it. */
    readonly offset?: number;
    readonly size?: number;
    readonly weight?: number;
    readonly styles?: readonly TextStyle[];
    readonly align?: TextAlign;
}

/**
 * What the plant shows on a shape (named as the properties of the plant): running, open, a level, a reading,
 * the values of a chart; and their scale.
 */
export interface PlantValues {
    /** Running: 1, stopped: 0 (a pump, a motor, a beacon). */
    readonly power?: number;
    /** Open or closed (a valve, a breaker); how much open, 0 - 1 (a control valve). */
    readonly open?: boolean | number;
    /** A level, in % (a tank, a battery). */
    readonly level?: number;
    /** A reading: on a scale (a gauge), shown as a number (a display), or a text. */
    readonly value?: number | string;
    /** The values of a chart (numbers), the rows of a table (texts). */
    readonly values?: readonly unknown[];
    readonly min?: number;
    readonly max?: number;
    /** The warning levels: below `low`, above `high`. */
    readonly thresholds?: { readonly low?: number; readonly high?: number };
    /** The slices of a donut chart. */
    readonly slices?: readonly unknown[];
}

/**
 * Everything a cell of the diagram holds besides its geometry: its kind, its ID (the tag the plant uses), its
 * label, flip, style, the plant's values; and the attributes of its own kind (the unit of a display, the
 * columns of a table, ...).
 */
export interface ShapeData {
    /** The kind of the shape, a key of the registry: `Pump`, `LiquidTank`, `Pipe`. */
    readonly kind: string;
    /** The ID (the tag) the plant addresses the shape by: `P-101`. None - not a part of the plant. */
    readonly tag?: string;
    readonly label?: ShapeLabel;
    readonly flip?: Flip;
    readonly style?: CellStyle;
    readonly plant?: PlantValues;
    /** Locked while editing: the pointer goes through it, no link connects to it. */
    readonly locked?: boolean;
    /** The attributes of its own kind. */
    readonly [attribute: string]: unknown;
}

/** A pipe stub: out of a side, at a part of it (0 - 1 from the left, the top; the middle by default). */
export interface Stub {
    readonly id: string;
    readonly side: Side;
    readonly at?: number;
    /** Over the drawing of the shape (1), or under it (0, the default). */
    readonly z?: number;
}

/** An electrical terminal: a lead out of a side, at a part of it (the middle by default). */
export interface Terminal {
    readonly id: string;
    readonly side: Side;
    readonly at?: number;
}

/** The ports of a shape: its pipe stubs (and the branches of a manifold), its electrical terminals. */
export interface ShapePorts {
    /** How long the pipe stubs are, out of the shape. */
    readonly stubLength?: number;
    /** How far a stub reaches under the shape (a round body: no gap); 20 by default, 0 for a flat fitting. */
    readonly tuck?: number;
    readonly stubs?: readonly Stub[];
    readonly terminals?: readonly Terminal[];
}

/** How far the drawing of a shape reaches out of its box (its label below counted by default). */
export interface Overflow {
    readonly top?: number;
    readonly right?: number;
    readonly bottom?: number;
    readonly left?: number;
}

/** The constraints of resizing a shape. */
export interface ResizeOptions {
    readonly preserveAspectRatio?: boolean;
    readonly minWidth?: number;
    readonly minHeight?: number;
    readonly maxWidth?: number;
    readonly maxHeight?: number;
    /** The sides and corners it is resized by (all of them by default). */
    readonly directions?: ReadonlyArray<'top-left' | 'top' | 'top-right' | 'right' | 'bottom-right' | 'bottom' | 'bottom-left' | 'left'>;
}

/** The control operating a shape in run mode: start / stop, open / closed, a position slider. */
export type ControlKind = 'power' | 'toggle' | 'slider';

/** Where a pipe end is anchored on a shape without stubs: anywhere on its sides (on the grid), or their middles. */
export type Anchors = 'sides' | 'middles';

/** A color the user sets on a shape: where in its style, and the default when the shape has none. */
export interface ColorField {
    readonly key: 'color' | 'outline' | 'accent';
    /** The color the shape draws when none is set (Auto otherwise). */
    readonly defaultValue?: string;
    /** The color is of one part only (the liquid of a thermometer): the surfaces are not tinted with it. */
    readonly isPart?: boolean;
}

/** The section of the palette a shape is in. */
export type PaletteGroup =
    | 'Piping'
    | 'Rotating Equipment'
    | 'Valves'
    | 'Process'
    | 'Storage'
    | 'Bulk Handling'
    | 'Structures'
    | 'Instruments'
    | 'Electrical'
    | 'Charts'
    | 'Background';

/** Where and how the label is drawn below a shape not rotated: the shape's own place for it. */
export interface LabelPlacement {
    readonly x: number;
    readonly y: number;
    readonly anchor: 'start' | 'middle' | 'end';
    readonly verticalAnchor: 'top' | 'middle' | 'bottom';
}

/** What a symbol draws from: the size of the element, its data, its surfaces. */
export interface SymbolProps {
    readonly width: number;
    readonly height: number;
    readonly data: ShapeData;
    readonly surface: Surface;
}

/** A kind of element: how it is drawn, connected, labelled, styled and operated. */
export interface ShapeSpec {
    readonly kind: string;
    /** Its key in the palette when a kind has several entries (a table with and without a header); the kind by default. */
    readonly paletteId?: string;
    /** Its name in the palette and the inspector. */
    readonly title: string;
    readonly group: PaletteGroup;
    /** What it is, for the palette's tooltip and the inspector. */
    readonly description: string;
    readonly size: { readonly width: number; readonly height: number };
    /** The defaults of a new one: its label, plant values, attributes of its kind. */
    readonly defaults?: Partial<ShapeData>;
    /** The symbol: everything but the pipe stubs, the terminals and the label (drawn by the editor). */
    readonly Drawing: ComponentType<SymbolProps>;
    /** The ports: static, or made of the data and the size (the taps of a busbar). */
    readonly ports?: ShapePorts | ((data: ShapeData, size: { readonly width: number; readonly height: number }) => ShapePorts);
    /** `false`, `true` (down to half the default size), or constraints. */
    readonly resizable: boolean | ResizeOptions;
    /**
     * The shortest it can be made with links connected to the ports (their ids): a port made of its size (the tap
     * of a busbar) is kept while connected. None - its `resizable` constraints only.
     */
    readonly minWidthOf?: (connectedPorts: readonly string[]) => number;
    readonly rotatable: boolean;
    readonly flippable: Flip | null;
    readonly control: ControlKind | null;
    readonly anchors: Anchors;
    readonly layer: Layer;
    /** The start of its IDs (`P` for `P-101`); `null` - never an ID (a text, a zone). */
    readonly tagPrefix: string | null;
    /** A new one gets an ID (equipment); `false` - only when asked (a picture, a background shape). */
    readonly autoTag: boolean;
    /** How far the drawing reaches out of its box: fixed, or made of the data (a zone's tip side). */
    readonly overflow?: Overflow | ((data: ShapeData) => Overflow);
    /** Where its label is when it is below and the shape not rotated; `null` - no label. Below by default. */
    readonly label?: ((width: number, height: number) => LabelPlacement) | null;
    readonly colorField: ColorField | null;
    readonly outlineField: ColorField | null;
    readonly accentField: ColorField | null;
    /** Whether it has a finish (surfaces of the metal or parts of a material): shaded or flat. */
    readonly hasFinish: boolean;
}
