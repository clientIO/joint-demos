import { dia } from '@joint/plus';
import { cellNamespace } from './namespaces';
// System
import type { SystemDiagramContext } from '../system/diagram/types';
import { DiagramData } from '../system/diagram/data';
// Configs
import * as systemHistoryOptions from '../system/configs/history-options';
import * as systemPaperOptions from '../system/configs/paper-options';

import type { NodeData } from './types';

export type DiagramOptions = dia.Paper.Options;

export default class Diagram implements SystemDiagramContext<NodeData> {

    /**
     * Diagram data model instance for storing the logical representation of the diagram.
     */
    diagramData: DiagramData<NodeData>;

    /**
     * Joint Graph instance with auto-generated diagram nodes and edges.
     * @see https://docs.jointjs.com/api/dia/Graph
     * @tutorial https://docs.jointjs.com/learn/features/diagram-basics/graph
     */
    graph: dia.Graph;

    /**
     * Joint Graph view (Paper) instance for rendering the diagram.
     * @see https://docs.jointjs.com/api/dia/Paper
     * @tutorial https://docs.jointjs.com/learn/features/diagram-basics/paper
     */
    paper: dia.Paper;

    /**
     * Joint CommandManager instance for managing undo/redo history.
     * @see https://docs.jointjs.com/api/dia/CommandManager
     * @tutorial https://docs.jointjs.com/learn/features/undo-redo
     */
    history: dia.CommandManager;

    constructor(paperOptions: DiagramOptions = {}) {

        this.diagramData = new DiagramData<NodeData>();

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
