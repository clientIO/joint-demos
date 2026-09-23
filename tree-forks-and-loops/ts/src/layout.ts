import { g, layout } from '@joint/plus';
import type { dia } from '@joint/plus';

import { IF_GAP, LOOP_GAP, Group, GROUP_PADDING, Link, Node, PARENT_GAP, SIBLING_GAP } from './shapes';

/**
 * A cell is hidden when any of its ancestors is a collapsed group - with one
 * exception: the `start` node of a collapsed group stays. Collapsing a group
 * takes its content away and leaves its start node standing where it was,
 * unchanged; nothing else stands in for it.
 */
function isInsideCollapsedGroup(cell: dia.Cell): boolean {
    const isStart = Node.isNode(cell) && cell.getRole() === 'start';
    return cell.getAncestors().some((ancestor, level) => {
        if (!Group.isGroup(ancestor) || !ancestor.isCollapsed()) return false;
        return !(level === 0 && isStart);
    });
}

/**
 * Whether a cell is part of the diagram at all: everything but the content of
 * a collapsed group. A link disappears together with either of its end
 * elements, which covers the outer links of a group nested inside a collapsed
 * group. This is what the layout works on, whether or not the slabs of the
 * groups are drawn.
 */
function isCellVisible(cell: dia.Cell): boolean {
    if (isInsideCollapsedGroup(cell)) return false;
    if (cell.isLink()) {
        const source = cell.getSourceElement();
        const target = cell.getTargetElement();
        if (!source || !target) return false;
        return !isInsideCollapsedGroup(source) && !isInsideCollapsedGroup(target);
    }
    return true;
}

// Off to begin with: the slabs explain the layout, they are not the diagram.
let groupsShown = false;

/** Whether the slabs of the groups are drawn. */
export function areGroupsShown(): boolean {
    return groupsShown;
}

/** Draws the slabs of the groups, or takes them off the paper. */
export function showGroups(shown: boolean): void {
    groupsShown = shown;
}

/**
 * What the paper draws (`cellVisibility`) and what carries tools: the cells of
 * the diagram, minus the slabs of the groups while they are off. A group is
 * scaffolding of the layout - the tree hangs its subgraphs on it - and the
 * diagram reads without it, collapsed or not: the outer links of a group end
 * on the edges of its start and end node, which is where the group's own
 * edges are, so they stay where they are and the tree looks whole. The tools
 * of a group are on its start node, which is drawn either way.
 */
export function isCellPainted(cell: dia.Cell): boolean {
    if (!groupsShown && Group.isGroup(cell)) return false;
    return isCellVisible(cell);
}

/**
 * The children of `parent` the tree is made of: everything below it, but not
 * what a branch joins back into - a tree has no two ways to a node - and not
 * what is hidden inside something collapsed, which takes no room.
 */
function getTreeChildren(graph: dia.Graph, children: dia.Element[], parent: dia.Element | null): dia.Element[] {
    const visible = children.filter(isCellVisible);
    if (!parent) return visible;
    const joined = graph.getConnectedLinks(parent, { outbound: true })
        .filter((link) => Link.isJoin(link))
        .map((link) => link.target().id);
    return visible.filter((child) => !joined.includes(child.id));
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
        filter: (children, parent) => getTreeChildren(graph, children, parent),
        // A group carries its content (and the vertices of the embedded links) along.
        updatePosition: (element, position, opt) => {
            element.position(position.x, position.y, { ...opt, deep: true });
        },
        ...options
    });
}

/**
 * Routes the return link of a loop group: out of `end` to the left, up the
 * left side of the group - past the content, inside the box, which is wide
 * enough to hold it (see `layoutGroup()`) - and into `start` from the left.
 */
function layoutReturnLink(graph: dia.Graph, group: Group): void {
    const start = group.getStart();
    const end = group.getEnd();
    const returnLink = graph.getConnectedLinks(end, { outbound: true }).find((link) => link.getTargetElement() === start);
    if (!returnLink) return;
    const returnX = group.getBBox().x + GROUP_PADDING;
    returnLink.vertices([
        { x: returnX, y: end.getBBox().center().y },
        { x: returnX, y: start.getBBox().center().y }
    ]);
}

