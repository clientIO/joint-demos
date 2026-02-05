import type { dia } from '@joint/plus';
import type { SystemNode, SystemEdge } from '../models';
import type { SystemTypedNodeData } from '../types';

export interface DiagramCells {
    nodes: Array<SystemNode>;
    fixedNodes: Array<SystemNode>;
    edges: Array<SystemEdge>;
}

export type AutoLayoutDiagramCells = Omit<DiagramCells, 'fixedNodes'>;

export type BuildNode = (node: SystemTypedNodeData, id: string) => dia.Graph.CellInit;

export interface BuildDiagramOptions {
    /**
     * Function to create a node element from its JSON representation.
     * It can return either a CellInit object or a Cell instance.
     */
    buildNode?: BuildNode;
    disableOptimalOrderHeuristic?: boolean;
}
