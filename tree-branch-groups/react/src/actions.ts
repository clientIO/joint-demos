import type { dia } from '@joint/plus';

import { canEmptyBranch, canInsertGroupInBranch, createBranchGroup, getBranchSink } from './branch-group';
import { canEmptyCyclePath, canInsertGroupInCycle, createCycleGroup, getCycleSink, isOnReturnPath } from './cycle-group';
import { Group, Link, Node, PARENT_GAP } from './shapes';
import type { GroupKind } from './shapes';

let nodeCounter = 0;

function nextLabel(): string {
    nodeCounter += 1;
    return `Node ${nodeCounter}`;
}

/** The rank of a new child: after the existing children of the parent. */
function nextSiblingRank(graph: dia.Graph, parent: dia.Element): number {
    return graph.getNeighbors(parent, { outbound: true }).length;
}

/** The group `element` is a direct part of, if any. */
function getContainer(element: dia.Element): Group | null {
    const container = element.getParentCell();
    return container && Group.isGroup(container) ? container : null;
}

/** The gate the leaves below `element` converge into; each kind of group has a rule of its own. */
function getSink(graph: dia.Graph, group: Group, element: dia.Element): Node {
    switch (group.getKind()) {
        case 'branch': return getBranchSink(group);
        case 'cycle': return getCycleSink(graph, group, element);
    }
}

/**
 * Whether a group may be inserted below `element`. Outside of a group it
 * always may; inside, each kind of group has a rule of its own.
 */
export function canInsertGroup(graph: dia.Graph, element: dia.Element): boolean {
    const container = getContainer(element);
    if (!container) return true;
    switch (container.getKind()) {
        case 'branch': return canInsertGroupInBranch();
        case 'cycle': return canInsertGroupInCycle(graph, container, element);
    }
}

/** Which way the tree grows below `element`: up on the return path of a cycle, down everywhere else. */
export function getGrowthDirection(graph: dia.Graph, element: dia.Element): 'down' | 'up' {
    const container = getContainer(element);
    if (container?.getKind() === 'cycle' && isOnReturnPath(graph, container, element)) return 'up';
    return 'down';
}

/** The parent of `element` in the tree: the source of its inbound link. */
function getParent(graph: dia.Graph, element: dia.Element): dia.Element | undefined {
    return graph.getNeighbors(element, { inbound: true })[0];
}

/** The children of `element` in the tree: its outbound neighbors that are not the sink of its path. */
function getChildren(graph: dia.Graph, element: dia.Element): dia.Element[] {
    return graph.getNeighbors(element, { outbound: true }).filter((child) => !(Node.isNode(child) && child.isGate()));
}

/**
 * Whether the path `element` is the last node of - a leaf whose parent is a
 * gate - may be emptied, so that the gate links to the other gate directly.
 * Each kind of group has a rule of its own.
 */
function canEmptyPath(graph: dia.Graph, group: Group, element: dia.Element): boolean {
    switch (group.getKind()) {
        case 'branch': return canEmptyBranch();
        case 'cycle': return canEmptyCyclePath(graph, group, element);
    }
}

/**
 * Whether `element` can be deleted: not the root, not a gate, and the last
 * node between two gates only where its group allows the path to be empty.
 */
export function canDelete(graph: dia.Graph, element: dia.Element): boolean {
    if (Node.isNode(element) && element.isGate()) return false;
    const parent = getParent(graph, element);
    if (!parent) return false;
    const isLeaf = getChildren(graph, element).length === 0;
    if (!isLeaf || !Node.isNode(parent) || !parent.isGate()) return true;
    return canEmptyPath(graph, getContainer(element)!, element);
}

/** Whether `link` joins two gates directly: an emptied path, which a node can be inserted into. */
export function isEmptyPath(link: dia.Link): boolean {
    const source = link.getSourceElement();
    const target = link.getTargetElement();
    return source !== null && Node.isNode(source) && source.isGate()
        && target !== null && Node.isNode(target) && target.isGate();
}

