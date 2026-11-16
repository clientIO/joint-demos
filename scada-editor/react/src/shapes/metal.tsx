import { useId, type ReactNode } from 'react';

const METAL_STOPS: ReadonlyArray<readonly [offset: string, color: string]> = [
    ['0%', 'var(--shape-metal-1)'],
    ['10%', 'var(--shape-metal-2)'],
    ['24%', 'var(--shape-metal-3)'],
    ['32%', 'var(--shape-metal-4)'],
    ['48%', 'var(--shape-metal-5)'],
    ['78%', 'var(--shape-metal-6)'],
    ['100%', 'var(--shape-metal-7)'],
];
const SPHERE_STOPS: ReadonlyArray<readonly [string, string]> = [
    ['0%', 'var(--shape-sphere-1)'],
    ['40%', 'var(--shape-sphere-2)'],
    ['80%', 'var(--shape-sphere-3)'],
    ['100%', 'var(--shape-sphere-4)'],
];
const PLATE_STOPS: ReadonlyArray<readonly [string, string]> = [
    ['0%', 'var(--shape-plate-1)'],
    ['45%', 'var(--shape-plate-2)'],
    ['100%', 'var(--shape-plate-3)'],
];
/** The flat surfaces and the outlines of the metal (CSS colors, no gradient). */
export const METAL = {
    stroke: 'var(--shape-metal-stroke)',
    flat: 'var(--shape-metal-flat)',
    dark: 'var(--shape-metal-dark)',
    mid: 'var(--shape-metal-mid)',
    pale: 'var(--shape-metal-pale)',
    darkEdge: 'var(--shape-metal-dark-edge)',
} as const;

/**
 * The fills of the shaded surfaces of one element: `url(#...)` references to its
 * gradients. The shading is the TypeScript SCADA editor's brushed steel lit from
 * the top left; its stops are the colors of `vanilla-colors.css`, so it follows
 * the theme (blue steel in the dark one).
 */
export interface Metal {
    /** A vertical cylinder (a tank): shaded from the left to the right. */
    readonly cylinder: string;
    /** A horizontal cylinder (a pipe, a shell): shaded from the top to the bottom. */
    readonly pipe: string;
    /** A sphere (a pump casing, a valve body): the highlight up and to the left. */
    readonly sphere: string;
    /** A cone (the bottom of a silo): the cylinder's metal, tilted. */
    readonly cone: string;
    /** A flat plate (a panel): lit from the top left. */
    readonly plate: string;
    /** The gradients, to render inside the element. */
    readonly defs: ReactNode;
}

function stopsOf(stops: ReadonlyArray<readonly [string, string]>): ReactNode {
    return stops.map(([offset, color]) => <stop key={offset} offset={offset} stopColor={color} />);
}

/** An id unique to this element, safe inside `url(#...)`. */
export function useSvgId(prefix: string): string {
    return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}

/**
 * The gradients of one element, defined in it: its ids are its own, so the
 * element can be copied, exported and rendered in the palette alike.
 */
export function useMetal(): Metal {
    const id = useSvgId('metal');
    const url = (name: string) => `url(#${id}-${name})`;
    const defs = (
        <defs>
            <linearGradient id={`${id}-cylinder`}>{stopsOf(METAL_STOPS)}</linearGradient>
            <linearGradient id={`${id}-pipe`} x1="0%" y1="0%" x2="0%" y2="100%">{stopsOf(METAL_STOPS)}</linearGradient>
            <radialGradient id={`${id}-sphere`} cx="50%" cy="50%" r="50%" fx="35%" fy="30%">{stopsOf(SPHERE_STOPS)}</radialGradient>
            <linearGradient id={`${id}-cone`} gradientTransform="rotate(-10)">{stopsOf(METAL_STOPS)}</linearGradient>
            <linearGradient id={`${id}-plate`} x1="0%" y1="0%" x2="100%" y2="100%">{stopsOf(PLATE_STOPS)}</linearGradient>
        </defs>
    );
    return {
        cylinder: url('cylinder'),
        pipe: url('pipe'),
        sphere: url('sphere'),
        cone: url('cone'),
        plate: url('plate'),
        defs,
    };
}
