import type { dia } from '@joint/plus';

import { AddButton, Decision, End, Group, GroupEnd, GroupStart, Link, Start, Step } from '../shapes';
import { getEdges, isGroupData } from './DiagramData';
import type { DiagramJSON, Edge, Id, NodeData } from './types';

/**
 * The ids of the cells the build derives for a node: the gates of a group,
 * the links, the add button of a leaf. The node itself keeps its id. Fixed
 * ids let the build sync the graph instead of rebuilding it: a cell that
 * stands for the same thing is updated in place and keeps its view. The
 * derived ids cannot collide with each other or with the ids of the data:
 * each has a prefix of its own, and a link's carries its ends as JSON.
 */
export const cellId = {
    start: (id: Id) => `start#${id}`,
    end: (id: Id) => `end#${id}`,
    link: (from: dia.Cell.ID, to: dia.Cell.ID) => `link#${JSON.stringify([from, to])}`,
    addButton: (id: Id) => `add#${id}`
};

/**
 * Which group every node is a direct part of: a branch of the group, or
 * anything a branch leads to. The branches of a nested group are parts of
 * the nested group, not of the outer one.
 */
function getContainers(json: DiagramJSON): Map<Id, Id> {
    const containers = new Map<Id, Id>();
    for (const [groupId, node] of Object.entries(json)) {
        const stack = getEdges(node, 'branches').map((edge) => edge.id);
        while (stack.length > 0) {
            const id = stack.pop()!;
            containers.set(id, groupId);
            stack.push(...getEdges(json[id], 'to').map((edge) => edge.id));
        }
    }
    return containers;
}

/** The element that stands for `node`: a pill, a circle, or a group - never rendered, laid out as one node. */
function createElement(node: NodeData): dia.Element {
    switch (node.type) {
        case 'start': return Start.create();
        case 'step': return Step.create(node.label, node.run);
        case 'end': return End.create();
        case 'decision': {
            const decision = Decision.create(node.label);
            // A decision with an option shows its own add button, which adds another; without, it is a leaf with the usual button below.
            decision.setAddButtonVisible(getEdges(node, 'to').length >= 1);
            return decision;
        }
        case 'fork':
        case 'loop': {
            const group = Group.create(node.type);
            group.set({ collapsed: Boolean(node.collapsed) });
            return group;
        }
    }
}

/**
 * Translates the data into the graph: an element per node; for a group its
 * gates, the link from `start` straight to `end` when it is empty and the
 * return link of a loop; a link per edge; a link from every leaf inside a
 * group to the `end` of the group; an add button below every leaf outside.
 * The cells are synced into the graph: those that stand for the same thing
 * as before are updated, the others added or removed. The positions are
 * for the layout to set (see `runLayout()` in `layout/index.ts`).
 */
export function buildGraph(graph: dia.Graph, json: DiagramJSON): void {
    const containers = getContainers(json);
    const elements: dia.Element[] = [];
    const links: Link[] = [];
    const elementOf = new Map<Id, dia.Element>();
    const gatesOf = new Map<Id, { start: GroupStart; end: GroupEnd }>();
    const contentOf = new Map<Id, dia.Cell[]>();

    /** Puts `cell` inside the group `groupId`, if any. */
    function embed(cell: dia.Cell, groupId: Id | undefined): void {
        if (groupId === undefined) return;
        cell.set({ parent: groupId });
        const content = contentOf.get(groupId) ?? [];
        content.push(cell);
        contentOf.set(groupId, content);
    }

    function link(source: dia.Element, target: dia.Element, groupId: Id | undefined): Link {
        const cell = Link.create(source, target);
        cell.set({ id: cellId.link(source.id, target.id) });
        embed(cell, groupId);
        links.push(cell);
        return cell;
    }

    function connect(source: dia.Element, edge: Edge, index: number, groupId: Id | undefined): void {
        const child = elementOf.get(edge.id);
        if (!child) throw new Error(`Node ${edge.id} is missing.`);
        // The layout orders the siblings by rank; the names go on the links after the layout.
        child.set({ siblingRank: index, optionName: edge.name || null });
        link(source, child, groupId);
    }

    // The elements: one per node, inside the group the node is a part of; a group with its gates.
    for (const [id, node] of Object.entries(json)) {
        const element = createElement(node);
        element.set({ id });
        elementOf.set(id, element);
        elements.push(element);
        embed(element, containers.get(id));

        if (!isGroupData(node)) continue;
        const start = GroupStart.create(node.type);
        // A fork with a branch shows its own add button, which adds another; an empty one gets its first branch through the link from its start to its end.
        start.setAddButtonVisible(getEdges(node, 'branches').length >= 1);
        start.set({ id: cellId.start(id) });
        start.setCollapsed(Boolean(node.collapsed));
        const end = GroupEnd.create();
        end.set({ id: cellId.end(id) });
        gatesOf.set(id, { start, end });
        elements.push(start, end);
        embed(start, id);
        embed(end, id);
    }

    // The links: one per edge, and those the structure implies.
    for (const [id, node] of Object.entries(json)) {
        const element = elementOf.get(id)!;
        const groupId = containers.get(id);
        const to = getEdges(node, 'to');
        to.forEach((edge, index) => connect(element, edge, index, groupId));

        if (isGroupData(node)) {
            const { start, end } = gatesOf.get(id)!;
            const branches = getEdges(node, 'branches');
            branches.forEach((edge, index) => connect(start, edge, index, id));
            // An empty group: `start` links straight to `end`, and is refilled through that link.
            if (branches.length === 0) link(start, end, id);
            // The return path of a loop, against the flow.
            if (node.type === 'loop') link(end, start, id).setBackward(true);
        }

        if (to.length > 0 || node.type === 'end') continue;
        if (groupId !== undefined) {
            // A leaf inside a group leads to the end of the group.
            link(element, gatesOf.get(groupId)!.end, groupId);
        } else {
            // A leaf outside gets the button that adds below it, laid out like a child.
            const button = new AddButton();
            button.set({ id: cellId.addButton(id) });
            elements.push(button);
            link(element, button, undefined);
        }
    }

    for (const [groupId, content] of contentOf) {
        elementOf.get(groupId)!.set({ embeds: content.map((cell) => cell.id) });
    }

    graph.syncCells([...elements, ...links], { remove: true });

    // The sync keeps the attributes of a cell that stands for the same thing
    // as before, a `parent` it no longer has included: a node that left a
    // group (moved, or by an undo) has its `parent` taken off.
    for (const cell of [...elements, ...links]) {
        if (cell.get('parent') === undefined) graph.getCell(cell.id)?.unset('parent');
    }
}
