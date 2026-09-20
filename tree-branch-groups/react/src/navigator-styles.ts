import type { dia } from '@joint/plus';

import { COLORS, Decision, End, GroupStart, Start, Step } from './shapes';

/**
 * The look of an element on the map, over the default shape of the
 * library (a rounded rect): a fill in the colors of the diagram, no stroke.
 * A step is a light blue, a decision and the start of a group the blue of
 * the pills, the start and the ends of the diagram dark (the start is white
 * on the diagram - invisible on the map without its outline); a group and
 * the end of a group are not drawn (the add buttons are kept off the map by
 * its `cellVisibility`, see `app.tsx`); the links are drawn the default way.
 */
export function navigatorElementStyle({ model }: { model: dia.Element }): dia.attributes.SVGRectAttributes {
    if (Step.isStep(model)) return { fill: '#AEBDEF', stroke: 'none' };
    if (Decision.isDecision(model) || GroupStart.isGroupStart(model)) return { fill: COLORS.gate.fill, stroke: 'none' };
    if (Start.isStart(model) || End.isEnd(model)) return { fill: COLORS.terminal, stroke: 'none' };
    return { display: 'none' };
}
