/**
 * @file Define and manage custom shape effects. It hides the implementation details and
 * provides a simple interface to add or remove effects on diagram elements and links.
 * @see https://docs.jointjs.com/learn/features/highlighters
 */
import { dia, highlighters } from '@joint/plus';
import { Effect as SystemEffect } from '../../system/diagram/effects';
import PulseEffect from './PulseEffect';
import ActionWarningEffect from './ActionWarningEffect';
import Theme from '../theme';

/**
 * Enumeration of available model effects.
 */
export const Effect = {
    ...SystemEffect,
    NodeHover: 'node-hover',
    ActionWarning: 'action-warning',
    NodePulse: 'node-pulse',
} as const;

/**
 * Add an effect (highlighter) to a diagram node or edge.
 */
export function addEffect(cellView: dia.CellView, effect: typeof Effect[keyof typeof Effect]) {
    switch (effect) {
        case Effect.ConnectionTarget:
            highlighters.mask.add(cellView, getEffectSelector(cellView), effect, {
                padding: 2,
                attrs: {
                    stroke: Theme.ConnectionTargetColor,
                    strokeWidth: 2,
                }
            });
            break;
        case Effect.ConnectionAvailableTarget:
            highlighters.mask.add(cellView, getEffectSelector(cellView), effect, {
                padding: 0,
                layer: dia.Paper.Layers.BACK,
                attrs: {
                    stroke: Theme.AvailableConnectionTargetColor,
                    strokeWidth: 5
                }
            });
            break;
        case Effect.Sibling:
            highlighters.opacity.add(cellView, 'root', effect, {
                opacity: 0.7
            });
            break;
        case Effect.ActionWarning:
            ActionWarningEffect.add(cellView, 'root', effect);
            break;
        case Effect.NodeHover:
            highlighters.addClass.add(cellView, 'root', effect, {
                // See `shapes.scss`
                className: 'hover'
            });
            break;
        case Effect.NodePulse:
            PulseEffect.add(cellView, 'root', effect, {
                layer: null,
                strokeWidth: 3
            });
            break;
        default:
            throw new Error(`Unsupported effect: ${effect}`);
    }
}

/**
 * Remove an effect (highlighter) from the diagram.
 * @todo It can be extended to support removing effects from specific cells
 * instead of removing all instances of an effect (not needed currently).
 */
export function removeEffect(paper: dia.Paper, effect: typeof Effect[keyof typeof Effect]) {
    switch (effect) {
        case Effect.ConnectionTarget:
            highlighters.mask.removeAll(paper, effect);
            break;
        case Effect.ConnectionAvailableTarget:
            highlighters.mask.removeAll(paper, effect);
            break;
        case Effect.Sibling:
            highlighters.opacity.removeAll(paper, effect);
            break;
        case Effect.ActionWarning:
            ActionWarningEffect.removeAll(paper, effect);
            break;
        case Effect.NodeHover:
            highlighters.addClass.removeAll(paper, effect);
            break;
        case Effect.NodePulse:
            PulseEffect.removeAll(paper, effect);
            break;
        default:
            throw new Error(`Unsupported effect: ${effect}`);
    }
}

/**
 * Get the selector for applying effects based on the cell type.
 */
function getEffectSelector(cellView: dia.CellView): string {
    return cellView.model.isLink() ? 'line' : 'body';
}
