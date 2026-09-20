import { V } from '@joint/plus';
import type { dia } from '@joint/plus';

import { AddButton, COLORS, Decision, End, GroupStart, Start, Step } from './shapes';

/** The style of an element on the map: its outline as a path (a rect with the given corner radius) and its colors. */
function shape(width: number, height: number, radius: number, fill: string, stroke: string): dia.attributes.SVGRectAttributes {
    return { d: V.rectToPath({ x: 0, y: 0, width, height, rx: radius, ry: radius }), fill, stroke, strokeWidth: 2 };
}

/**
 * The look of an element on the map: a step is a white rect outlined in
 * blue, a decision and the start of a group a blue pill, the start and the
 * ends of the diagram a white circle outlined dark and dark circles, an add
 * button a blue square.
 * A group and the end of a group are not drawn. The navigator of
 * `@joint/react-plus` draws an element as a path: the shape is the `d`.
 */
export function navigatorElementStyle({ width, height, model }: { width: number; height: number; model: dia.Element }): dia.attributes.SVGRectAttributes {
    if (Step.isStep(model)) return shape(width, height, 4, COLORS.node.fill, COLORS.node.stroke);
    if (Decision.isDecision(model) || GroupStart.isGroupStart(model)) return shape(width, height, height / 2, COLORS.gate.fill, COLORS.gate.stroke);
    if (Start.isStart(model)) return shape(width, height, height / 2, COLORS.node.fill, COLORS.terminal);
    if (End.isEnd(model)) return shape(width, height, height / 2, COLORS.terminal, COLORS.terminal);
    if (AddButton.isAddButton(model)) return shape(width, height, width * 0.15, COLORS.button.fill, COLORS.button.fill);
    return { d: '', display: 'none' };
}

/** The links on the map: lines in the color of the links; the return link of a loop dashed like on the paper. */
export function navigatorLinkStyle({ model }: { model: dia.Link }): dia.attributes.SVGPathAttributes {
    const backward = Boolean((model.get('data') as { backward?: boolean } | undefined)?.backward);
    return { stroke: COLORS.link, strokeWidth: 2, fill: 'none', strokeDasharray: backward ? '6 4' : 'none' };
}
