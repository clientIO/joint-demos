import { dia, elementTools, util } from '@joint/plus';

import { Node } from './shapes';

const BUTTON_RADIUS = 11;
const BUTTON_FILL = '#4666E5';

const ADD_CHILD_ICON = 'M -5 0 5 0 M 0 -5 0 5';
// A fork: one line splitting into two.
const ADD_GROUP_ICON = 'M 0 5 0 0 M 0 0 -4 -5 M 0 0 4 -5';

export interface ToolActions {
    addChild(element: dia.Element): void;
    addBranchGroup(element: dia.Element): void;
}

function createButton(icon: string, title: string, offsetX: number, action: () => void): elementTools.Button {
    return new elementTools.Button({
        x: '50%',
        y: '100%',
        offset: { x: offsetX, y: 0 },
        useModelGeometry: true,
        markup: util.svg/* xml */`
            <circle @selector="body" r="${BUTTON_RADIUS}" fill="${BUTTON_FILL}" stroke="#FFFFFF" stroke-width="1.5" cursor="pointer"/>
            <path d="${icon}" fill="none" stroke="#FFFFFF" stroke-width="2" pointer-events="none"/>
            <title>${title}</title>
        `,
        action
    });
}

/**
 * The element the tools of the hovered element act on. The tree continues
 * below a group from the group element, so the `end` node of a group stands
 * in for its group. The `start` node has no tools - it has its two branches.
 */
function getToolsTarget(element: dia.Element): dia.Element | null {
    if (!Node.isNode(element)) return element;
    switch (element.getRole()) {
        case 'start': return null;
        case 'end': return element.getParentCell() as dia.Element;
        default: return element;
    }
}

/**
 * Shows two buttons at the bottom edge of the hovered element: add a child
 * node, add a branch group as a child.
 */
export function addHoverTools(paper: dia.Paper, actions: ToolActions): void {

    paper.on('element:mouseenter', (elementView: dia.ElementView) => {
        const target = getToolsTarget(elementView.model);
        if (!target) return;
        elementView.removeTools();
        elementView.addTools(new dia.ToolsView({
            tools: [
                createButton(ADD_CHILD_ICON, 'Add a child', -14, () => actions.addChild(target)),
                createButton(ADD_GROUP_ICON, 'Add a branch group', 14, () => actions.addBranchGroup(target))
            ]
        }));
    });

    paper.on('element:mouseleave', (elementView: dia.ElementView) => {
        elementView.removeTools();
    });
}
