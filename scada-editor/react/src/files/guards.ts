import { isArrowhead, isRouting } from '../connections/connections';
import type { ImageEntry, DiagramImages } from '../shapes/images';
import { isFinish, isLabelContent, isLabelSize, isLineWidth, isOutlineWidth, type CellStyle, type DiagramStyle } from '../shapes/style';
import type { Flip, LabelPosition, ShapeLabel, TextAlign, TextStyle } from '../shapes/types';

/*
 * The guards of what a file (or the graph) holds: every value checked before the editor uses it, an invalid one
 * dropped (Auto) - a malformed file opens without what it got wrong, it does not break the editor.
 */

/** A JSON object of a file. */
export type Json = Readonly<Record<string, unknown>>;

/** How much of the plant moves in run mode: everything, or the alarms (and levels) only. */
export type AnimationLevel = 'full' | 'alarms';

/** Whether a value is a JSON object (not an array, not `null`). */
export const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whether a value is a number that can be drawn: not `NaN`, not infinite. */
export const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** A number, or a numeric string (a file may save a size as text); `undefined` otherwise. */
export function numberOf(value: unknown): number | undefined {
    const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    return isFiniteNumber(number) ? number : undefined;
}

/** A guard of the values of a list. */
const oneOf = <T extends string>(values: readonly T[]) => (value: unknown): value is T => values.some((each) => each === value);

const FLIPS: readonly Flip[] = ['x', 'y', 'xy'];
const LABEL_POSITIONS: readonly LabelPosition[] = ['bottom', 'top', 'left', 'right'];
const TEXT_STYLES: readonly TextStyle[] = ['italic', 'underline', 'line-through'];
const TEXT_ALIGNS: readonly TextAlign[] = ['left', 'middle', 'right'];

/** Whether a value is a flip of a shape. */
export const isFlip = oneOf(FLIPS);
/** Whether a value is a side of a label. */
export const isLabelPosition = oneOf(LABEL_POSITIONS);
/** Whether a value is a style of a text. */
export const isTextStyle = oneOf(TEXT_STYLES);
/** Whether a value is an alignment of a text. */
export const isTextAlign = oneOf(TEXT_ALIGNS);
/** Whether a value is an animation level. */
export const isAnimationLevel = oneOf<AnimationLevel>(['full', 'alarms']);

/** Whether a value is an id of a cell: a non-empty string, or a number (as a file may save it). */
export const isCellId = (value: unknown): value is string | number => (typeof value === 'string' && value !== '') || isFiniteNumber(value);

/** Whether a value is a data URL of an image: the only source an image of a diagram may have. */
export const isImageDataUrl = (value: unknown): value is string => typeof value === 'string' && value.startsWith('data:image/');

/** The key with the value when it passes the guard; nothing otherwise (the value dropped). */
function optional<K extends string, T>(key: K, value: unknown, guard: (field: unknown) => field is T): Partial<Record<K, T>> {
    const picked: Partial<Record<K, T>> = {};
    if (guard(value)) {
        picked[key] = value;
    }
    return picked;
}

const isString = (value: unknown): value is string => typeof value === 'string';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isOpacity = (value: unknown): value is number => isFiniteNumber(value) && value >= 0 && value <= 1;
const isPositive = (value: unknown): value is number => isFiniteNumber(value) && value > 0;
const isTextStyles = (value: unknown): value is readonly TextStyle[] => Array.isArray(value) && value.every(isTextStyle);

/** The style of a diagram: its valid keys. */
export function diagramStyleOf(value: unknown): DiagramStyle {
    if (!isObject(value)) {
        return {};
    }
    return {
        ...optional('finish', value.finish, isFinish),
        ...optional('color', value.color, isString),
        ...optional('outline', value.outline, isString),
        ...optional('outlineWidth', value.outlineWidth, isOutlineWidth),
        ...optional('accent', value.accent, isString),
        ...optional('labelSize', value.labelSize, isLabelSize),
        ...optional('labelColor', value.labelColor, isString),
        ...optional('labels', value.labels, isLabelContent),
        ...optional('canvas', value.canvas, isString),
        ...optional('canvasGradient', value.canvasGradient, isBoolean),
    };
}

/** The style of a cell: its valid keys. */
export function cellStyleOf(value: unknown): CellStyle {
    if (!isObject(value)) {
        return {};
    }
    return {
        ...optional('color', value.color, isString),
        ...optional('outline', value.outline, isString),
        ...optional('outlineWidth', value.outlineWidth, isOutlineWidth),
        ...optional('accent', value.accent, isString),
        ...optional('finish', value.finish, isFinish),
        ...optional('lineWidth', value.lineWidth, isLineWidth),
        ...optional('opacity', value.opacity, isOpacity),
    };
}

/** The label of a shape: its valid keys. */
export function labelOf(value: unknown): ShapeLabel {
    if (!isObject(value)) {
        return {};
    }
    return {
        ...optional('text', value.text, isString),
        ...optional('position', value.position, isLabelPosition),
        ...optional('offset', value.offset, isFiniteNumber),
        ...optional('size', value.size, isPositive),
        ...optional('weight', value.weight, isPositive),
        ...optional('styles', value.styles, isTextStyles),
        ...optional('align', value.align, isTextAlign),
    };
}

/** The attributes of a shape's data (of a file, of the graph) that the editor reads by key, and their guards. */
const DATA_GUARDS: Readonly<Record<string, (value: unknown) => boolean>> = {
    tag: (value) => typeof value === 'string' && value !== '',
    flip: isFlip,
    locked: isBoolean,
    routing: isRouting,
    sourceArrowhead: isArrowhead,
    targetArrowhead: isArrowhead,
    imageId: isString,
};

/**
 * The attributes of a shape checked: the label and the style reduced to their valid keys, the typed attributes
 * dropped when invalid (Auto), the others (of its own kind, read where they are drawn) as they are.
 */
export function validAttributesOf(attributes: Json): Record<string, unknown> {
    const valid: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'label') {
            valid.label = labelOf(value);
        } else if (key === 'style') {
            valid.style = cellStyleOf(value);
        } else if (key === 'plant') {
            if (isObject(value)) {
                valid.plant = value;
            }
        } else if (!Object.hasOwn(DATA_GUARDS, key) || DATA_GUARDS[key](value)) {
            valid[key] = value;
        }
    }
    return valid;
}

/** The image of an entry, if it is one: a data URL of an image and its natural size. */
export function imageOf(id: string, value: unknown): ImageEntry | undefined {
    if (!isObject(value) || !isImageDataUrl(value.href)) {
        return undefined;
    }
    const width = numberOf(value.width);
    const height = numberOf(value.height);
    if (width === undefined || height === undefined || width <= 0 || height <= 0) {
        return undefined;
    }
    return { href: value.href, width, height, name: typeof value.name === 'string' ? value.name : id };
}

/** The valid images of a value (a file's `images`, the graph's). */
export function imagesOf(value: unknown): DiagramImages {
    const images: Record<string, ImageEntry> = {};
    if (isObject(value)) {
        for (const [id, entry] of Object.entries(value)) {
            const image = imageOf(id, entry);
            if (image) {
                images[id] = image;
            }
        }
    }
    return images;
}

/** The favorite shapes of a value: its strings. */
export const favoritesOf = (value: unknown): readonly string[] => (Array.isArray(value) ? value.filter(isString) : []);

/** The animation level of a value: full unless it is the alarms only. */
export const animationsOf = (value: unknown): AnimationLevel => (isAnimationLevel(value) ? value : 'full');
