import { g, layout } from '@joint/plus';
import type { dia } from '@joint/plus';

import { Group, COLLAPSED_SIZE, GROUP_PADDING, PARENT_GAP, SIBLING_GAP } from './shapes';

/** A cell is hidden when any of its ancestors is a collapsed group. */
function isInsideCollapsedGroup(cell: dia.Cell): boolean {
    return cell.getAncestors().some((ancestor) => Group.isGroup(ancestor) && ancestor.isCollapsed());
}

/**
 * The visibility predicate shared by the paper (`cellVisibility`) and the layout.
 * A link disappears together with either of its end elements, which covers
 * the outer links of a group nested inside a collapsed group.
 */
export function isCellVisible(cell: dia.Cell): boolean {
    if (isInsideCollapsedGroup(cell)) return false;
    if (cell.isLink()) {
        const source = cell.getSourceElement();
        const target = cell.getTargetElement();
        if (!source || !target) return false;
        return !isInsideCollapsedGroup(source) && !isInsideCollapsedGroup(target);
    }
    return true;
}

/**
 * A fresh instance for every tree. `layoutTree()` keeps the layout areas of
 * the previous run and treats the elements it has already seen as leaves,
 * while `layout()` would start from every source of the graph - including
 * the `start` node of every group.
 */
function createTreeLayout(graph: dia.Graph, options: Partial<layout.TreeLayout.Options> = {}): layout.TreeLayout {
    return new layout.TreeLayout({
        graph,
        direction: 'B',
        parentGap: PARENT_GAP,
        siblingGap: SIBLING_GAP,
        firstChildGap: PARENT_GAP,
        updateSiblingRank: null,
        // A group carries its content (and the vertices of the embedded links) along.
        updatePosition: (element, position, opt) => {
            element.position(position.x, position.y, { ...opt, deep: true });
        },
        ...options
    });
}

/**
 * Lays out the content of an expanded group: the tree that grows from `start`
 * (with `end` excluded, so the two branches stay a tree), then `end` right
 * below the branches on the axis of `start`, joined by a horizontal bar that
 * mirrors the vertices the tree layout draws below a parent.
 *
 * The group is then sized so that its top center is the top center of `start`
 * and its bottom center is the bottom center of `end`: the outer links, which
 * connect to the group, appear to connect to those two nodes.
 */
function layoutGroup(graph: dia.Graph, group: Group): void {
    const start = group.getStart();
    const end = group.getEnd();

    const treeLayout = createTreeLayout(graph, {
        filter: (children) => children.filter((child) => child.id !== end.id)
    });
    treeLayout.layoutTree(start);

    // The area of the root is the bounding box of the whole tree (in graph coordinates).
    const { x, y, width, height } = treeLayout.getLayoutArea(start)!;
    const bbox = new g.Rect(x, y, width, height);
    const axisX = start.getBBox().center().x;

    const endSize = end.size();
    end.position(axisX - endSize.width / 2, bbox.y + bbox.height + PARENT_GAP);

    const joinY = end.position().y - PARENT_GAP / 2;
    for (const link of graph.getConnectedLinks(end, { inbound: true })) {
        const leaf = link.getSourceElement();
        if (!leaf) continue;
        const leafCenterX = leaf.getBBox().center().x;
        link.vertices(leafCenterX === axisX
            ? []
            : [{ x: leafCenterX, y: joinY }, { x: axisX, y: joinY }]
        );
    }

    // Symmetric around the axis, so that the axis is the center of the group.
    const halfWidth = Math.max(axisX - bbox.x, bbox.x + bbox.width - axisX) + GROUP_PADDING;
    const top = start.getBBox().y;
    const bottom = end.getBBox().corner().y;
    group.position(axisX - halfWidth, top);
    group.resize(2 * halfWidth, bottom - top);
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
        .filter(isCellVisible)
        .sort((a, b) => b.getAncestors().length - a.getAncestors().length);

    for (const group of groups) {
        if (group.isCollapsed()) {
            group.resize(COLLAPSED_SIZE.width, COLLAPSED_SIZE.height);
        } else {
            layoutGroup(graph, group);
        }
    }

    createTreeLayout(graph).layoutTree(root);

    return graph.getCellsBBox(graph.getElements().filter(isCellVisible));
}
