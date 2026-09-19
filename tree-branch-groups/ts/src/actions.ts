import type { dia } from '@joint/plus';

import { createForkGroup } from './fork-group';
import { createLoopGroup } from './loop-group';
import { AddButton, Group, Link, Node, PARENT_GAP } from './shapes';
import type { GroupKind } from './shapes';
import type { AddChoice } from './add-menu';

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

/** The gate the leaves inside `group` converge into: its `end`, whatever the kind. */
function getSink(group: Group): Node {
    return group.getEnd();
}

/** The parent of `element` in the tree: the source of its inbound link. */
function getParent(graph: dia.Graph, element: dia.Element): dia.Element | undefined {
    return graph.getNeighbors(element, { inbound: true })[0];
}

/** The children of `element` in the tree: its outbound neighbors that are neither the sink of its path nor its add button. */
function getChildren(graph: dia.Graph, element: dia.Element): dia.Element[] {
    return graph.getNeighbors(element, { outbound: true })
        .filter((child) => !(Node.isNode(child) && child.isGate()) && !AddButton.isAddButton(child));
}

/** The add button below `element`, if it has one. */
export function getAddButton(graph: dia.Graph, element: dia.Element): AddButton | undefined {
    return graph.getNeighbors(element, { outbound: true }).find(AddButton.isAddButton);
}

/**
 * Whether `element` gets an add button when nothing follows it: a plain node,
 * a decision or a group. Not a gate, not a terminal, not an add button.
 */
function needsAddButton(element: dia.Element): boolean {
    return Group.isGroup(element) || (Node.isNode(element) && !element.isGate() && !element.isTerminal());
}

/**
 * Whether an end of the diagram can be added below `element`: outside of a
 * group only - inside, every leaf has to reach the end of the group.
 */
export function canAddTerminal(element: dia.Element): boolean {
    return getContainer(element) === null;
}

/**
 * Puts an add button below every element without a successor - a leaf of
 * the tree, or a group nothing follows - and removes the buttons of the
 * elements that got a successor since, and those whose element is gone.
 * Inside a group a leaf has a successor: the sink of its path. A decision
 * has its own button. Called before every layout, so that the buttons are
 * laid out like children.
 */
export function ensureAddButtons(graph: dia.Graph): void {
    for (const button of graph.getElements().filter(AddButton.isAddButton)) {
        const parent = getParent(graph, button);
        if (!parent || graph.getNeighbors(parent, { outbound: true }).length > 1) button.remove();
    }
    for (const element of graph.getElements()) {
        if (!needsAddButton(element) || graph.getNeighbors(element, { outbound: true }).length > 0) continue;
        const button = new AddButton();
        const bbox = element.getBBox();
        button.position(bbox.center().x - button.size().width / 2, bbox.corner().y + PARENT_GAP);
        graph.addCells([button, Link.create(element, button)]);
    }
    // A decision shows its own add button once it has a child: the button adds siblings.
    for (const element of graph.getElements()) {
        if (Node.isNode(element) && element.isDecision()) {
            element.setAddButtonVisible(getChildren(graph, element).length >= 1);
        }
    }
}

/** Whether `element` may have several children: a decision, or a gate (the start of a group). */
function canBranch(element: dia.Element): boolean {
    return Node.isNode(element) && (element.isDecision() || element.isGate());
}

/**
 * Whether `element` can be deleted: not the root, not a gate. A decision
 * goes with everything below it; a node with several children only where
 * its parent can take them all - a decision or a gate. The last node of a
 * group may go too: its `start` then links straight to its `end`, and the
 * group is refilled through that link.
 */
export function canDelete(graph: dia.Graph, element: dia.Element): boolean {
    if (Node.isNode(element) && element.isGate()) return false;
    const parent = getParent(graph, element);
    if (!parent) return false;
    if (Node.isNode(element) && element.isDecision()) return true;
    return getChildren(graph, element).length <= 1 || canBranch(parent);
}

/**
 * The elements below `element` (and `element` itself) down to the gates of
 * its group or the leaves of the tree, add buttons included; the outer tree
 * of a nested group only - a group takes its content along when removed.
 * The search stops at a gate: the gate is not part of the subtree.
 */
function getSubtree(graph: dia.Graph, element: dia.Element): dia.Element[] {
    const subtree: dia.Element[] = [];
    graph.search(element, (current) => {
        if (Node.isNode(current) && current.isGate()) return false;
        subtree.push(current);
        return true;
    }, { outbound: true, breadthFirst: true });
    return subtree;
}

/**
 * The cells a deletion of `element` removes from the picture: the element -
 * a decision with everything below it, a group with its content - the links
 * between them, and the add button of a leaf that goes with it. What
 * `deleteElement()` takes away, for the highlight before the click.
 */
export function getDeletedCells(graph: dia.Graph, element: dia.Element): dia.Cell[] {
    let elements: dia.Element[];
    if (Node.isNode(element) && element.isDecision()) {
        elements = getSubtree(graph, element);
    } else {
        const button = getAddButton(graph, element);
        elements = button ? [element, button] : [element];
    }
    return graph.getSubgraph(elements, { deep: true });
}

