import { createContext, Fragment, useContext, useId, useLayoutEffect, type ReactNode } from 'react';
import { isFinish, outlineWidthPx, useDiagramStyle, type CellStyle, type Finish } from './style';
import type { ShapeSpec } from './types';

/*
 * The surfaces of an element: brushed steel lit from the top left, in the element's color and finish. Shaded,
 * a surface is a gradient (its stops mixed with the color); flat, the color as it is, every surface outlined
 * (the ISA-101 high-performance look). The colors are the `--shape-*` variables of `shapes.css`.
 *
 * The gradients are shared in a paper (see `SurfaceDefsProvider`): the ones of the metal and the materials once, the
 * tinted ones once per color - not a set in every element. Outside a paper (a preview of the palette) an element
 * has its own.
 */

/** The outline of the metal parts: the shaded edge, so the outline blends into it. */
export const METAL_STROKE = 'var(--shape-metal-stroke)';
// The outline of the flat finish: the edge of the metal.
const FLAT_STROKE = 'var(--shape-flat-stroke)';
// A shaded surface made flat: the middle tone of its shading.
const FLAT_SHADING = 'var(--shape-metal-5)';
/** The default color of a surface: the metal as it is. */
export const SURFACE_COLOR = 'var(--shape-metal-3)';
// How much of the color there is in a surface (%): more flattens the shading.
const TINT = 55;

type Stops = ReadonlyArray<readonly [offset: string, color: string]>;

const METAL_STOPS: Stops = [
    ['0%', 'var(--shape-metal-1)'],
    ['10%', 'var(--shape-metal-2)'],
    ['24%', 'var(--shape-metal-3)'],
    ['32%', 'var(--shape-metal-4)'],
    ['48%', 'var(--shape-metal-5)'],
    ['78%', 'var(--shape-metal-6)'],
    ['100%', 'var(--shape-metal-7)'],
];
const SPHERE_STOPS: Stops = [
    ['0%', 'var(--shape-sphere-1)'],
    ['40%', 'var(--shape-sphere-2)'],
    ['80%', 'var(--shape-sphere-3)'],
    ['100%', 'var(--shape-sphere-4)'],
];
const PLATE_STOPS: Stops = [
    ['0%', 'var(--shape-plate-1)'],
    ['45%', 'var(--shape-plate-2)'],
    ['100%', 'var(--shape-plate-3)'],
];
const COPPER_STOPS: Stops = [
    ['0%', 'var(--shape-copper-1)'],
    ['35%', 'var(--shape-copper-2)'],
    ['100%', 'var(--shape-copper-3)'],
];
const PORCELAIN_STOPS: Stops = [
    ['0%', 'var(--shape-porcelain-1)'],
    ['35%', 'var(--shape-porcelain-2)'],
    ['100%', 'var(--shape-porcelain-3)'],
];
const GLASS_STOPS: Stops = [
    ['0%', 'var(--shape-glass-1)'],
    ['100%', 'var(--shape-glass-2)'],
];

/** The shaded surfaces of the metal, by their form. */
export type ShadedSurface = 'cylinder' | 'pipe' | 'sphere' | 'cone' | 'plate';
/** The flat surfaces of the metal: the light ones, the details (a stem, a shaft, the feet). */
export type FlatSurface = 'flat' | 'flat-2' | 'dark' | 'mid' | 'pale';
/** A color of the shape's own (a CSS variable of the theme, a hex) a surface can have instead of the metal. */
export type SurfaceColor = `var(${string})` | `#${string}`;
/** The fill of a surface: a shading by its form, the flat metal, or a color of the shape. */
export type SurfaceFill = ShadedSurface | FlatSurface | SurfaceColor;
/** The outline of a surface: the edge of the metal, or a color of the shape. */
export type SurfaceStroke = 'edge' | SurfaceColor;
/** A material other than the metal, in its own colors: shaded, or its middle tone when flat. */
export type Material = 'copper' | 'porcelain' | 'glass';

const FLAT_SURFACES: Record<FlatSurface, string> = {
    flat: 'var(--shape-metal-flat)',
    'flat-2': 'var(--shape-metal-flat-2)',
    dark: 'var(--shape-metal-dark)',
    mid: 'var(--shape-metal-mid)',
    pale: 'var(--shape-metal-pale)',
};
// The details of the metal: in a darker tone of the color, kept when flat.
const DETAILS: ReadonlySet<FlatSurface> = new Set(['dark', 'mid', 'pale']);
const MATERIAL_FLAT: Record<Material, string> = {
    copper: 'var(--shape-copper-2)',
    porcelain: 'var(--shape-porcelain-2)',
    glass: 'var(--shape-glass-2)',
};

