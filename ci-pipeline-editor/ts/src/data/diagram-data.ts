import { mvc, util } from '@joint/plus';

import type { DiagramJSON, Edge, GroupData, Id, NodeData, Slot } from './types';

/** Whether `node` is a group: a fork or a loop. */
export function isGroupData(node: NodeData): node is GroupData {
    return node.type === 'fork' || node.type === 'loop';
}

/**
 * The name of an unnamed option: the option `index` of a decision is
 * `option 1`, `option 2`, ..., the branch `index` of a fork (or of a loop)
 * `branch 1`, `branch 2`, ... - on the diagram and in the YAML alike.
 */
export function getDefaultOptionName(type: NodeData['type'], index: number): string {
    return `${type === 'decision' ? 'option' : 'branch'} ${index + 1}`;
}

/** The edges of `node` in `slot`: none for an end, none in `branches` for anything but a group. */
export function getEdges(node: NodeData, slot: Slot): Edge[] {
    if (node.type === 'end') return [];
    if (slot === 'branches') return isGroupData(node) ? node.branches ?? [] : [];
    return node.to ?? [];
}

/** Replaces the edges of `node` in `slot`; an empty list leaves the key out. */
function setEdges(node: NodeData, slot: Slot, edges: Edge[]): void {
    if (node.type === 'end') {
        if (edges.length > 0) throw new Error('An end leads nowhere.');
        return;
    }
    if (slot === 'branches') {
        if (!isGroupData(node)) throw new Error(`A ${node.type} has no branches.`);
        if (edges.length > 0) node.branches = edges; else delete node.branches;
        return;
    }
    if (edges.length > 0) node.to = edges; else delete node.to;
}

interface EdgeRef {
    parentId: Id;
    slot: Slot;
    index: number;
}

/** Where the edge into `childId` is: in which node, which list, at which position. Every node but the root has one. */
function findEdge(json: DiagramJSON, childId: Id): EdgeRef | null {
    for (const [parentId, node] of Object.entries(json)) {
        for (const slot of ['to', 'branches'] as const) {
            const index = getEdges(node, slot).findIndex((edge) => edge.id === childId);
            if (index >= 0) return { parentId, slot, index };
        }
    }
    return null;
}

/** The ids of `id` and everything below it - what it leads to and, for a group, its branches - recursively. */
function collectSubtree(json: DiagramJSON, id: Id): Id[] {
    const ids = new Set<Id>();
    const stack = [id];
    while (stack.length > 0) {
        const current = stack.pop()!;
        const node = json[current];
        if (!node || ids.has(current)) continue;
        ids.add(current);
        for (const slot of ['to', 'branches'] as const) {
            stack.push(...getEdges(node, slot).map((edge) => edge.id));
        }
    }
    return [...ids];
}

/**
 * The ids of the nodes that follow `id` (and `id` itself) along `to`: the
 * path the flow takes from it - not into the branches of a group.
 */
function collectPath(json: DiagramJSON, id: Id): Id[] {
    const ids = new Set<Id>();
    const stack = [id];
    while (stack.length > 0) {
        const current = stack.pop()!;
        const node = json[current];
        if (!node || ids.has(current)) continue;
        ids.add(current);
        stack.push(...getEdges(node, 'to').map((edge) => edge.id));
    }
    return [...ids];
}

/** Takes the edge into `id` out of its parent. Returns the edge and where it was; `null` for the root. */
function detach(json: DiagramJSON, id: Id): { ref: EdgeRef; edge: Edge } | null {
    const ref = findEdge(json, id);
    if (!ref) return null;
    const edges = [...getEdges(json[ref.parentId], ref.slot)];
    const [edge] = edges.splice(ref.index, 1);
    setEdges(json[ref.parentId], ref.slot, edges);
    return { ref, edge };
}

/**
 * The source of truth: the nodes of the diagram by id, each an attribute of
 * the model (see `types.ts`). Every edit is one of the methods below. Each
 * takes a copy of the data, changes it and sets it back, in a batch: the
 * command manager records the edit as one undoable step, and the graph is
 * rebuilt from the data once (see the app).
 */
export class DiagramData extends mvc.Model<DiagramJSON> {

    private idCounter = 0;

    getNode(id: Id): NodeData | undefined {
        return this.get(id);
    }

    /** The whole diagram, as it is: not a copy. */
    getData(): DiagramJSON {
        return this.attributes as DiagramJSON;
    }