/**
 * Deletes `element`. A decision is deleted with everything below it, down to
 * the end of its group. Any other element is spliced out: its children move
 * up to its parent, in its place; a group takes its content along. If the
 * parent is left without children inside a group, it becomes a leaf and
 * connects to its sink.
 */
export function deleteElement(graph: dia.Graph, element: dia.Element): void {
    if (!canDelete(graph, element)) return;
    const parent = getParent(graph, element)!;
    const container = getContainer(parent);

    if (Node.isNode(element) && element.isDecision()) {
        // Takes the embedded content of a nested group and every connected link along.
        for (const cell of getSubtree(graph, element)) cell.remove();
    } else {
        const children = getChildren(graph, element);
        const rank: number = element.get('siblingRank') ?? 0;
        element.remove();
        children.forEach((child, index) => {
            // Between the former siblings of the element.
            child.set('siblingRank', rank + (index + 1) / (children.length + 1));
            const link = Link.create(parent, child);
            graph.addCell(link);
            link.reparent();
        });
    }

    if (container && graph.getNeighbors(parent, { outbound: true }).length === 0) {
        const link = Link.create(parent, getSink(container));
        graph.addCell(link);
        link.reparent();
    }
}

/**
 * Whether a new element can be inserted into `link`: every link of the tree,
 * except the one into an add button (the button itself adds) and the return
 * link of a loop, from its `end` back to its `start` (a node there would be
 * a node of the tree). Neither has an insert button; see `Link.connectTo()`.
 * The link from the `start` of an emptied group straight to its `end` can:
 * that is how the group is refilled.
 */
export function canSplit(link: dia.Link): boolean {
    const source = link.getSourceElement();
    const target = link.getTargetElement();
    if (!source || !target) return false;
    return !Link.isReturnLink(source, target) && !AddButton.isAddButton(target);
}

/**
 * Adds a new element of the chosen kind to the graph: a node, a decision, an
 * end of the diagram, or an empty group. A node or a decision takes a label;
 * a node without one is numbered.
 */
function createElement(graph: dia.Graph, choice: AddChoice, label?: string): dia.Element {
    switch (choice) {
        case 'node': {
            const node = Node.create(label ?? nextLabel());
            graph.addCell(node);
            return node;
        }
        case 'decision': {
            const node = Node.createDecision(label);
            graph.addCell(node);
            return node;
        }
        case 'end': {
            const node = Node.createTerminal();
            graph.addCell(node);
            return node;
        }
        default: return createGroup(graph, choice);
    }
}

/**
 * Inserts a new element of the chosen kind into `link`: the link now ends at
 * the new element, and a new link continues from it to the former target.
 * The element joins the group the link is in and takes the place of the
 * former target among its siblings.
 */
export function insertOnLink(graph: dia.Graph, link: Link, choice: AddChoice, label?: string): dia.Element {
    const target = link.getTargetElement()!;
    const element = createElement(graph, choice, label);
    link.getParentCell()?.embed(element);
    element.set({ siblingRank: target.get('siblingRank') as number | undefined });
    // Seed the position at the middle of the link so that the first render does not flash at the origin.
    const seed = link.getBBox().center();
    element.position(seed.x - element.size().width / 2, seed.y - element.size().height / 2, { deep: true });

    link.connectTo(element);
    const continuation = Link.create(element, target);
    graph.addCell(continuation);
    continuation.reparent();
    return element;
}

/**
 * Inside a group every leaf connects to a gate - the sink of its path. When a
 * leaf gets its first child, the link to the sink moves down to the child;
 * every further child gets a link to the sink of its own.
 */
function connectChildToSink(graph: dia.Graph, parent: dia.Element, child: dia.Element): void {
    const container = getContainer(parent);
    if (!container) return;
    const sink = getSink(container);
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

/** Adds a plain node as the last child of `parent`, labelled as given or numbered. */
export function addChild(graph: dia.Graph, parent: dia.Element, label?: string): Node {
    const node = Node.create(label ?? nextLabel());
    graph.addCell(node);
    attachChild(graph, parent, node);
    return node;
}

/** Adds a new element of the chosen kind as the last child of `parent`, with a label where it takes one. */
export function addBelow(graph: dia.Graph, parent: dia.Element, choice: AddChoice, label?: string): dia.Element {
    const element = createElement(graph, choice, label);
    attachChild(graph, parent, element);
    return element;
}

/**
 * Names the option `element` is of its parent - a decision or a fork - on
 * the link into it, instead of the `option 1`, `option 2`, ... the layout
 * numbers the options with (see `nameOptions()` in `layout.ts`).
 */
export function nameOption(element: dia.Element, name: string): void {
    element.set({ optionName: name });
}

/** Adds an empty group of the given kind to the graph. */
function createGroup(graph: dia.Graph, kind: GroupKind): Group {
    return kind === 'fork' ? createForkGroup(graph) : createLoopGroup(graph);
}

/** Adds an empty group of the given kind as the last child of `parent`. */
export function insertGroup(graph: dia.Graph, parent: dia.Element, kind: GroupKind): Group {
    const group = createGroup(graph, kind);
    attachChild(graph, parent, group);
    return group;
}
