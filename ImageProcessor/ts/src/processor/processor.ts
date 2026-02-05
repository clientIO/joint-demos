import { Connection } from '../connection/connection';
import type { ActionResult, Node } from '../nodes/node';
import type { dia } from '@joint/plus';
import { mvc } from '@joint/plus';

export type ErrorType = 'type-error';
export class Processor {
    nodes: { [id: string]: Node } = {};
    connections: { [id: string]: Connection } = {};
    outboundConnections: { [sourceId: string]: Connection[] } = {};
    inboundConnections: { [targetId: string]: Connection[] } = {};

    listener: mvc.Listener<any[]> = new mvc.Listener();

    constructor(public graph: dia.Graph) {
        this.listener.listenTo(graph, 'add', (cell: dia.Cell, _: any, options: any) => {
            if (cell.isElement()) {
                this.addNode(cell as Node);
            }
            if (cell.isLink()) {
                // Add connection if added via Undo/Redo
                if (options['commandManager']) {
                    this.addConnection(new Connection(cell, cell.get('connectionSource'), cell.get('connectionTarget')));
                }
            }
        });

        this.listener.listenTo(graph, 'remove', (cell: dia.Cell) => {
            if (cell.isElement()) {
                this.removeNode(cell as Node);
            }
            if (cell.isLink()) {
                const connection = this.connections[cell.id];
                if (connection) {
                    this.removeConnection(connection);
                }
            }
        });

        // Here comes addition graph listeners if needed
    }

    reset() {
        this.nodes = {};
        this.connections = {};
        this.outboundConnections = {};
        this.inboundConnections = {};
    }

    destroy() {
        this.listener.stopListening();
    }

    addNode(node: Node) {
        this.nodes[node.id] = node;
        node.get('outputSettings').forEach(o => node.setProperty(o.name, o.defaultValue));
        this.outboundConnections[node.id] = [];
        this.inboundConnections[node.id] = [];
    }

    removeNode(node: Node) {
        delete this.nodes[node.id];
        delete this.outboundConnections[node.id];
        delete this.inboundConnections[node.id];
    }

    addConnection(connection: Connection): ErrorType | void {
        this.connections[connection.linkModel.id] = connection;
        this.outboundConnections[connection.source.nodeId].push(connection);
        this.inboundConnections[connection.target.nodeId].push(connection);

        const outputNode = this.nodes[connection.source.nodeId];
        const inputNode = this.nodes[connection.target.nodeId];

        const output = outputNode.get('outputSettings')[connection.source.outputIndex];
        const input = inputNode.get('inputSettings')[connection.target.inputIndex];

        if (output.type !== input.type) {
            return 'type-error';
        }

        this.nodes[connection.target.nodeId].onInputConnectionAdd(input, outputNode.outputs[connection.source.outputIndex]);

        this.process(connection.target.nodeId).then(() => {
            return;
        }).catch((error) => {
            console.error(error);
            console.log('process error');
        });
    }

    removeConnection(connection: Connection) {
        delete this.connections[connection.linkModel.id];
        const input = this.nodes[connection.target.nodeId].get('inputSettings')[connection.target.inputIndex];

        if (this.outboundConnections[connection.source.nodeId]) {
            this.outboundConnections[connection.source.nodeId] = this.outboundConnections[connection.source.nodeId].filter(c => c !== connection);
        }

        let omitProcessing = false;
        if (this.inboundConnections[connection.target.nodeId]) {
            if (this.inboundConnections[connection.target.nodeId].filter(c => c.target.inputIndex === connection.target.inputIndex).length > 1) {
                // omit processing if there are more connected links to one input (in case of Undo/Redo or other simultaneous updates)
                omitProcessing = true;
            }

            this.inboundConnections[connection.target.nodeId] = this.inboundConnections[connection.target.nodeId].filter(c => c !== connection);
        }

        if (omitProcessing) return;

        this.nodes[connection.target.nodeId].onInputConnectionRemove(input);
        this.process(connection.target.nodeId).catch((error) => {
            console.error(error);
            console.log('process error');
        });
    }

    async updateCurrentData(nodeId: dia.Cell.ID, data: ActionResult) {
        const node = this.nodes[nodeId];
        if (node) {
            const outputs = node.outputs;
            const targetNodes: { [key: dia.Cell.ID]: Node } = {};
            outputs.forEach((o, i) => {
                if (o !== data[i]) {
                    const outboundConnections = this.outboundConnections[nodeId].filter(c => c.source.outputIndex === i);
                    for (let j = 0; j < outboundConnections.length; j++) {
                        const targetNode = this.nodes[outboundConnections[j].target.nodeId];
                        const input = targetNode.get('inputSettings')[outboundConnections[j].target.inputIndex];
                        targetNode.prop(`properties/${input.property}`, data[i]);

                        targetNodes[targetNode.id] = targetNode;
                    }
                }
            });
            node.set('outputs', data);

            for(let id in targetNodes) {
                await this.process(id).catch((error) => {
                    console.error(error);
                    console.log('process error');
                });
            }
        }
    }

    async process(nodeId?: dia.Cell.ID) {
        if (nodeId && this.nodes[nodeId]) {
            const node = this.nodes[nodeId];
            const data = await node.action();

            await this.updateCurrentData(nodeId, data);
        }
    }
}
