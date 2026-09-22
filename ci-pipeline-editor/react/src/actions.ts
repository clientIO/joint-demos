import type { dia } from '@joint/plus';

import type { AddChoice } from './add-menu';
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

/** Whether `element` is the root of the tree: nothing leads to it. */
function isRoot(graph: dia.Graph, element: dia.Element): boolean {
    return !getParent(graph, element);
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

/**
 * What a move or a removal takes along: the element alone - the content of
 * a group goes with it, what follows it does not - or the branch: the
 * element and everything below it. The menu of an element offers both.
 */
export type MoveScope = 'node' | 'branch';

/** What the menu calls `target` itself: `the step`, `the decision`, `the fork`, `the loop`, `the end`. */
function getElementName(target: dia.Element): string {
    if (GroupModel.isGroup(target)) return `the ${target.getKind()}`;
    if (DecisionModel.isDecision(target)) return 'the decision';
    if (EndModel.isEnd(target)) return 'the end';
    return 'the step';
}

/** The "move" items of the menu: the element alone, or the branch below it too. */
export function getMoveTitle(scope: MoveScope): string {
    return scope === 'branch' ? 'Move the branch to…' : 'Move to…';
}

/** The "remove" items of the menu: the element alone - its children move up in its place - or the branch below it too. */
export function getRemoveTitle(target: dia.Element, scope: MoveScope): string {
    return scope === 'branch' ? 'Remove the branch' : `Remove ${getElementName(target)}`;
}

/** Whether anything follows `element` in the tree: only then is the branch below it more than the element itself, and the items that act on the branch worth offering. */
export function hasBranch(graph: dia.Graph, element: dia.Element): boolean {
    return getChildren(graph, element).length > 0;
}

/**
 * Whether `element` can leave its place alone - removed, or moved
 * elsewhere: not the root, not a gate, and its children have to be able to
 * move up to its parent, which takes several only where it can branch - a
 * decision or a gate. The last node of a group may go too: its `start` then
 * links straight to its `end`, and the group is refilled through that link.
 */
export function canRemoveNode(graph: dia.Graph, element: dia.Element): boolean {
    if (isGate(element)) return false;
    const parent = getParent(graph, element);
    if (!parent) return false;
    return getChildren(graph, element).length <= 1 || canBranch(parent);
}

/**
 * Whether `element` can go with the branch below it: everything but the
 * root and the gates can. The same question decides whether an element has
 * a menu at all - every item of it acts on one scope or the other.
 */
export function canRemoveBranch(graph: dia.Graph, element: dia.Element): boolean {
    return !isGate(element) && !isRoot(graph, element);
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
 * The cells a removal of `element` takes from the picture: with the branch
 * below it, everything down to the gates of its group; alone, the element
 * itself - a group with its content - and the add button of a leaf, which
 * goes with it. The links between them in both cases. For the red preview
 * before the click.
 */
export function getDeletedCells(graph: dia.Graph, element: dia.Element, scope: MoveScope): dia.Cell[] {
    let elements: dia.Element[];
    if (scope === 'branch') {
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

/** Removes `element` alone: its children move up to its parent, in its place; a group takes its content along. */
export function removeNode(graph: dia.Graph, data: DiagramData, element: dia.Element): void {
    if (!canRemoveNode(graph, element)) return;
    data.spliceNode(getId(element));
}

/** Removes `element` with the branch below it, down to the end of its group. */
export function removeBranch(graph: dia.Graph, data: DiagramData, element: dia.Element): void {
    if (!canRemoveBranch(graph, element)) return;
    data.removeSubtree(getId(element));
}

/** What `Delete` takes away, and what the first "remove" item of the menu offers: `element` alone where its children can move up, the branch below it where they cannot. */
export function getDeleteScope(graph: dia.Graph, element: dia.Element): MoveScope {
    return canRemoveNode(graph, element) ? 'node' : 'branch';
}

/** The node of the data `element` stands for: the group, for a gate; the owner, for an add button. */
function getDataId(graph: dia.Graph, element: dia.Element): Id {
    const id = getId(element);
    if (isGate(element)) return getId(element.getParentCell()!);
    if (AddButtonModel.isAddButton(element)) return getDataId(graph, getParent(graph, element)!);
    return id;
}

/**
 * What a move takes along, as the data sees it: the nodes that move, the
 * leaves the flow can continue from - the node itself, when it moves alone -
 * and whether an end of the diagram is among them, which cannot go into a
 * group.
 */
function getMovedNodes(data: DiagramData, movedId: Id, scope: MoveScope): { ids: Id[]; openLeaves: Id[]; hasEnd: boolean } {
    if (scope === 'branch') {
        return { ids: data.getSubtree(movedId), openLeaves: data.getOpenLeaves(movedId), hasEnd: data.hasEnd(movedId) };
    }
    const isEnd = data.getNode(movedId)?.type === 'end';
    return { ids: data.getContent(movedId), openLeaves: isEnd ? [] : [movedId], hasEnd: isEnd };
}

/**
 * Whether what `scope` takes of `movedId` can be dropped where `parent`
 * gets its children: not into itself, and not with an end of the diagram
 * into a fork or a loop.
 */
export function canMoveBelow(graph: dia.Graph, data: DiagramData, movedId: Id, scope: MoveScope, parent: dia.Element): boolean {
    const { ids, hasEnd } = getMovedNodes(data, movedId, scope);
    if (ids.includes(getDataId(graph, parent))) return false;
    const intoGroup = getContainer(parent) !== null || GroupStartModel.isGroupStart(parent);
    return !(intoGroup && hasEnd);
}

/**
 * Whether what `scope` takes of `movedId` can be dropped into `link`: into
 * a link that takes an insertion, outside of what moves, with exactly one
 * leaf the flow can continue from - the former target of the link follows
 * it - and not with an end into a fork or a loop.
 */
export function canMoveOnLink(graph: dia.Graph, data: DiagramData, movedId: Id, scope: MoveScope, link: dia.Link): boolean {
    if (!canSplit(link)) return false;
    const source = link.getSourceElement()!;
    const target = link.getTargetElement()!;
    const { ids, openLeaves, hasEnd } = getMovedNodes(data, movedId, scope);
    if (ids.includes(getDataId(graph, source)) || ids.includes(getDataId(graph, target))) return false;
    if (openLeaves.length !== 1) return false;
    return !(getContainer(source) !== null && hasEnd);
}

/**
 * The element a drop point would add below: a decision with options and a
 * fork with branches have their own, the `+` at their right end; an add
 * button adds below the leaf it hangs from. `null` for everything else -
 * it is no drop point.
 */
function getDropParent(graph: dia.Graph, element: dia.Element): dia.Element | null {
    if (GroupStartModel.isGroupStart(element)) return element.getKind() === 'fork' && getChildren(graph, element).length > 0 ? element : null;
    if (DecisionModel.isDecision(element)) return getChildren(graph, element).length > 0 ? element : null;
    if (AddButtonModel.isAddButton(element)) return getParent(graph, element) ?? null;
    return null;
}

/**
 * Whether the subtree of `movedId` has anywhere to go: a visible link that
 * takes it, or a visible drop point below an element - the add button of a
 * leaf, the `+` of a decision with options or of a fork. The move is
 * offered only then.
 */
export function hasMoveTarget(graph: dia.Graph, data: DiagramData, movedId: Id, scope: MoveScope): boolean {
    if (graph.getLinks().some((link) => isCellVisible(link) && canMoveOnLink(graph, data, movedId, scope, link))) return true;
    return graph.getElements().some((element) => {
        if (!isCellVisible(element)) return false;
        const parent = getDropParent(graph, element);
        if (!parent) return false;
        return canMoveBelow(graph, data, movedId, scope, parent);
    });
}

/** Whether the menu can offer to move `element` with `scope`: it has to be able to leave its place, and there has to be somewhere to drop it. */
export function canMove(graph: dia.Graph, data: DiagramData, element: dia.Element, scope: MoveScope): boolean {
    const canLeave = scope === 'branch' ? canRemoveBranch(graph, element) && hasBranch(graph, element) : canRemoveNode(graph, element);
    return canLeave && hasMoveTarget(graph, data, getId(element), scope);
}

/**
 * The cells that move with the node `movedId`: the elements of its subtree
 * with the content of the groups among them, their add buttons, and the
 * links between all of those. For the marks of a move.
 */
export function getMovedCells(graph: dia.Graph, data: DiagramData, movedId: Id, scope: MoveScope): dia.Cell[] {
    const elements = getMovedNodes(data, movedId, scope).ids
        .flatMap((id) => [graph.getCell(id), graph.getCell(cellId.addButton(id))])
        .filter((cell): cell is dia.Element => Boolean(cell?.isElement()));
    return graph.getSubgraph(elements, { deep: true });
}

/** Moves what `scope` takes of `movedId` below `parent`, as its last child. */
export function moveBelow(data: DiagramData, movedId: Id, scope: MoveScope, parent: dia.Element): void {
    const { id, slot } = getSlot(parent);
    move(data, movedId, scope, id, slot, null);
}

/** Moves what `scope` takes of `movedId` into `link`: the link leads to it, and its open leaf on to the former target. */
export function moveOnLink(data: DiagramData, movedId: Id, scope: MoveScope, link: LinkModel): void {
    const source = link.getSourceElement()!;
    const target = link.getTargetElement()!;
    const { id, slot } = getSlot(source);
    move(data, movedId, scope, id, slot, GroupEndModel.isGroupEnd(target) ? null : getId(target));
}

/** The edit a drop makes: the branch moves as a whole, the node alone leaves its children behind, in its place. */
function move(data: DiagramData, movedId: Id, scope: MoveScope, parentId: Id, slot: Slot, childId: Id | null): void {
    if (scope === 'branch') data.moveNode(movedId, parentId, slot, childId);
    else data.moveNodeAlone(movedId, parentId, slot, childId);
}

/**
 * The element that stands for node `id` on the diagram: the node's own, or
 * the start of a group, which stands in for it - a group is never rendered.
 * What to select for the node; `null` while the graph has no cell for it.
 */
export function getNodeElement(graph: dia.Graph, id: Id): dia.Element | null {
    const cell = graph.getCell(id);
    if (!cell?.isElement()) return null;
    return GroupModel.isGroup(cell) ? cell.getStart() : cell;
}

/** What a move of the node `id` takes along, named for the hint: `“Lint”` for a step or a decision, `the fork`, `the loop`, `the end`. */
export function describeMoved(data: DiagramData, id: Id): string {
    const node = data.getNode(id);
    switch (node?.type) {
        case 'step':
        case 'decision': return `“${node.label}”`;
        case 'fork': return 'the fork';
        case 'loop': return 'the loop';
        case 'end': return 'the end';
        default: return 'it';
    }
}

/** Collapses an expanded group, expands a collapsed one. */
export function toggleGroup(data: DiagramData, group: GroupModel): void {
    data.changeNode(getId(group), { collapsed: !group.isCollapsed() });
}
