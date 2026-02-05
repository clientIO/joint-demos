import { dia, util } from '@joint/plus';
import { Attribute } from '../const';
import { config } from '../../configs/system';

import type { SystemEdge } from '../models';
import type { DiagramCells } from './types';
import type { SystemNode } from '../models';

/**
 * Extracts and categorizes cells from the given graph into nodes, fixed nodes,
 * edges, buttons, and button lines.
 */
export function extractGraphCells(graph: dia.Graph): DiagramCells {
    const nodes: Array<SystemNode> = [];
    const fixedNodes: Array<SystemNode> = [];
    const edges: Array<SystemEdge> = [];

    graph.getElements().forEach(element => {
        if (element.get(Attribute.CustomPosition)) {
            if (graph.getConnectedLinks(element).length > 0) {
                throw new Error('Relative position can not be currently used with links');
            }
            fixedNodes.push(element as SystemNode);
        } else {
            nodes.push(element as SystemNode);

            // Add edges in the order defined in the data
            const nodeEdges = graph.getConnectedLinks(element, { outbound: true });
            const nodeSortedEdges = util.sortBy(nodeEdges, link => element.getGroupPorts(config.outboundPortGroupName).findIndex(port => port.id === link.source().port));
            edges.push(...nodeSortedEdges);
        }
    });

    return {
        nodes,
        fixedNodes,
        edges
    };
}

/**
 * Type guard to check if a NodeInit is a dia.Cell.JSON object.
 */
export function isNodeJSON(nodeInit: dia.Graph.CellInit): nodeInit is dia.Cell.JSON {
    return !(nodeInit instanceof dia.Cell);
}

/**
 * Sets an attribute on a node, whether it's a dia.Cell instance or a JSON object.
 */
export function setNodeAttribute(nodeInit: dia.Graph.CellInit, attributeName: string, value: unknown): void {
    if (isNodeJSON(nodeInit)) {
        nodeInit[attributeName] = value;
    } else {
        nodeInit.set(attributeName, value);
    }
}