    /** The id of the root: the node of type `start`. */
    getRootId(): Id {
        const root = Object.entries(this.getData()).find(([, node]) => node.type === 'start');
        if (!root) throw new Error('The diagram has no start.');
        return root[0];
    }

    /** Resets the diagram: the start stays, alone, with no trigger. */
    reset(): void {
        const rootId = this.getRootId();
        this.setData((json) => {
            for (const id of Object.keys(json)) {
                if (id !== rootId) delete json[id];
            }
            const root = json[rootId];
            if (root.type === 'start') delete root.on;
            setEdges(root, 'to', []);
        });
    }

    /** Replaces the whole diagram. */
    fromJSON(json: DiagramJSON): void {
        this.setData((data) => {
            for (const id of Object.keys(data)) delete data[id];
            Object.assign(data, util.cloneDeep(json));
        });
    }

    /** Adds `node` at the end of `slot` of the node `parentId`: as its successor, its new option or its new branch. */
    appendNode(node: NodeData, parentId: Id, slot: Slot): Id {
        return this.setData((json) => {
            const id = this.createNode(json, node);
            setEdges(json[parentId], slot, [...getEdges(json[parentId], slot), { id }]);
            return id;
        });
    }

    /**
     * Inserts `node` into the edge from `parentId` to `childId` in `slot`:
     * the edge leads to the new node now, and the new node on to the child.
     * The name stays with the edge: the new node is the option now. With no
     * child - into the empty `branches` of a group - the node is added.
     */
    insertNode(node: NodeData, parentId: Id, slot: Slot, childId: Id | null): Id {
        return this.setData((json) => {
            const id = this.createNode(json, node);
            const edges = [...getEdges(json[parentId], slot)];
            const index = childId === null ? -1 : edges.findIndex((edge) => edge.id === childId);
            if (index < 0) {
                edges.push({ id });
            } else {
                edges[index] = { ...edges[index], id };
                setEdges(json[id], 'to', [{ id: childId! }]);
            }
            setEdges(json[parentId], slot, edges);
            return id;
        });
    }

    /** Removes the node `id` with everything below it. */
    removeSubtree(id: Id): void {
        this.setData((json) => {
            detach(json, id);
            for (const member of collectSubtree(json, id)) delete json[member];
        });
    }

    /**
     * Takes the node `id` out of its place and lets its parent lead to its
     * children instead. A single child takes over the name of the edge, and
     * so stays the option the node was. The node keeps its branches, if it is
     * a group, and leads nowhere afterwards.
     */
    private spliceOut(json: DiagramJSON, id: Id): void {
        const children = getEdges(json[id], 'to');
        const detached = detach(json, id);
        if (detached) {
            const { ref, edge } = detached;
            const edges = [...getEdges(json[ref.parentId], ref.slot)];
            const moved = children.length === 1 && edge.name !== undefined
                ? [{ ...children[0], name: edge.name }]
                : children;
            edges.splice(ref.index, 0, ...moved);
            setEdges(json[ref.parentId], ref.slot, edges);
        }
        setEdges(json[id], 'to', []);
    }

    /**
     * Removes the node `id` and lets its parent lead to its children in its
     * place. A group goes with its branches.
     */
    spliceNode(id: Id): void {
        this.setData((json) => {
            this.spliceOut(json, id);
            // The children stay: only the node and, for a group, its branches go.
            for (const member of collectSubtree(json, id)) delete json[member];
        });
    }

    /**
     * Moves the node `id`, with everything below it, into `slot` of the node
     * `parentId`: at the end of the list, or in place of the edge to
     * `childId`, which the open leaf of the moved subtree then leads to
     * (see `insertNode()`). A name belongs to the edge, not to the node: the
     * edge the node lands in keeps its name, so an option stays the option
     * it was named; the name of the edge the node leaves stays behind. With
     * `dropEnds` the ends of the diagram inside the branch are deleted on the
     * way: no end may stand inside a group, and nothing can follow one, so
     * the flow continues from the leaves they hung on.
     */
    moveNode(id: Id, parentId: Id, slot: Slot, childId: Id | null, dropEnds: boolean): void {
        this.setData((json) => {
            detach(json, id);
            if (dropEnds) {
                for (const member of collectSubtree(json, id)) {
                    if (json[member].type !== 'end') continue;
                    detach(json, member);
                    delete json[member];
                }
            }
            this.attachNode(json, id, parentId, slot, childId);
        });
    }