/**
 * Routes the `no` line of an `if` group: out of `start` to the right, down the
 * right side of the group - past the branch, inside the box, which is wide
 * enough to hold it (see `layoutGroup()`) - and into `end` from the right. The
 * return link of a loop, the other way round: it runs with the flow instead of
 * against it, and past the branch instead of back over it.
 */
function layoutSkipLink(graph: dia.Graph, group: Group): void {
    const start = group.getStart();
    const end = group.getEnd();
    const skipLink = graph.getConnectedLinks(start, { outbound: true }).find((link) => link.getTargetElement() === end);
    if (!skipLink) return;
    const skipX = group.getBBox().corner().x - GROUP_PADDING;
    skipLink.vertices([
        { x: skipX, y: start.getBBox().center().y },
        { x: skipX, y: end.getBBox().center().y }
    ]);
}

/**
 * Lays out the content of an expanded group: the tree that grows from `start`
 * (with `end` excluded, so the content stays a tree), then `end` right below
 * the tree on the axis of `start`, joined by a horizontal bar that mirrors
 * the vertices the tree layout draws below a parent.
 *
 * The group is then sized so that its top center is the top center of `start`
 * and its bottom center is the bottom center of `end`: the outer links, which
 * connect to the group, appear to connect to those two nodes. A loop group
 * gets its return link routed around that box.
 */
function layoutGroup(graph: dia.Graph, group: Group): void {
    const start = group.getStart();
    const end = group.getEnd();

    const treeLayout = createTreeLayout(graph);
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
        // The `no` line of an `if` ends here too, and runs its own way round.
        if (!leaf || leaf === start) continue;
        const leafCenterX = leaf.getBBox().center().x;
        link.vertices(leafCenterX === axisX
            ? []
            : [{ x: leafCenterX, y: joinY }, { x: axisX, y: joinY }]
        );
    }

    // Symmetric around the axis, so that the axis is the center of the group -
    // and wide enough for the link that runs beside the content, the return
    // link of a loop on the left or the `no` line of an `if` on the right,
    // with a padding beyond it. That room is part of the box on purpose: a
    // width is geometry, which every bounding box and every layout around it
    // accounts for by itself, while a sibling gap is an instruction to one
    // layout and reaches no further. A fork holds no such link and is exactly
    // as wide as its content: a box wider than it needs to be is not padding
    // on the screen, it is room taken from the tree.
    const kind = group.getKind();
    const outside = kind === 'loop' ? LOOP_GAP + GROUP_PADDING : kind === 'if' ? IF_GAP + GROUP_PADDING : 0;
    const halfWidth = Math.max(axisX - bbox.x, bbox.x + bbox.width - axisX) + outside;
    const top = start.getBBox().y;
    const bottom = end.getBBox().corner().y;
    group.position(axisX - halfWidth, top);
    group.resize(2 * halfWidth, bottom - top);

    if (kind === 'loop') layoutReturnLink(graph, group);
    if (kind === 'if') layoutSkipLink(graph, group);
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
            // All that is left of it is its start node: the box is that node,
            // whatever size it has - the node can be made wider (see `tools.ts`).
            const { width, height } = group.getStart().size();
            group.resize(width, height);
        } else {
            layoutGroup(graph, group);
        }
    }

    createTreeLayout(graph).layoutTree(root);

    // The start node of a collapsed group is the group on the screen: it goes
    // where the tree put the box. Every other cell of the group is hidden and
    // stays where it was, to be found there again when the group is expanded.
    for (const group of groups) {
        if (!group.isCollapsed()) continue;
        const { x, y } = group.position();
        group.getStart().position(x, y);
    }

    // The links count: the `yes` and `no` labels of an `if` sit beside its box.
    return graph.getCellsBBox(graph.getCells().filter(isCellVisible));
}