const isFlatSurface = (fill: SurfaceFill): fill is FlatSurface => Object.hasOwn(FLAT_SURFACES, fill);
const isSurfaceColor = (value: string): value is SurfaceColor => value.startsWith('var(') || value.startsWith('#');
const isTint = (color: string | undefined): color is string => color !== undefined && color !== '' && color !== SURFACE_COLOR;
const tint = (color: string, base: string): string => `color-mix(in oklab, ${color} ${TINT}%, ${base})`;

/** SVG presentation props of a surface: spread last onto the part, they override its own stroke. */
export interface SurfaceProps {
    readonly fill?: string;
    readonly stroke?: string;
    readonly strokeWidth?: number;
}

/** The surfaces of one element, as its symbol paints its parts. */
export interface Surface {
    /** Its finish: its own, else the diagram's. */
    readonly finish: Finish;
    /** The fill of a part (and its outline when the element is outlined). */
    readonly fill: (fill: SurfaceFill) => SurfaceProps;
    /** The outline of a part. */
    readonly stroke: (stroke: SurfaceStroke) => SurfaceProps;
    /** The fill of a part of a material (copper, porcelain, glass). */
    readonly material: (material: Material) => SurfaceProps;
    /** A color of its style (its accent, its outline) or the part's own when it has none. */
    readonly styled: (key: 'color' | 'outline' | 'accent', own: string) => string;
    /** Its outline width in px when it has an outline of its own; `undefined` otherwise (the part's own). */
    readonly outlineWidth: number | undefined;
    /** The gradients its shaded surfaces use, rendered inside the element: none when the paper shares them. */
    readonly defs: ReactNode;
}

function stopsOf(stops: Stops, color: string | undefined): ReactNode {
    return stops.map(([offset, stop]) => <stop key={offset} offset={offset} stopColor={isTint(color) ? tint(color, stop) : stop} />);
}

/** The gradients of the metal in the color (the metal as it is: none): its forms. */
function metalGradientsOf(id: string, color: string | undefined): ReactNode {
    return (
        <Fragment key={id}>
            <linearGradient id={`${id}-cylinder`}>{stopsOf(METAL_STOPS, color)}</linearGradient>
            <linearGradient id={`${id}-pipe`} x1="0%" y1="0%" x2="0%" y2="100%">{stopsOf(METAL_STOPS, color)}</linearGradient>
            <radialGradient id={`${id}-sphere`} cx="50%" cy="50%" r="50%" fx="35%" fy="30%">{stopsOf(SPHERE_STOPS, color)}</radialGradient>
            <linearGradient id={`${id}-cone`} gradientTransform="rotate(-10)">{stopsOf(METAL_STOPS, color)}</linearGradient>
            <linearGradient id={`${id}-plate`} x1="0%" y1="0%" x2="100%" y2="100%">{stopsOf(PLATE_STOPS, color)}</linearGradient>
        </Fragment>
    );
}

/** The gradients of the materials: in their own colors, never tinted. */
function materialGradientsOf(id: string): ReactNode {
    return (
        <Fragment key={`${id}-materials`}>
            <linearGradient id={`${id}-copper`} x1="0%" y1="0%" x2="0%" y2="100%">{stopsOf(COPPER_STOPS, undefined)}</linearGradient>
            <linearGradient id={`${id}-porcelain`}>{stopsOf(PORCELAIN_STOPS, undefined)}</linearGradient>
            <radialGradient id={`${id}-glass`} cx="35%" cy="35%" r="70%">{stopsOf(GLASS_STOPS, undefined)}</radialGradient>
        </Fragment>
    );
}

/** An id of this element, safe inside `url(#...)`: its gradients are its own, in the palette and an export too. */
function useSvgId(prefix: string): string {
    return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}

// The ids of the shared gradients: of the metal as it is, of the materials, of the metal in a color.
const SHARED_ID = 'scada-surface';
const METAL_ID = `${SHARED_ID}-metal`;
const MATERIAL_ID = `${SHARED_ID}-material`;

/** A short id of a color, safe inside `url(#...)` (a CSS variable, a hex, `color-mix()`). */
function colorKeyOf(color: string): string {
    let hash = 0;
    for (let index = 0; index < color.length; index++) {
        hash = (Math.imul(hash, 31) + color.charCodeAt(index)) | 0;
    }
    return (hash >>> 0).toString(36);
}

/** The id of the shared gradients of the metal in the color (as it is: none). */
const sharedMetalIdOf = (color: string | undefined): string => (isTint(color) ? `${SHARED_ID}-${colorKeyOf(color)}` : METAL_ID);

/** The colors whose shared gradients a paper has: each kept while an element in it is tinted with it. */
export interface SurfaceDefs {
    /** The color used by an element (the metal as it is: `undefined`); the returned function releases it. */
    readonly retain: (color: string | undefined) => () => void;
    readonly subscribe: (listener: () => void) => () => void;
    /** The tint colors in use, in the order they were first used (kept as it is until it changes). */
    readonly getColors: () => readonly string[];
}

