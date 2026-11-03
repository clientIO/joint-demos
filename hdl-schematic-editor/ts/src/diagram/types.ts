import type { dia, ui } from '@joint/plus';
import type { Attribute } from './const';
import type { SystemNodeData, SystemEdgeData, SystemDiagramJSON } from '../system/diagram/types';
import type { CellParameters, PortDirection } from '../registry/types';
import type { YosysValue } from '../yosys/types';
import type { Node, Edge } from './models';
import type { applicationModelNamespace } from './namespaces';

/**
 * Extended EdgeData interface that includes additional properties
 * specific to the HDL schematic application.
 */
export interface EdgeData extends SystemEdgeData {
}

/**
 * Node types derived from all application models.
 */
export type NodeType = Extract<keyof typeof applicationModelNamespace, string>;

/**
 * A port of a generic block.
 */
export interface BlockPort {
    id: string;
    direction: PortDirection;
    width: number;
}

/**
 * A bit range `[lo, hi]` (inclusive).
 */
export type BitRange = [number, number];

/**
 * Extended NodeData interface that includes additional properties
 * specific to the HDL schematic application.
 */
export interface NodeData extends SystemNodeData<NodeType, EdgeData> {
    [Attribute.Name]?: string;
    [Attribute.Width]?: number;
    [Attribute.Value]?: string;
    [Attribute.CellType]?: string;
    [Attribute.Parameters]?: CellParameters | Record<string, YosysValue>;
    [Attribute.CellAttributes]?: Record<string, YosysValue>;
    [Attribute.CellPorts]?: BlockPort[];
    [Attribute.Ranges]?: BitRange[];
    [Attribute.NetNames]?: Record<string, string>;
    [key: string]: unknown; // Allow any other properties
}

export interface TypedNodeData extends NodeData {
    type: NodeType;
}

export type DiagramJSON = SystemDiagramJSON<NodeData>;

export type Model = Node | Edge;

export type NodeView = dia.ElementView<Node>;

export type EdgeView = dia.LinkView<Edge>;

/**
 * Interface for configuring the model's inspector UI.
 */
export interface InspectorConfig extends ui.Inspector.Options {
    headerText?: string;
    headerHint?: string;
    headerSymbol?: string;
}
