import type { Attribute } from './const';
import type { SystemNodeData, SystemEdgeData, SystemDiagramJSON } from '../system/diagram/types';
import type { dia } from '@joint/plus';
import type { Node, Edge } from '../diagram/models';
import type { applicationModelNamespace } from './namespaces';

/**
 * Extended EdgeData interface that includes additional properties
 * specific to the Marketing Automation application.
 */
export interface EdgeData extends SystemEdgeData {
    [Attribute.EdgeCondition]?: string;
}

/**
 * Node types derived from all application models.
 */
export type NodeType = Extract<keyof typeof applicationModelNamespace, string>;

/**
 * Extended NodeData interface that includes additional properties
 * specific to the Marketing Automation application.
 */
export interface NodeData extends SystemNodeData<NodeType, EdgeData> {
    [Attribute.Label]?: string;
    [Attribute.Size]?: { width: number; height: number };
    [key: string]: unknown; // Allow any other properties
}

export interface TypedNodeData extends NodeData {
    type: NodeType;
}

export interface DiagramFileJSON {
    diagram: SystemDiagramJSON<NodeData>;
    name?: string;
}

export type Model = Node | Edge;

export type NodeView = dia.ElementView<Node>;

export type EdgeView = dia.LinkView<Edge>;
