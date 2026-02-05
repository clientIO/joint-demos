var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Connection } from '../connection/connection';
import { mvc } from '@joint/plus';
export class Processor {
    
    constructor(graph) {
        this.graph = graph;
        this.nodes = {};
        this.connections = {};
        this.outboundConnections = {};
        this.inboundConnections = {};
        
        this.listener = new mvc.Listener();
        this.listener.listenTo(graph, 'add', (cell, _, options) => {
            if (cell.isElement()) {
                this.addNode(cell);
            }
            if (cell.isLink()) {
                // Add connection if added via Undo/Redo
                if (options['commandManager']) {
                    this.addConnection(new Connection(cell, cell.get('connectionSource'), cell.get('connectionTarget')));
                }
            }
        });
        
        this.listener.listenTo(graph, 'remove', (cell) => {
            if (cell.isElement()) {
                this.removeNode(cell);
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
    
    addNode(node) {
        this.nodes[node.id] = node;
        node.get('outputSettings').forEach(o => node.setProperty(o.name, o.defaultValue));
        this.outboundConnections[node.id] = [];
        this.inboundConnections[node.id] = [];
    }
    
    removeNode(node) {
        delete this.nodes[node.id];
        delete this.outboundConnections[node.id];
        delete this.inboundConnections[node.id];
    }
    
    addConnection(connection) {
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
    
    removeConnection(connection) {
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
        
        if (omitProcessing)
            return;
        
        this.nodes[connection.target.nodeId].onInputConnectionRemove(input);
        this.process(connection.target.nodeId).catch((error) => {
            console.error(error);
            console.log('process error');
        });
    }
    
    updateCurrentData(nodeId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const node = this.nodes[nodeId];
            if (node) {
                const outputs = node.outputs;
                const targetNodes = {};
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
                
                for (let id in targetNodes) {
                    yield this.process(id).catch((error) => {
                        console.error(error);
                        console.log('process error');
                    });
                }
            }
        });
    }
    
    process(nodeId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (nodeId && this.nodes[nodeId]) {
                const node = this.nodes[nodeId];
                const data = yield node.action();
                
                yield this.updateCurrentData(nodeId, data);
            }
        });
    }
}
