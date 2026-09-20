import type { dia } from '@joint/plus';

import type { AddChoice } from './menu';
import { cellId, getId } from './data/build';
import type { DiagramData } from './data/diagram-data';
import type { Id, NodeData, Slot } from './data/types';
import { isCellVisible } from './layout';
import { AddButtonModel, DECISION_LABEL, DecisionModel, EndModel, GroupModel, GroupEndModel, GroupStartModel, LinkModel, isGate } from './shapes';

/**
 * The edits, and the questions the tools ask before offering one. An edit
 * changes the data only; the graph follows (see the app). The questions
 * take the element or the link the tools hold - the graph stands for the
 * data one to one (see `build.ts`) - and ask the graph about the structure
 * around it, the data about the subtree that would move.
 */

/** The label of a new step without one: `Step 1`, `Step 2`, ... - the number after the highest one in use. */
function nextLabel(data: DiagramData): string {
    const numbers = Object.values(data.getData())
        .map((node) => (node.type === 'step' ? /^StepModel (\d+)$/.exec(node.label) : null))
        .map((match) => (match ? Number(match[1]) : 0));
    return `Step ${Math.max(0, ...numbers) + 1}`;
}

/** The group `element` is a direct part of, if any. */
function getContainer(element: dia.Element): GroupModel | null {
    const container = element.getParentCell();
    return container && GroupModel.isGroup(container) ? container : null;
}

/** The parent of `element` in the tree: the source of its inbound link. */
function getParent(graph: dia.Graph, element: dia.Element): dia.Element | undefined {
    return graph.getNeighbors(element, { inbound: true })[0];
}

/** The children of `element` in the tree: its outbound neighbors that are neither the end of its group nor its add button. */
function getChildren(graph: dia.Graph, element: dia.Element): dia.Element[] {
    return graph.getNeighbors(element, { outbound: true })
        .filter((child) => !isGate(child) && !AddButtonModel.isAddButton(child));
}

/** The add button below `element`, if it has one. */
function getAddButton(graph: dia.Graph, element: dia.Element): AddButtonModel | undefined {
    return graph.getNeighbors(element, { outbound: true }).find(AddButtonModel.isAddButton);
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
    return DecisionModel.isDecision(element) || isGate(element);
}

/**
 * The element the menu of `element` acts on - and the `Delete` key, when
 * it is selected: a node acts on itself, the `start` of a group on the
 * group. The `end` of a group and the add buttons have no menu.
 */
export function getActionTarget(element: dia.Element): dia.Element | null {
    if (GroupStartModel.isGroupStart(element)) return element.getParentCell() as GroupModel;
    if (GroupEndModel.isGroupEnd(element) || AddButtonModel.isAddButton(element)) return null;
    return element;
}

