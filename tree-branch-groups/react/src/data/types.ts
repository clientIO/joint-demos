/** The id of a node of the data - and of the element that stands for it in the graph. */
export type Id = string;

/**
 * An edge to a child. Where the child is an option of a decision or a
 * branch of a fork, the edge may carry its name (`Staging`); the layout
 * numbers the unnamed ones (`option 1`, `option 2`, ...).
 */
export interface Edge {
    id: Id;
    name?: string;
}

/**
 * A node of the diagram: what the data holds about it, and which nodes it
 * leads to. A step has a label and, as the case may be, the command it
 * runs; a step, a decision or a group may carry a comment, which the YAML
 * shows above it. Every node but an end has a `to` list - what follows it: one
 * edge, or one per option of a decision. A group has `branches` too: the
 * children of its `start`. The leaves of the branches meet in the `end` of
 * the group - the gates, the links, the add buttons are not in the data:
 * the build derives them (see `build.ts`).
 */
export type NodeData =
    | { type: 'start'; to?: Edge[] }
    | { type: 'step'; label: string; run?: string; comment?: string; to?: Edge[] }
    | { type: 'decision'; label: string; comment?: string; to?: Edge[] }
    | { type: 'fork'; branches?: Edge[]; collapsed?: boolean; comment?: string; to?: Edge[] }
    | { type: 'loop'; branches?: Edge[]; collapsed?: boolean; comment?: string; to?: Edge[] }
    | { type: 'end' };

export type GroupData = Extract<NodeData, { type: 'fork' | 'loop' }>;

/** The two lists of edges a node can have: `to` on every node but an end, `branches` on a group. */
export type Slot = 'to' | 'branches';

/** The whole diagram: its nodes by id. The root is the node of type `start`. */
export type DiagramJSON = Record<Id, NodeData>;
