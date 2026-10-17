/**
 * @file Define and manage custom shape effects. It hides the implementation details and
 * provides a simple interface to add or remove effects on diagram elements and links.
 * @see https://docs.jointjs.com/learn/features/highlighters
 */
import { highlighters } from '@joint/plus';
import HoverEffect from './HoverEffect';

import type { dia } from '@joint/plus';
/**
 * Enumeration of available model effects.
 */
export const Effect = {
    NodeHover: 'node-hover',
    NetHover: 'net-hover',
    ConnectionTarget: 'connection-target',
    ConnectionCandidate: 'connection-candidate',
} as const;

/**
 * Add an effect (highlighter) to a diagram node or edge.
 */
export function addEffect(cellView: dia.CellView, effect: typeof Effect[keyof typeof Effect], options: Record<string, unknown> = {}) {
    switch (effect) {
        case Effect.NodeHover:
            HoverEffect.add(cellView, 'root', effect);
            break;
        case Effect.NetHover:
            highlighters.addClass.add(cellView, 'root', effect, {
                className: 'net-hover',
            });
            break;
        case Effect.ConnectionCandidate:
            highlighters.addClass.add(cellView, 'root', effect, {
                className: 'connection-candidate',
            });
            break;
        case Effect.ConnectionTarget:
            // Highlight the port (magnet) the link would connect to
            highlighters.addClass.add(cellView, (options.magnet || 'root') as SVGElement, effect, {
                className: 'connection-target',
            });
            break;
        default:
            break;
    }
}

/**
 * Remove an effect (highlighter) from the diagram.
 */
export function removeEffect(paper: dia.Paper, effect: typeof Effect[keyof typeof Effect]) {
    switch (effect) {
        case Effect.NodeHover:
            HoverEffect.removeAll(paper, effect);
            break;
        case Effect.NetHover:
        case Effect.ConnectionCandidate:
        case Effect.ConnectionTarget:
            highlighters.addClass.removeAll(paper, effect);
            break;
        default:
            break;
    }
}

/**
 * Remove an effect (highlighter) from the given cell view only.
 */
export function removeCellEffect(cellView: dia.CellView, effect: typeof Effect[keyof typeof Effect]) {
    switch (effect) {
        case Effect.NodeHover:
            HoverEffect.remove(cellView, effect);
            break;
        default:
            highlighters.addClass.remove(cellView, effect);
            break;
    }
}
