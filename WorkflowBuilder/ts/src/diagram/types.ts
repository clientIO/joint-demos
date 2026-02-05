import type { Attribute } from './const';
import type { SystemNodeData, SystemEdgeData, SystemDiagramJSON } from '../system/diagram/types';
import type { dia } from '@joint/plus';
import type { Node, Edge, DiagramNode } from '../diagram/models';
import type { applicationModelNamespace } from './namespaces';

/**
 * Extended EdgeData interface that includes additional properties
 * specific to the AI Agent application.
 */
export interface EdgeData extends SystemEdgeData {
}

/**
 * Node types derived from all application models.
 */
export type NodeType = Extract<keyof typeof applicationModelNamespace, string>;

/**
 * Extended NodeData interface that includes additional properties
 * specific to the AI Agent application.
 */
export interface NodeData extends SystemNodeData<NodeType, EdgeData> {
    [Attribute.Label]?: string;
    [Attribute.Size]?: { width: number; height: number };
    [key: string]: unknown; // Allow any other properties
}

export interface TypedNodeData extends NodeData {
    type: NodeType;
}

export type DiagramJSON = SystemDiagramJSON<NodeData>;

export interface DiagramFileJSON {
    diagram: DiagramJSON;
    name?: string;
}

export type Model = Node | Edge;

export type NodeView = dia.ElementView<Node>;

export type EdgeView = dia.LinkView<Edge>;

export interface OutlineNode extends dia.Cell {

    getDefaultOutlineAttributes(): object;

    getHoverOutlineAttributes(): object;

    getSelectedOutlineAttributes(): object;
}

export interface Configurable<C extends object = object> extends DiagramNode {

    isConfigured(): boolean;

    getConfigurationKey(): string | null;

    setConfigurationKey(key: string, options?: dia.Cell.Options): void;

    unsetConfiguration(): void;

    updateConfiguration(configuration: C, options?: dia.Cell.Options): void;
}
