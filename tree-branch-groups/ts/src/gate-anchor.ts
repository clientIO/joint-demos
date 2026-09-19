import type { anchors, dia, g } from '@joint/plus';

import { Group } from './shapes';

/**
 * The anchor of every link end. A link into a group enters it where its
 * `start` node is - the top of the group on the axis of the gates; a link out
 * of a group leaves it where its `end` node is - the bottom on that axis. So
 * the tree appears to connect to the gates, although the links connect to
 * the group. Every other element is anchored in its middle. The positions are
 * read from the models: the layout owns them, and a view may not be rendered
 * yet when the link is routed.
 */
export const gateAnchor: anchors.Anchor = (endView: dia.CellView, _endMagnet, _anchorReference, _opt, endType: dia.LinkEnd): g.Point => {
    const element = endView.model as dia.Element;
    if (Group.isGroup(element) && !element.isCollapsed()) {
        return endType === 'target'
            ? element.getStart().getBBox().topMiddle()
            : element.getEnd().getBBox().bottomMiddle();
    }
    return element.getBBox().center();
};
