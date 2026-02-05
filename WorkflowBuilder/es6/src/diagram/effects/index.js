/**
 * @file Define and manage custom shape effects. It hides the implementation details and
 * provides a simple interface to add or remove effects on diagram elements and links.
 * @see https://docs.jointjs.com/learn/features/highlighters
 */
import { highlighters } from '@joint/plus';
import HoverEffect from './HoverEffect';
import ConnectionTargetEffect from './ConnectionTargetEffect';
/**
 * Enumeration of available model effects.
 */
export const Effect = {
    NodeHover: 'node-hover',
    Warning: 'warning',
    ConnectionTarget: 'connection-target',
    ConnectionCandidate: 'connection-candidate',
};

/**
 * Add an effect (highlighter) to a diagram node or edge.
 */
export function addEffect(cellView, effect, options = {}) {
    switch (effect) {
        case Effect.NodeHover:
            HoverEffect.add(cellView, 'root', effect);
            break;
        case Effect.ConnectionCandidate:
            highlighters.addClass.add(cellView, 'root', effect, {
                className: 'connection-candidate',
            });
            break;
        case Effect.ConnectionTarget:
            ConnectionTargetEffect.add(cellView, 'root', effect, options);
            break;
        default:
            break;
    }
}

/**
 * Remove an effect (highlighter) from the diagram.
 * @todo It can be extended to support removing effects from specific cells
 * instead of removing all instances of an effect (not needed currently).
 */
export function removeEffect(paper, effect) {
    switch (effect) {
        case Effect.NodeHover:
            HoverEffect.removeAll(paper, effect);
            break;
        case Effect.ConnectionCandidate:
            highlighters.addClass.removeAll(paper, effect);
            break;
        case Effect.ConnectionTarget:
            ConnectionTargetEffect.removeAll(paper, effect);
            break;
        default:
            break;
    }
}
