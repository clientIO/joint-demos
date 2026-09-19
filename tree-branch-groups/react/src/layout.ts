import type { dia, g } from '@joint/plus';

import { layoutBranchGroup } from './branch-group';
import { layoutCycleGroup } from './cycle-group';
import { Group, NODE_SIZE, Node } from './shapes';
import { createTreeLayout } from './tree-layout';

/**
 * A cell is hidden by a collapse when one of its ancestors is a collapsed
 * group - unless the cell is the `start` node of that group, which stays
 * visible and stands in for the group. A group nested in a collapsed group
 * hides its `start` as well.
 */
export function isHiddenByCollapse(cell: dia.Cell): boolean {
    return cell.getAncestors().some((ancestor) => {
        if (!Group.isGroup(ancestor) || !ancestor.isCollapsed()) return false;
        return !(Node.isNode(cell) && cell.getRole() === 'start' && cell.getParentCell() === ancestor);
    });
}

/**
 * The visibility predicate of the paper (`cellVisibility`). A group is never
 * rendered - it is a node of the layout, not of the picture. A link
 * disappears together with either of its end elements, which covers the
 * outer links of a group nested inside a collapsed group.
 */
export function isCellVisible(cell: dia.Cell): boolean {
    if (Group.isGroup(cell)) return false;
    if (isHiddenByCollapse(cell)) return false;
    if (cell.isLink()) {
        const source = cell.getSourceElement();
        const target = cell.getTargetElement();
        if (!source || !target) return false;
        return !isHiddenByCollapse(source) && !isHiddenByCollapse(target);
    }
    return true;
}

/** Lays out the content of an expanded group; each kind of group has a layout of its own. */
function layoutGroup(graph: dia.Graph, group: Group): void {
    switch (group.getKind()) {
        case 'branch': return layoutBranchGroup(graph, group);
        case 'cycle': return layoutCycleGroup(graph, group);
    }
}

/**
 * Lays out the whole diagram bottom-up: the deepest groups first, because a
 * group is a single node of the tree that contains it and its size has to be
 * known before that tree is laid out. Returns the bounding box of the visible
 * elements.
 */
export function runLayout(graph: dia.Graph, root: dia.Element): g.Rect | null {

    const groups = graph.getElements()
        .filter(Group.isGroup)
        .filter((group) => !isHiddenByCollapse(group))
        .sort((a, b) => b.getAncestors().length - a.getAncestors().length);

    for (const group of groups) {
        if (group.isCollapsed()) {
            // A node-sized group with its `start` in its place, standing in for it.
            group.resize(NODE_SIZE.width, NODE_SIZE.height);
            group.getStart().position(group.position().x, group.position().y);
        } else {
            layoutGroup(graph, group);
        }
    }

    createTreeLayout(graph).layoutTree(root);

    return graph.getCellsBBox(graph.getElements().filter(isCellVisible));
}
