import { dia } from '@joint/plus';
import { cellNamespace } from './namespaces';
// System
import { DiagramData } from '../system/diagram/data';
// Configs
import * as systemHistoryOptions from '../system/configs/history-options';
import * as systemPaperOptions from '../system/configs/paper-options';

export default class Diagram {
    
    constructor(paperOptions = {}) {
        
        this.diagramData = new DiagramData();
        
        // Command Manager / History
        this.history = new dia.CommandManager(Object.assign(Object.assign({}, systemHistoryOptions), { model: this.diagramData }));
        
        // Graph
        this.graph = new dia.Graph({}, {
            cellNamespace
        });
        
        // Paper
        this.paper = new dia.Paper(Object.assign(Object.assign(Object.assign({}, systemPaperOptions), paperOptions), { model: this.graph, cellViewNamespace: cellNamespace }));
    }
}
