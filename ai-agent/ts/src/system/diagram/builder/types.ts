import type { dia } from '@joint/plus';
import type { SystemNode, SystemButton, SystemButtonLine, SystemEdge, SystemPlaceholder } from '../models';
import type { SystemTypedNodeData } from '../types';

export interface DiagramCells {
    nodes: Array<SystemNode | SystemPlaceholder>;
    fixedNodes: Array<SystemNode>;
    edges: Array<SystemEdge>;
    buttons: Array<SystemButton>;
    buttonLines: Array<SystemButtonLine>;
}

export type AutoLayoutDiagramCells = Omit<DiagramCells, 'fixedNodes'>;

export type BuildNode = (node: SystemTypedNodeData, id: string) => dia.Graph.CellInit;

export type GrowthLimit = (node: SystemTypedNodeData) => number;

export interface BuildDiagramOptions {
    /**
     * Function to create a node element from its JSON representation.
     * It can return either a CellInit object or a Cell instance.
     */
    buildNode?: BuildNode;
    /**
     * Function to determine the growth limit for a given node.
     */
    growthLimit?: GrowthLimit;
    disableOptimalOrderHeuristic?: boolean;
}
