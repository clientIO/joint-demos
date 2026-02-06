import type { dia } from '@joint/plus';
import { connectors, shapes } from '@joint/plus';
import type { ImpFile, ImpFileConnection, ImpFileNode } from './file-format';
import { App } from '../app';
import type { Node } from '../nodes/node';
import { createNodeByType, createNodeShape } from '../nodes/node-helper';
import { Connection } from '../connection/connection';

export function resetGraphFromFile(graph: dia.Graph, file: ImpFile) {
    graph.resetCells([]);
    const nodeMap: { [id: string]: Node } = {};
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

export function getFileFromGraph(graph: dia.Graph): ImpFile {
    const processor = App.processor;
    const nodes: ImpFileNode[] = graph.getElements().map((node: Node) => {
        return {
            id: node.id as string,
            type: node.get('type'),
            attributes: node.getFileAttributes().reduce((obj: any, prop) => {
                obj[prop] = node.prop(prop);
                return obj;
            }, {})
        };
    });
    const connections: ImpFileConnection[] = graph.getLinks().map((link: shapes.standard.Link) => {
        const connection = processor.connections[link.id];
        return {
            sourceId: connection.source.nodeId as string,
            outputIndex: connection.source.outputIndex,
            targetId: connection.target.nodeId as string,
            inputIndex: connection.target.inputIndex
        };
    });
    return {
        nodes: nodes,
        connections: connections
    };
}

export async function loadExample(graph: dia.Graph, example: string) {
    const file = await fetch(`examples/${example}/workflow.imp`);
    const impFile = JSON.parse(await file.text());
    resetGraphFromFile(graph, impFile);

    const imagesFile = await fetch(`examples/${example}/images.json`);
    const images: { [key: string]: string } = JSON.parse(await imagesFile.text());

    const uploads = graph.getCells().filter(c => c.get('type') === 'processor.Upload');
    uploads.forEach(u => {
        u.prop('properties/url', `examples/${example}/images/${images[u.get('name')]}`);
        App.processor.process(u.id);
    });

    const inputs = graph.getCells().filter(c => (c.get('type') as string).includes('Input')) as Node[];
    inputs.forEach(i => {
        i.updateCurrentData();
    });
}