/**
 * Inserts a new node into `link`: the link now ends at the node, and a new
 * link continues from the node to the former target. The node joins the
 * group the link is in.
 */
export function insertNodeOnLink(graph: dia.Graph, link: dia.Link): Node {
    const target = link.getTargetElement()!;
    const node = Node.create(nextLabel());
    graph.addCell(node);
    link.getParentCell()?.embed(node);
    // Seed the position at the middle of the link so that the first render does not flash at the origin.
    const seed = link.getBBox().center();
    node.position(seed.x - node.size().width / 2, seed.y - node.size().height / 2);

    link.target(node);
    const continuation = Link.create(node, target);
    graph.addCell(continuation);
    continuation.reparent();
    return node;
}

/**
 * Deletes `element` and reattaches its children to its parent, in its place.
 * A group is deleted with its content. If the parent is left without
 * children inside a group, it becomes a leaf and connects to its sink.
 */
export function deleteElement(graph: dia.Graph, element: dia.Element): void {
    if (!canDelete(graph, element)) return;
    const parent = getParent(graph, element)!;
    const children = getChildren(graph, element);
    const rank: number = element.get('siblingRank') ?? 0;
    const container = getContainer(parent);

    // Takes its embedded content and every link connected to it along.
    element.remove();

    children.forEach((child, index) => {
        // Between the former siblings of the element.
        child.set('siblingRank', rank + (index + 1) / (children.length + 1));
        const link = Link.create(parent, child);
        graph.addCell(link);
        link.reparent();
    });

    if (container && graph.getNeighbors(parent, { outbound: true }).length === 0) {
        const link = Link.create(parent, getSink(graph, container, parent));
        graph.addCell(link);
        link.reparent();
    }
}

/**
 * Inside a group every leaf connects to a gate - the sink of its path. When a
 * leaf gets its first child, the link to the sink moves down to the child;
 * every further child gets a link to the sink of its own.
 */
function connectChildToSink(graph: dia.Graph, parent: dia.Element, child: dia.Element): void {
    const container = getContainer(parent);
    if (!container) return;
    const sink = getSink(graph, container, parent);
    const sinkLink = graph.getConnectedLinks(parent, { outbound: true }).find((link) => link.getTargetCell() === sink);
    if (sinkLink) {
        sinkLink.source(child);
    } else {
        const link = Link.create(child, sink);
        graph.addCell(link);
        link.reparent();
    }
}

/**
 * Connects `parent` to `child` (both already in the graph) and keeps the child
 * inside the group of the parent, if any. The link is reparented into the
 * group of its ends, so that the group hides it when it collapses.
 */
function attachChild(graph: dia.Graph, parent: dia.Element, child: dia.Element): void {
    // Embed first: a link is reparented into the common ancestor of its ends,
    // so the child has to be inside the group before any link to it is made.
    // A link left at the top level would not move along with the group.
    const container = parent.getParentCell();
    if (container) container.embed(child);

    connectChildToSink(graph, parent, child);
    child.set('siblingRank', nextSiblingRank(graph, parent));
    // Seed the position below the parent so that the first render does not flash at the origin.
    const parentBBox = parent.getBBox();
    child.position(parentBBox.x, parentBBox.y + parentBBox.height + PARENT_GAP, { deep: true });

    const link = Link.create(parent, child);
    graph.addCell(link);
    link.reparent();
}

/** Adds a plain node as the last child of `parent`. */
export function addChild(graph: dia.Graph, parent: dia.Element): Node {
    const node = Node.create(nextLabel());
    graph.addCell(node);
    attachChild(graph, parent, node);
    return node;
}

/** Adds a group of the given kind, with its content, as the last child of `parent`. */
export function insertGroup(graph: dia.Graph, parent: dia.Element, kind: GroupKind): Group {
    const group = kind === 'branch'
        ? createBranchGroup(graph, nextLabel)
        : createCycleGroup(graph, nextLabel);
    attachChild(graph, parent, group);
    return group;
}
