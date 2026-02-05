var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { util } from '@joint/plus';
import { layoutCells } from './layouts/elk-layout';
import { extractGraphCells, setNodeAttribute, isNodeJSON } from './utils';
import { setCustomPosition } from '../custom-positions';
import { extractNodesIds } from '../data/utils';
import { SystemEdge } from '../models';
import { Attribute } from '../const';
import { runAfterLayout } from '../../../diagram/utils';

export * from './types';

const ZIndex = {
    Edge: 0,
    Node: 1,
};

export function buildDiagram(data_1, graph_1) {
    return __awaiter(this, arguments, void 0, function* (data, graph, options = {}) {
        const { 
        // By default the data node is used as-is to create the model.
        buildNode = (node) => node, disableOptimalOrderHeuristic = true, } = options;
        updateGraph(graph, data, buildNode);
        yield layoutGraph(graph, disableOptimalOrderHeuristic);
    });
}

function updateGraph(graph, json, buildNode) {
    
    const nodes = [];
    const edges = [];
    
    const nodeIds = extractNodesIds(json);
    
    nodeIds.forEach(sourceId => {
        var _a;
        // node should always exist in the JSON
        const nodeJSON = json[sourceId];
        const nodeType = nodeJSON.type;
        
        const node = buildNode(nodeJSON, sourceId.toString());
        // Ensure the node has the ID attribute set
        setNodeAttribute(node, 'id', sourceId);
        if (isNodeJSON(node)) {
            const nodeModel = graph.getCell(sourceId);
            if (nodeModel && nodeModel.get('type') !== nodeType) {
                // Currently, if node JSON, is replaced with a cell of a different type,
                // we need to remove it to avoid issue with attributes incompatible with the new type.
                graph.removeCell(nodeModel, { replace: true });
            }
            if (!('z' in node)) {
                // Temporary workaround for a JointJS z-index behavior.
                // When creating a cell from JSON without a 'z' property,
                // JointJS assigns one automatically, overriding the model's default 'z' value.
                const defaults = util.result(graph.layerCollection.cellNamespace[nodeType].prototype, 'defaults', {});
                node.z = (_a = defaults.z) !== null && _a !== void 0 ? _a : ZIndex.Node;
            }
        }
        
        nodes.push(node);
    });
    
    nodeIds.forEach(sourceId => {
        const nodeJSON = json[sourceId];
        const targets = nodeJSON.to || [];
        targets.forEach((target, sourceIndex) => {
            const targetId = target.id;
            if (!targetId)
                return;
            
            const edgeJSON = Object.assign(Object.assign({}, target), { z: ZIndex.Edge, type: SystemEdge.type, [Attribute.SourceIndex]: sourceIndex, id: `${sourceId}${target.sourcePortId ? '_' + target.sourcePortId : ''}-${targetId}${target.targetPortId ? '_' + target.targetPortId : ''}`, source: {
                    id: sourceId,
                    port: target.sourcePortId
                }, target: {
                    id: targetId,
                    port: target.targetPortId
                } });
            
            edges.push(edgeJSON);
        });
    });
    
    graph.syncCells([
        ...nodes,
        ...edges,
    ], { remove: true });
}

/**
 * Asynchronously layouts the graph using the ELK layout engine.
 */
function layoutGraph(graph, disableOptimalOrderHeuristic) {
    return __awaiter(this, void 0, void 0, function* () {
        
        const _a = extractGraphCells(graph), { fixedNodes } = _a, cells = __rest(_a, ["fixedNodes"]);
        
        const setFixedPositions = () => {
            fixedNodes.forEach(node => setCustomPosition(graph, node));
        };
        
        // Set fixed node positions to ensure they
        // have the correct position set synchronously
        setFixedPositions();
        
        // Set the fixed positions after the layout is completed,
        // and reference nodes have been positioned.
        runAfterLayout(graph, setFixedPositions);
        
        yield layoutCells(graph, cells, { disableOptimalOrderHeuristic });
    });
}
