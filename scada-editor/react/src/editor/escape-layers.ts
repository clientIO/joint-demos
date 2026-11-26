import { createContext, useContext, useEffect, useEffectEvent } from 'react';

/*
 * `Escape` does one thing a press (as the TypeScript version's keyboard): it closes what is open on top - the
 * context menu, Find, the log - the last one opened first; only when nothing is open it acts on the diagram (one
 * group level up, the selection cleared). One handler of the key reads these layers (see `AppShortcuts`).
 */

/** What is open and closed by `Escape`, and what the key does when nothing is. */
export interface EscapeLayers {
    /** A layer opened (closed by `Escape` before the ones opened earlier); the returned function removes it. */
    readonly open: (close: () => void) => () => void;
    /** What `Escape` does when no layer is open; the returned function removes it. */
    readonly setFallback: (action: () => void) => () => void;
    /** `Escape` pressed: the top layer closed, or the fallback run. */
    readonly press: () => void;
}

/** A new set of layers, nothing open. */
export function createEscapeLayers(): EscapeLayers {
    const layers: Array<{ readonly close: () => void }> = [];
    let fallback: (() => void) | null = null;
    return {
        open: (close) => {
            const layer = { close };
            layers.push(layer);
            return () => {
                const index = layers.indexOf(layer);
                if (index !== -1) {
                    layers.splice(index, 1);
                }
            };
        },
        setFallback: (action) => {
            fallback = action;
            return () => {
                if (fallback === action) {
                    fallback = null;
                }
            };
        },
        press: () => {
            const top = layers.at(-1);
            if (top) {
                top.close();
                return;
            }
            fallback?.();
        },
    };
}

/** The layers of the editor. */
export const EscapeLayersContext = createContext<EscapeLayers>(createEscapeLayers());

/** The layers of the editor. */
export function useEscapeLayers(): EscapeLayers {
    return useContext(EscapeLayersContext);
}

/** A layer of `Escape` while it is open: `Escape` calls `close` (before what was open earlier, and the diagram). */
export function useEscapeLayer(isOpen: boolean, close: () => void): void {
    const layers = useEscapeLayers();
    const onClose = useEffectEvent(close);
    useEffect(() => (isOpen ? layers.open(() => onClose()) : undefined), [isOpen, layers]);
}

/** What `Escape` does when nothing is open (one group level up), while mounted. */
export function useEscapeFallback(action: () => void): void {
    const layers = useEscapeLayers();
    const onEscape = useEffectEvent(action);
    useEffect(() => layers.setFallback(() => onEscape()), [layers]);
}
