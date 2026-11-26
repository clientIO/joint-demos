import { createContext, useContext, type ReactNode } from 'react';
import { flipTransform } from './geometry';
import type { Flip } from './types';

interface FlipFrame {
    readonly flip: Flip | undefined;
    readonly width: number;
    readonly height: number;
}

const FlipContext = createContext<FlipFrame>({ flip: undefined, width: 0, height: 0 });

/** Provides the flip and the box of the element to the directional parts of its symbol. */
export const FlipProvider = FlipContext.Provider;

/**
 * The parts of a symbol that show which way the shape faces (the inlet of a cyclone, the arrow of a check valve):
 * mirrored when the shape is flipped. The symmetric rest keeps its lighting; what is on top stays on top.
 */
export function Directional({ children }: { readonly children: ReactNode }) {
    const { flip, width, height } = useContext(FlipContext);
    return <g transform={flipTransform(flip, width, height)}>{children}</g>;
}
