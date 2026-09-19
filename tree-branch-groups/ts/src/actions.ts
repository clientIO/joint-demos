import type { dia } from '@joint/plus';

import type { AddChoice } from './menu';
import type { DiagramData } from './data/DiagramData';
import type { Id, NodeData, Slot } from './data/types';
import { AddButton, DECISION_LABEL, Decision, Group, GroupEnd, GroupStart, Link, isGate } from './shapes';

/**
 * The edits, and the questions the tools ask before offering one. An edit
 * changes the data only; the graph follows (see `app.ts`). The questions are
 * answered from the graph, where the tools live: it stands for the data
 * one to one (see `build.ts`).
 */

let nodeCounter = 0;

function nextLabel(): string {
    nodeCounter += 1;
    return `Node ${nodeCounter}`;
}

/** The group `element` is a direct part of, if any. */
function getContainer(element: dia.Element): Group | null {
    const container = element.getParentCell();
    return container && Group.isGroup(container) ? container : null;
}

/** The parent of `element` in the tree: the source of its inbound link. */
function getParent(graph: dia.Graph, element: dia.Element): dia.Element | undefined {
    return graph.getNeighbors(element, { inbound: true })[0];
}

/** The children of `element` in the tree: its outbound neighbors that are neither the end of its group nor its add button. */
function getChildren(graph: dia.Graph, element: dia.Element): dia.Element[] {
    return graph.getNeighbors(element, { outbound: true })
        .filter((child) => !isGate(child) && !AddButton.isAddButton(child));
}

/** The add button below `element`, if it has one. */
function getAddButton(graph: dia.Graph, element: dia.Element): AddButton | undefined {
    return graph.getNeighbors(element, { outbound: true }).find(AddButton.isAddButton);
}

/**
 * Whether an end of the diagram can be added below `element`: outside of a
 * group only - inside, every leaf has to reach the end of the group.
 */
export function canAddTerminal(element: dia.Element): boolean {
    return getContainer(element) === null;
}

/** Whether `element` may have several children: a decision, or a gate (the start of a group). */
function canBranch(element: dia.Element): boolean {
    return Decision.isDecision(element) || isGate(element);
}

/**
 * Whether `element` can be deleted: not the root, not a gate. A decision
 * goes with everything below it; a node with several children only where
 * its parent can take them all - a decision or a gate. The last node of a
 * group may go too: its `start` then links straight to its `end`, and the
 * group is refilled through that link.
 */
export function canDelete(graph: dia.Graph, element: dia.Element): boolean {
    if (isGate(element)) return false;
    const parent = getParent(graph, element);
    if (!parent) return false;
    if (Decision.isDecision(element)) return true;
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
        if (isGate(current)) return false;
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
    if (Decision.isDecision(element)) {
        elements = getSubtree(graph, element);
    } else {
        const button = getAddButton(graph, element);
        elements = button ? [element, button] : [element];
    }
    return graph.getSubgraph(elements, { deep: true });
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

/** The node of the data a choice of the add menu stands for. A node without a label is numbered. */
function createNodeData(choice: AddChoice, label?: string): NodeData {
    switch (choice) {
        case 'node': return { type: 'step', label: label ?? nextLabel() };
        case 'decision': return { type: 'decision', label: label ?? DECISION_LABEL };
        case 'end': return { type: 'end' };
        default: return { type: choice };
    }
}

/**
 * The node of the data `element` belongs to, and the list of edges its
 * outbound links stand for: the `branches` of the group for the `start`
 * gate of a group, the `to` of the node for anything else - a group
 * included, whose outbound links leave from the group itself.
 */
function getSlot(element: dia.Element): { id: Id; slot: Slot } {
    if (GroupStart.isGroupStart(element)) {
        return { id: String(element.getParentCell()!.id), slot: 'branches' };
    }
    return { id: String(element.id), slot: 'to' };
}

/** Adds a new node of the chosen kind as the last child of `parent`, with a label where it takes one. */
export function addBelow(data: DiagramData, parent: dia.Element, choice: AddChoice, label?: string): Id {
    const { id, slot } = getSlot(parent);
    return data.appendNode(createNodeData(choice, label), id, slot);
}

/**
 * Inserts a new node of the chosen kind into `link`: the link leads to the
 * new node now, and the new node on to the former target. Into the link
 * from the `start` of an empty group to its `end`, the node is the first
 * branch of the group.
 */
export function insertOnLink(data: DiagramData, link: Link, choice: AddChoice, label?: string): Id {
    const source = link.getSourceElement()!;
    const target = link.getTargetElement()!;
    const { id, slot } = getSlot(source);
    const childId = GroupEnd.isGroupEnd(target) ? null : String(target.id);
    return data.insertNode(createNodeData(choice, label), id, slot, childId);
}

/**
 * Deletes `element`. A decision is deleted with everything below it, down to
 * the end of its group. Any other element is spliced out: its children take
 * its place; a group takes its content along.
 */
export function deleteElement(graph: dia.Graph, data: DiagramData, element: dia.Element): void {
    if (!canDelete(graph, element)) return;
    const id = String(element.id);
    if (Decision.isDecision(element)) {
        data.removeSubtree(id);
    } else {
        data.spliceNode(id);
    }
}

/** Collapses an expanded group, expands a collapsed one. */
export function toggleGroup(data: DiagramData, group: Group): void {
    data.changeNode(String(group.id), { collapsed: !group.isCollapsed() });
}
