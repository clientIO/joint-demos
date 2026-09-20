import type { dia } from '@joint/plus';
import { Navigator } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { PAPER_ID } from './editor-context';
import { isCellVisible } from './layout';
import { AddButtonModel, COLORS, DecisionModel, EndModel, GroupStartModel, StartModel, StepModel } from './shapes';

/**
 * The look of an element on the map, over the default shape of the
 * library (a rounded rect): a fill in the colors of the diagram, no stroke.
 * A step is a light blue, a decision and the start of a group the blue of
 * the pills, the start and the ends of the diagram dark (the start is white
 * on the diagram - invisible on the map without its outline); the end of a
 * group is drawn with nothing (a group itself is never mounted). The links
 * are drawn the default way.
 */
function elementStyle({ model }: { model: dia.Element }): dia.attributes.SVGRectAttributes {
    if (StepModel.isStep(model)) return { fill: '#AEBDEF', stroke: 'none' };
    if (DecisionModel.isDecision(model) || GroupStartModel.isGroupStart(model)) return { fill: COLORS.gate.fill, stroke: 'none' };
    if (StartModel.isStart(model) || EndModel.isEnd(model)) return { fill: COLORS.terminal, stroke: 'none' };
    // The end of a group (a group itself is never mounted): drawn with nothing - not hidden, the navigator measures every node it mounts.
    return { fill: 'none', stroke: 'none' };
}

/**
 * The map shows the elements and the links - not the add buttons, too
 * small to read on it - and hides the content of the collapsed groups like
 * the paper does. The navigator of `@joint/react-plus` inherits the
 * routing options of the paper, not its `cellVisibility`: it is given to
 * its own paper here (which also replaces what its `showLinks` prop would
 * set).
 */
const OPTIONS = {
    paperOptions: { cellVisibility: (cell: dia.Cell) => !AddButtonModel.isAddButton(cell) && isCellVisible(cell) }
};

/**
 * The map of the diagram, floating over the corner of the paper (see
 * `index.css`): the elements as the default shapes filled in the colors of
 * the diagram, fitted to the content measured by the model (see
 * `parkHiddenContent()` in `layout/index.ts`), no dynamic zoom. It finds the
 * paper by its id: it is rendered outside of `<PaperScroller>`.
 */
export function Minimap(): ReactNode {
    return <Navigator paper={PAPER_ID} className="navigator" padding={8} useContentBBox dynamicZoom={false} elementStyle={elementStyle} options={OPTIONS} />;
}