/** New shared gradients of a paper, no color in use. */
export function createSurfaceDefs(): SurfaceDefs {
    const counts = new Map<string, number>();
    const listeners = new Set<() => void>();
    let colors: readonly string[] = [];
    const update = () => {
        colors = [...counts.keys()];
        listeners.forEach((listener) => listener());
    };
    return {
        retain: (color) => {
            if (!isTint(color)) {
                return () => {};
            }
            const count = counts.get(color) ?? 0;
            counts.set(color, count + 1);
            if (count === 0) {
                update();
            }
            return () => {
                const left = (counts.get(color) ?? 1) - 1;
                if (left > 0) {
                    counts.set(color, left);
                    return;
                }
                counts.delete(color);
                update();
            };
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getColors: () => colors,
    };
}

/** The shared gradients of the paper the elements are drawn in (none: each element has its own). */
export const SurfaceDefsContext = createContext<SurfaceDefs | null>(null);

/** The shared gradients of the colors, once each: of the metal and the materials, of the metal in each color. */
export function sharedGradientsOf(colors: readonly string[]): ReactNode {
    return [metalGradientsOf(METAL_ID, undefined), materialGradientsOf(MATERIAL_ID), ...colors.map((color) => metalGradientsOf(sharedMetalIdOf(color), color))];
}

/**
 * The surfaces of an element of the kind, in its style over the diagram's: the finish, the color mixed into the
 * metal, the outline (its own, or the edge of the flat finish) and its width.
 */
export function useSurface(spec: Pick<ShapeSpec, 'colorField' | 'hasFinish'>, style: CellStyle | undefined): Surface {
    const diagram = useDiagramStyle();
    const ownId = useSvgId('surface');
    const surfaceDefs = useContext(SurfaceDefsContext);
    const finish: Finish = isFinish(style?.finish) ? style.finish : isFinish(diagram.finish) ? diagram.finish : 'shaded';
    // The color of a part only (a thermometer's liquid) tints no surface.
    const color = spec.colorField?.isPart ? undefined : style?.color;
    const ownOutline = style?.outline ? style.outline : undefined;
    const outline = ownOutline ?? (spec.hasFinish && finish === 'flat' ? FLAT_STROKE : undefined);
    const outlinePx = outlineWidthPx(style?.outlineWidth ?? diagram.outlineWidth);
    const outlined: SurfaceProps = outline ? { stroke: outline, strokeWidth: outlinePx } : {};
    const isFlat = finish === 'flat';
    const isShared = surfaceDefs !== null;
    const metalId = isShared ? sharedMetalIdOf(color) : ownId;
    const materialId = isShared ? MATERIAL_ID : ownId;
    const url = (name: string) => `url(#${metalId}-${name})`;

    // The gradients of its color kept in the paper while it is shaded in it.
    useLayoutEffect(() => (surfaceDefs && !isFlat ? surfaceDefs.retain(color) : undefined), [surfaceDefs, isFlat, color]);

    const fill = (part: SurfaceFill): SurfaceProps => {
        if (isFlat && isTint(color) && !(isFlatSurface(part) && DETAILS.has(part))) {
            return { fill: color, ...outlined };
        }
        const flat = isSurfaceColor(part) ? part : isFlatSurface(part) ? FLAT_SURFACES[part] : undefined;
        if (flat !== undefined || isFlat) {
            const base = flat ?? FLAT_SHADING;
            return { fill: isTint(color) ? tint(color, base) : base, ...outlined };
        }
        return { fill: url(part), ...outlined };
    };

    const stroke = (part: SurfaceStroke): SurfaceProps => {
        if (outline) {
            // A shape whose color is its outline (a gauge's frame) keeps the width it draws.
            return spec.colorField?.key === 'outline' ? { stroke: outline } : { stroke: outline, strokeWidth: outlinePx };
        }
        const base = isSurfaceColor(part) ? part : METAL_STROKE;
        return { stroke: isTint(color) ? tint(color, base) : base };
    };

    const material = (part: Material): SurfaceProps => ({ fill: isFlat ? MATERIAL_FLAT[part] : `url(#${materialId}-${part})` });

    const styled = (key: 'color' | 'outline' | 'accent', own: string): string => style?.[key] || own;

    const defs = isFlat || isShared ? null : (
        <defs>
            {metalGradientsOf(ownId, color)}
            {materialGradientsOf(ownId)}
        </defs>
    );

    return {
        finish,
        fill,
        stroke,
        material,
        styled,
        outlineWidth: ownOutline ? outlinePx : undefined,
        defs,
    };
}
