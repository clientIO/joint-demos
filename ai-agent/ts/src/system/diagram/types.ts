import type { dia } from '@joint/plus';
import type { Attribute } from './const';
import type DiagramData from './data/DiagramData';

export type NodeType = string;

export interface NodeCustomPosition {
    refId?: dia.Cell.ID;
    x: number;
    y: number;
}

export interface SystemNodeData<
    T extends string = string,
    E extends SystemEdgeData = SystemEdgeData
> {
    type?: T;
    to?: E[];
    [Attribute.CustomPosition]?: NodeCustomPosition;
}

export interface SystemTypedNodeData extends SystemNodeData {
    type: string;
}

export interface SystemEdgeData {
    id?: dia.Cell.ID;
}

export interface SystemDiagramJSON<N extends SystemNodeData = SystemNodeData> {
    [id: dia.Cell.ID]: N;
}

export interface SystemDiagramContext<N extends SystemNodeData = SystemNodeData> {
    diagramData: DiagramData<N>;
    graph: dia.Graph;
    history: dia.CommandManager;
    paper: dia.Paper;
}

/**
 * Extracts the edge type from the node data's "to" array.
 */
export type ToEdge<T> = T extends { to: (infer U)[] } ? U : unknown;

/**
 * Base interface for system models (nodes and edges).
 */
export interface SystemModel extends dia.Cell {

    getDataPath(): string;
}

