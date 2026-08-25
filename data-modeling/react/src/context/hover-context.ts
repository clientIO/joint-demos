// Shared "what is hovered" state for relationship highlighting. Hovering a column
// (or a relationship link) lights up that relationship + the columns on both ends,
// so a dense diagram becomes readable. Provided inside <Diagram> so both the column
// rows and the link styler can read it.
//
// PERF: the highlighted sets live in an external STORE, not in the context value. The
// context only carries the store + the (stable) setters, so its value never changes —
// reading it never re-renders a consumer. Each column row subscribes to ONLY "is my
// column highlighted" (a boolean snapshot via `useIsColumnRelated`), so hovering a
// column re-renders just the 1–3 affected columns instead of every row on the board.

import { createContext, useContext, useSyncExternalStore } from 'react';
import type { CellId } from '@joint/react-plus';

export interface HoverState {
  // Column ids that should light up (the hovered column + every column it relates to).
  // The related LINKS aren't tracked here — HoverProvider paints them directly
  // through each link's LinkStyle.className.
  readonly relatedColumnIds: ReadonlySet<string>;
}

const EMPTY: ReadonlySet<string> = new Set();
const EMPTY_STATE: HoverState = { relatedColumnIds: EMPTY };

// A tiny external store so a consumer can subscribe to a narrow slice and re-render only
// when THAT slice changes (see useIsColumnRelated). `set` publishes a fresh state to every
// subscriber; each subscriber's own snapshot comparison decides whether it re-renders.
export class HoverStore {
    private state: HoverState = EMPTY_STATE;
    private readonly listeners = new Set<() => void>();

    readonly subscribe = (listener: () => void): (() => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    readonly getState = (): HoverState => this.state;

    set(state: HoverState): void {
        this.state = state;
        for (const listener of this.listeners) listener();
    }
}

export interface HoverApi {
  readonly store: HoverStore;
  // The column row reports its OWNING TABLE's cell id along with the column, so
  // the provider can look the element up directly instead of scanning the graph.
  readonly setHoveredColumn: (columnId: string | null, tableId?: CellId) => void;
  readonly setHoveredRelation: (relationId: string | null) => void;
}

// Default is inert (no provider = nothing highlighted), so consumers never crash.
export const HoverContext = createContext<HoverApi>({
    store: new HoverStore(),
    setHoveredColumn: () => {},
    setHoveredRelation: () => {},
});

export function useHover(): HoverApi {
    return useContext(HoverContext);
}

// Subscribe to whether ONE column is currently highlighted. The snapshot is a boolean, so
// React (via Object.is) re-renders the caller only when its own membership flips — not on
// every hover elsewhere on the board.
export function useIsColumnRelated(store: HoverStore, columnId: string): boolean {
    return useSyncExternalStore(store.subscribe, () => store.getState().relatedColumnIds.has(columnId));
}
