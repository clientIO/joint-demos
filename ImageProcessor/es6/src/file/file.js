var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { connectors, shapes } from '@joint/plus';
import { App } from '../app';
import { createNodeByType, createNodeShape } from '../nodes/node-helper';
import { Connection } from '../connection/connection';

export function resetGraphFromFile(graph, file) {
    graph.resetCells([]);
    const nodeMap = {};
    file.nodes.forEach(node => {
        const nodeCell = createNodeShape(createNodeByType(node.type));
        nodeCell.attributes.id = node.id;
        nodeCell.id = node.id;
        for (let prop in node.attributes) {
            nodeCell.prop(prop, node.attributes[prop]);
        }
        nodeMap[node.id] = nodeCell;
        graph.addCell(nodeCell, { file: true });
    });
    file.connections.forEach(connection => {
        const connectionSource = { nodeId: connection.sourceId, outputIndex: connection.outputIndex };
        const connectionTarget = { nodeId: connection.targetId, inputIndex: connection.inputIndex };
        
        const link = new shapes.standard.Link({
            z: 0,
            connectionSource,
            connectionTarget,
            attrs: {
                line: {
                    strokeWidth: 3,
                    targetMarker: null,
                }
            },
            source: {
                id: connection.sourceId,
                port: nodeMap[connection.sourceId].getPorts().filter(port => port.group === 'out')[connection.outputIndex].id
            },
            target: {
                id: connection.targetId,
                port: nodeMap[connection.targetId].getPorts().filter(port => port.group === 'in')[connection.inputIndex].id
            },
            connector: {
                name: 'curve',
                args: {
                    direction: connectors.curve.Directions.HORIZONTAL,
                    targetDirection: connectors.curve.TangentDirections.LEFT,
                    sourceDirection: connectors.curve.TangentDirections.RIGHT
                }
            }
        });
        App.processor.addConnection(new Connection(link, connectionSource, connectionTarget));
        graph.addCell(link, { file: true });
    });
}

export function getFileFromGraph(graph) {
    const processor = App.processor;
    const nodes = graph.getElements().map((node) => {
        return {
            id: node.id,
            type: node.get('type'),
            attributes: node.getFileAttributes().reduce((obj, prop) => {
                obj[prop] = node.prop(prop);
                return obj;
            }, {})
        };
    });
    const connections = graph.getLinks().map((link) => {
        const connection = processor.connections[link.id];
        return {
            sourceId: connection.source.nodeId,
            outputIndex: connection.source.outputIndex,
            targetId: connection.target.nodeId,
            inputIndex: connection.target.inputIndex
        };
    });
    return {
        nodes: nodes,
        connections: connections
    };
}

export function loadExample(graph, example) {
    return __awaiter(this, void 0, void 0, function* () {
        const file = yield fetch(`examples/${example}/workflow.imp`);
        const impFile = JSON.parse(yield file.text());
        resetGraphFromFile(graph, impFile);
        
        const imagesFile = yield fetch(`examples/${example}/images.json`);
        const images = JSON.parse(yield imagesFile.text());
        
        const uploads = graph.getCells().filter(c => c.get('type') === 'processor.Upload');
        uploads.forEach(u => {
            u.prop('properties/url', `examples/${example}/images/${images[u.get('name')]}`);
            App.processor.process(u.id);
        });
        
        const inputs = graph.getCells().filter(c => c.get('type').includes('Input'));
        inputs.forEach(i => {
            i.updateCurrentData();
        });
    });
}