/** The item of the menu that removes `target`: "Remove" and what it is - a loop, a fork, a decision, an end, a step. */
export function getDeleteTitle(target: dia.Element): string {
    if (GroupModel.isGroup(target)) return `Remove the ${target.getKind()}`;
    if (DecisionModel.isDecision(target)) return 'Remove the decision';
    if (EndModel.isEnd(target)) return 'Remove the end';
    return 'Remove the step';
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
    if (DecisionModel.isDecision(element)) return true;
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
    if (DecisionModel.isDecision(element)) {
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
    return !LinkModel.isReturnLink(source, target) && !AddButtonModel.isAddButton(target);
}

/** The node of the data a choice of the add menu stands for. A step without a label is numbered. */
function createNodeData(data: DiagramData, choice: AddChoice, label?: string): NodeData {
    switch (choice) {
        case 'step': return { type: 'step', label: label ?? nextLabel(data) };
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
    if (GroupStartModel.isGroupStart(element)) {
        return { id: getId(element.getParentCell()!), slot: 'branches' };
    }
    return { id: getId(element), slot: 'to' };
}

/** Adds a new node of the chosen kind as the last child of `parent`, with a label where it takes one. */
export function addBelow(data: DiagramData, parent: dia.Element, choice: AddChoice, label?: string): Id {
    const { id, slot } = getSlot(parent);
    return data.appendNode(createNodeData(data, choice, label), id, slot);
}

/**
 * Inserts a new node of the chosen kind into `link`: the link leads to the
 * new node now, and the new node on to the former target. Into the link
 * from the `start` of an empty group to its `end`, the node is the first
 * branch of the group.
 */
export function insertOnLink(data: DiagramData, link: LinkModel, choice: AddChoice, label?: string): Id {
    const source = link.getSourceElement()!;
    const target = link.getTargetElement()!;
    const { id, slot } = getSlot(source);
    const childId = GroupEndModel.isGroupEnd(target) ? null : getId(target);
    return data.insertNode(createNodeData(data, choice, label), id, slot, childId);
}

/**
 * Deletes `element`. A decision is deleted with everything below it, down to
 * the end of its group. Any other element is spliced out: its children take
 * its place; a group takes its content along.
 */
export function deleteElement(graph: dia.Graph, data: DiagramData, element: dia.Element): void {
    if (!canDelete(graph, element)) return;
    const id = getId(element);
    if (DecisionModel.isDecision(element)) {
        data.removeSubtree(id);
    } else {
        data.spliceNode(id);
    }
}

/** The node of the data `element` stands for: the group, for a gate; the owner, for an add button. */
function getDataId(graph: dia.Graph, element: dia.Element): Id {
    const id = getId(element);
    if (isGate(element)) return getId(element.getParentCell()!);
    if (AddButtonModel.isAddButton(element)) return getDataId(graph, getParent(graph, element)!);
    return id;
}

/**
 * Whether the subtree of `movedId` can be dropped where `parent` gets its
 * children: not into itself, and not with an end of the diagram into a fork
 * or a loop.
 */
export function canMoveBelow(graph: dia.Graph, data: DiagramData, movedId: Id, parent: dia.Element): boolean {
    if (data.getSubtree(movedId).includes(getDataId(graph, parent))) return false;
    const intoGroup = getContainer(parent) !== null || GroupStartModel.isGroupStart(parent);
    return !(intoGroup && data.hasEnd(movedId));
}

/**
 * Whether the subtree of `movedId` can be dropped into `link`: into a link
 * that takes an insertion, outside of the subtree, with exactly one leaf
 * the flow can continue from - the former target of the link follows it -
 * and not with an end into a fork or a loop.
 */
export function canMoveOnLink(graph: dia.Graph, data: DiagramData, movedId: Id, link: dia.Link): boolean {
    if (!canSplit(link)) return false;
    const source = link.getSourceElement()!;
    const target = link.getTargetElement()!;
    const subtree = data.getSubtree(movedId);
    if (subtree.includes(getDataId(graph, source)) || subtree.includes(getDataId(graph, target))) return false;
    if (data.getOpenLeaves(movedId).length !== 1) return false;
    return !(getContainer(source) !== null && data.hasEnd(movedId));
}

/**
 * Whether the subtree of `movedId` has anywhere to go: a visible link that
 * takes it, or a visible drop point below an element - the add button of a
 * leaf, the `+` of a decision with options or of a fork. The move is
 * offered only then.
 */
export function hasMoveTarget(graph: dia.Graph, data: DiagramData, movedId: Id): boolean {
    if (graph.getLinks().some((link) => isCellVisible(link) && canMoveOnLink(graph, data, movedId, link))) return true;
    return graph.getElements().some((element) => {
        if (!isCellVisible(element)) return false;
        let parent: dia.Element | undefined;
        // A decision with options and a fork with branches have their own drop point, the `+`; without, the add button below is the target.
        if (GroupStartModel.isGroupStart(element)) parent = element.getKind() === 'fork' && getChildren(graph, element).length > 0 ? element : undefined;
        else if (DecisionModel.isDecision(element)) parent = getChildren(graph, element).length > 0 ? element : undefined;
        else if (AddButtonModel.isAddButton(element)) parent = getParent(graph, element);
        return parent !== undefined && canMoveBelow(graph, data, movedId, parent);
    });
}

/**
 * The cells that move with the node `movedId`: the elements of its subtree
 * with the content of the groups among them, their add buttons, and the
 * links between all of those. For the marks of a move.
 */
export function getMovedCells(graph: dia.Graph, data: DiagramData, movedId: Id): dia.Cell[] {
    const elements = data.getSubtree(movedId)
        .flatMap((id) => [graph.getCell(id), graph.getCell(cellId.addButton(id))])
        .filter((cell): cell is dia.Element => cell !== undefined && cell.isElement());
    return graph.getSubgraph(elements, { deep: true });
}

/** Moves the subtree of `movedId` below `parent`, as its last child. */
export function moveBelow(data: DiagramData, movedId: Id, parent: dia.Element): void {
    const { id, slot } = getSlot(parent);
    data.moveNode(movedId, id, slot, null);
}

/** Moves the subtree of `movedId` into `link`: the link leads to it, and its open leaf on to the former target. */
export function moveOnLink(data: DiagramData, movedId: Id, link: LinkModel): void {
    const source = link.getSourceElement()!;
    const target = link.getTargetElement()!;
    const { id, slot } = getSlot(source);
    data.moveNode(movedId, id, slot, GroupEndModel.isGroupEnd(target) ? null : getId(target));
}

/** Collapses an expanded group, expands a collapsed one. */
export function toggleGroup(data: DiagramData, group: GroupModel): void {
    data.changeNode(getId(group), { collapsed: !group.isCollapsed() });
}
