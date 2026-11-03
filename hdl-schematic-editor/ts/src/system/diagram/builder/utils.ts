import { dia, util } from '@joint/plus';
import { Attribute } from '../const';
import { config } from '../../configs/system';

import type { SystemEdge } from '../models';
import type { DiagramCells } from './types';
import type { SystemNode } from '../models';

/**
 * The maximum number of edges per port (used to sort the edges by the port and the edge index).
 */
const EDGES_PER_PORT = 1e6;

/**
 * Extracts and categorizes cells from the given graph into nodes, fixed nodes,
 * edges, buttons, and button lines.
 * The cells are returned in the order defined in the data (the layout depends on the order):
 * the nodes in the order of `nodeIds` (if given), the edges of each node in the order
 * of its outbound ports and then in the order of the node's `to` array.
 * The order of the cells in the graph is not used, it changes with the edits
 * (e.g. a cell re-added to the graph, a link with reconnected ends).
 */
export function extractGraphCells(graph: dia.Graph, nodeIds?: dia.Cell.ID[]): DiagramCells {
    const nodes: Array<SystemNode> = [];
    const fixedNodes: Array<SystemNode> = [];
    const edges: Array<SystemEdge> = [];

    let elements = graph.getElements();
    if (nodeIds) {
        const nodeIndices = new Map(nodeIds.map((id, index) => [`${id}`, index]));
        elements = util.sortBy(elements, element => nodeIndices.get(`${element.id}`) ?? Infinity);
    }

    elements.forEach(element => {
        if (element.get(Attribute.CustomPosition)) {
            if (graph.getConnectedLinks(element).length > 0) {
                throw new Error('Relative position can not be currently used with links');
            }
            fixedNodes.push(element as SystemNode);
        } else {
            nodes.push(element as SystemNode);

            // Add edges in the order defined in the data
            const outboundPorts = element.getGroupPorts(config.outboundPortGroupName);
            const nodeEdges = graph.getConnectedLinks(element, { outbound: true });
            const nodeSortedEdges = util.sortBy(nodeEdges, (link) => {
                const portIndex = outboundPorts.findIndex(port => port.id === link.source().port);
                const sourceIndex = link.get(Attribute.SourceIndex) ?? 0;
                return portIndex * EDGES_PER_PORT + sourceIndex;
            });
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
