import { createContext, useContext } from 'react';
import type { dia } from '@joint/plus';
import { animationsOf, diagramStyleOf, favoritesOf, imagesOf, type AnimationLevel } from '../files/guards';
import type { DiagramImages } from '../shapes/images';
import type { DiagramStyle } from '../shapes/style';

/*
 * What a diagram holds besides its cells - its style, uploaded images, favorite shapes and animation level - kept
 * on the graph as its own attributes (`graph.set('style')`, as the TypeScript version keeps them): a change is a
 * step of the history (an undo brings the style back; deleting an image with its shapes is one step). The favorites
 * are a preference: saved with the diagram, not in the history.
 */

/** What a diagram holds besides its cells, saved with it: its style, images, favorite shapes, animation level. */
export interface DiagramMeta {
    readonly style: DiagramStyle;
    readonly images: DiagramImages;
    readonly favorites: readonly string[];
    readonly animations: AnimationLevel;
}

type MetaKey = keyof DiagramMeta;

const META_KEYS: readonly MetaKey[] = ['style', 'images', 'favorites', 'animations'];

/** The attributes of the graph the meta is kept in (the names of the TypeScript version). */
export const META_ATTRIBUTES = { style: 'style', images: 'images', favorites: 'favorites', animations: 'animations' } as const satisfies Record<MetaKey, string>;

/** The guards of the attributes: what the graph holds is read through them (a value of a file, of an undo). */
export const META_GUARDS: { readonly [K in MetaKey]: (value: unknown) => DiagramMeta[K] } = {
    style: diagramStyleOf,
    images: imagesOf,
    favorites: favoritesOf,
    animations: animationsOf,
};

/** The favorites are a preference of the user: not a step of the history. */
const PREFERENCE_WRITE = { skipHistory: true };

/** A diagram without style, images or favorites. */
export const EMPTY_META: DiagramMeta = { style: {}, images: {}, favorites: [], animations: 'full' };

/** The meta of the graph, read through its guards. */
export function metaOfGraph(graph: dia.Graph): DiagramMeta {
    return {
        style: META_GUARDS.style(graph.get(META_ATTRIBUTES.style)),
        images: META_GUARDS.images(graph.get(META_ATTRIBUTES.images)),
        favorites: META_GUARDS.favorites(graph.get(META_ATTRIBUTES.favorites)),
        animations: META_GUARDS.animations(graph.get(META_ATTRIBUTES.animations)),
    };
}

/** The attributes of the graph holding the meta. */
function attributesOfMeta(meta: Partial<DiagramMeta>): Record<string, unknown> {
    const attributes: Record<string, unknown> = {};
    for (const key of META_KEYS) {
        if (meta[key] !== undefined) {
            attributes[META_ATTRIBUTES[key]] = meta[key];
        }
    }
    return attributes;
}

/**
 * The meta written on the graph: the changed keys but the favorites in one step of the history, the favorites
 * apart (no step). Inside a `transaction()` the step is the transaction's.
 */
export function writeMeta(graph: dia.Graph, previous: DiagramMeta, next: DiagramMeta): void {
    const recorded = attributesOfMeta({
        ...(previous.style === next.style ? {} : { style: next.style }),
        ...(previous.images === next.images ? {} : { images: next.images }),
        ...(previous.animations === next.animations ? {} : { animations: next.animations }),
    });
    if (Object.keys(recorded).length > 0) {
        graph.set(recorded);
    }
    if (previous.favorites !== next.favorites) {
        graph.set(META_ATTRIBUTES.favorites, next.favorites, PREFERENCE_WRITE);
    }
}

/** The meta of an opened diagram set on the graph: not a step of the history (the history is reset with it). */
export function resetMeta(graph: dia.Graph, meta: DiagramMeta): void {
    graph.set(attributesOfMeta(meta), PREFERENCE_WRITE);
}

/** The diagram's own settings and the way to change them. */
export interface DiagramMetaApi {
    readonly meta: DiagramMeta;
    /** The meta changed (a step of the history, but the favorites): see `writeMeta()`. */
    readonly updateMeta: (update: (meta: DiagramMeta) => DiagramMeta) => void;
}

export const DiagramMetaContext = createContext<DiagramMetaApi>({ meta: EMPTY_META, updateMeta: () => {} });

/** The diagram's style, images, favorites and animation level, and the way to change them. */
export function useDiagramMeta(): DiagramMetaApi {
    return useContext(DiagramMetaContext);
}
