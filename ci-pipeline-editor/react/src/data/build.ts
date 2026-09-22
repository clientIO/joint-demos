import type { dia } from '@joint/plus';

import { AddButtonModel, DecisionModel, EndModel, GroupModel, GroupEndModel, GroupStartModel, LinkModel, StartModel, StepModel } from '../shapes';
import { getEdges, isGroupData } from './diagram-data';
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
 * The id of the node a cell stands for. The build gives the cell of a node
 * the id of the node - a string, the key of the node in the data - so the id
 * of the cell is the id of the node; JointJS types it `string | number`,
 * and this is the one place that narrows it.
 */
export function getId(cell: dia.Cell): Id {
    return cell.id as Id;
}

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
        case 'start': return StartModel.create(node.on);
        case 'step': return StepModel.create(node.label, node.run);
        case 'end': return EndModel.create();
        // A decision with an option shows its own add button, which adds another; without, it is a leaf with the usual button below.
        case 'decision': return DecisionModel.create(node.label, getEdges(node, 'to').length >= 1);
        case 'fork':
        case 'loop': {
            const group = GroupModel.create(node.type);
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
 * for the layout to set (see `runLayout()` in `layout/index.ts`), the sizes
 * for the React components to measure.
 */
export function buildGraph(graph: dia.Graph, json: DiagramJSON): void {
    const containers = getContainers(json);
    const elements: dia.Element[] = [];
    const links: LinkModel[] = [];
    const elementOf = new Map<Id, dia.Element>();
    const gatesOf = new Map<Id, { start: GroupStartModel; end: GroupEndModel }>();
    const contentOf = new Map<Id, dia.Cell[]>();

    /** Puts `cell` inside the group `groupId`, if it is in one. */
    function embed(cell: dia.Cell, groupId: Id | null): void {
        if (!groupId) return;
        cell.set({ parent: groupId });
        const content = contentOf.get(groupId) ?? [];
        content.push(cell);
        contentOf.set(groupId, content);
    }

    function link(source: dia.Element, target: dia.Element, groupId: Id | null): LinkModel {
        const cell = LinkModel.create(source, target);
        cell.set({ id: cellId.link(source.id, target.id) });
        embed(cell, groupId);
        links.push(cell);
        return cell;
    }

    function connect(source: dia.Element, edge: Edge, index: number, groupId: Id | null): void {
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
        embed(element, containers.get(id) ?? null);

        if (!isGroupData(node)) continue;
        // A fork with a branch shows its own add button, which adds another; an empty one gets its first branch through the link from its start to its end.
        const start = GroupStartModel.create(node.type, Boolean(node.collapsed), getEdges(node, 'branches').length >= 1);
        start.set({ id: cellId.start(id) });
        const end = GroupEndModel.create();
        end.set({ id: cellId.end(id) });
        gatesOf.set(id, { start, end });
        elements.push(start, end);
        embed(start, id);
        embed(end, id);
    }

    // The links: one per edge, and those the structure implies.
    for (const [id, node] of Object.entries(json)) {
        const element = elementOf.get(id)!;
        const groupId = containers.get(id) ?? null;
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
        if (groupId) {
            // A leaf inside a group leads to the end of the group.
            link(element, gatesOf.get(groupId)!.end, groupId);
        } else {
            // A leaf outside gets the button that adds below it, laid out like a child.
            const button = new AddButtonModel();
            button.set({ id: cellId.addButton(id) });
            elements.push(button);
            link(element, button, null);
        }
    }

    for (const [groupId, content] of contentOf) {
        elementOf.get(groupId)!.set({ embeds: content.map((cell) => cell.id) });
    }

    // The sizes are measured from what React renders (see `shapes/`): an
    // element that is in the graph already keeps the size it was measured at,
    // instead of being reset to the default and measured again.
    for (const element of elements) {
        const existing = graph.getCell(element.id);
        if (existing?.isElement()) element.set('size', existing.size());
    }

    graph.syncCells([...elements, ...links], { remove: true });

    // The sync keeps the attributes of a cell that stands for the same thing
    // as before, a `parent` it no longer has included: a node that left a
    // group (moved, or by an undo) has its `parent` taken off.
    for (const cell of [...elements, ...links]) {
        if (cell.get('parent') === undefined) graph.getCell(cell.id)?.unset('parent');
    }
}
