import { dia } from '@joint/plus';
import { cellNamespace } from './namespaces';
// System
import { DiagramData } from '../system/diagram/data';
// Configs
import * as systemHistoryOptions from '../system/configs/history-options';
import * as systemPaperOptions from '../system/configs/paper-options';

export default class Diagram {
    
    /**
     * Diagram data model instance for storing the logical representation of the diagram.
     */
    diagramData;
    
    /**
     * Joint Graph instance with auto-generated diagram nodes and edges.
     * @see https://docs.jointjs.com/api/dia/Graph
     * @tutorial https://docs.jointjs.com/learn/features/diagram-basics/graph
     */
    graph;
    
    /**
     * Joint Graph view (Paper) instance for rendering the diagram.
     * @see https://docs.jointjs.com/api/dia/Paper
     * @tutorial https://docs.jointjs.com/learn/features/diagram-basics/paper
     */
    paper;
    
    /**
     * Joint CommandManager instance for managing undo/redo history.
     * @see https://docs.jointjs.com/api/dia/CommandManager
     * @tutorial https://docs.jointjs.com/learn/features/undo-redo
     */
    history;
    
    constructor(paperOptions = {}) {
        
        this.diagramData = new DiagramData();
        
        // Command Manager / History
        this.history = new dia.CommandManager({
            ...systemHistoryOptions,
            model: this.diagramData,
        });
        
        // Graph
        this.graph = new dia.Graph({}, {
            cellNamespace
        });
        
        // Paper
        this.paper = new dia.Paper({
            ...systemPaperOptions,
            ...paperOptions,
            model: this.graph,
            cellViewNamespace: cellNamespace,
        });
    }
}