    /**
     * Moves the node `id` alone into `slot` of the node `parentId`, as
     * `moveNode()` does - but what followed it stays behind: its parent
     * leads to its children in its place. A group takes its branches along.
     */
    moveNodeAlone(id: Id, parentId: Id, slot: Slot, childId: Id | null): void {
        this.setData((json) => {
            this.spliceOut(json, id);
            this.attachNode(json, id, parentId, slot, childId);
        });
    }

    /** Puts the node `id` into `slot` of the node `parentId`: at the end of the list, or in place of the edge to `childId`, which the open leaf of the node then leads to. */
    private attachNode(json: DiagramJSON, id: Id, parentId: Id, slot: Slot, childId: Id | null): void {
        const edges = [...getEdges(json[parentId], slot)];
        const index = childId === null ? -1 : edges.findIndex((candidate) => candidate.id === childId);
        if (index < 0) {
            edges.push({ id });
        } else {
            edges[index] = { ...edges[index], id };
            const [leaf] = this.getOpenLeaves(id, { json });
            if (!leaf) throw new Error(`Nothing below ${id} can lead on to ${childId}.`);
            setEdges(json[leaf], 'to', [{ id: childId! }]);
        }
        setEdges(json[parentId], slot, edges);
    }

    /** The ids of the node `id` and everything below it: what a move of the branch takes along. */
    getSubtree(id: Id): Id[] {
        return collectSubtree(this.getData(), id);
    }

    /**
     * The ids of the node `id` and what it keeps inside - the branches of a
     * group, recursively - but not what follows it: what a move of the node
     * alone takes along.
     */
    getContent(id: Id): Id[] {
        const json = this.getData();
        const node = json[id];
        if (!node || !isGroupData(node)) return [id];
        return [id, ...getEdges(node, 'branches').flatMap((edge) => collectSubtree(json, edge.id))];
    }

    /**
     * The leaves of the path from `id` that the flow can continue from: those
     * that are not an end. `withoutEnds` answers for the path as it would be
     * with the ends of the diagram taken out of it - a node that leads to one
     * is a leaf then (see `moveNode()`).
     */
    getOpenLeaves(id: Id, { json = this.getData(), withoutEnds = false } = {}): Id[] {
        return collectPath(json, id).filter((member) => {
            const node = json[member];
            if (node.type === 'end') return false;
            const children = getEdges(node, 'to');
            return withoutEnds ? children.every((edge) => json[edge.id].type === 'end') : children.length === 0;
        });
    }

    /** Whether the path from `id` reaches an end of the diagram - which cannot be inside a fork or a loop, and which a move into one drops (see `moveNode()`). */
    hasEnd(id: Id): boolean {
        return collectPath(this.getData(), id).some((member) => this.getData()[member].type === 'end');
    }

    /** Names the option `index` of `slot` of the node `parentId` - the edge to it - or, with `null`, takes the name off. */
    setOptionName(parentId: Id, slot: Slot, index: number, name: string | null): void {
        this.setData((json) => {
            const edges = [...getEdges(json[parentId], slot)];
            const edge = edges[index];
            if (!edge) return;
            edges[index] = name ? { ...edge, name } : { id: edge.id };
            setEdges(json[parentId], slot, edges);
        });
    }

    /** Changes some of the fields of the node `id`: its label, whether a group is collapsed. An empty or undefined value takes the field out. */
    changeNode(id: Id, change: Partial<NodeData>): void {
        this.setData((json) => {
            const node = json[id] as unknown as Record<string, unknown>;
            for (const [field, value] of Object.entries(change)) {
                if (value === undefined || value === '') delete node[field]; else node[field] = value;
            }
        });
    }

    /** Puts `node` into `json` under a fresh id. */
    private createNode(json: DiagramJSON, node: NodeData): Id {
        let id: Id;
        do {
            this.idCounter += 1;
            id = `n${this.idCounter}`;
        } while (id in json);
        json[id] = util.cloneDeep(node);
        return id;
    }

    /**
     * Applies `action` to a copy of the data and sets the result back - the
     * nodes that changed, and the nodes that are gone unset - within a
     * batch, which the command manager stores as one command.
     */
    private setData<T>(action: (json: DiagramJSON) => T): T {
        const json = util.cloneDeep(this.attributes) as DiagramJSON;
        const result = action(json);
        this.trigger('batch:start', { batchName: 'edit' });
        for (const id of Object.keys(this.attributes)) {
            if (!(id in json)) this.unset(id);
        }
        this.set(json);
        this.trigger('batch:stop', { batchName: 'edit' });
        return result;
    }
}
