import Controller from './Controller';
import { buildDiagram } from '../diagram/builder';

/**
 * BuildController manages transforming the diagram data into the JointJS graph.
 */
export default class BuildController extends Controller {
    
    startListening() {
        const { history } = this.context;
        
        this.listenTo(history, {
            'stack:undo stack:redo stack:push': onHistoryChange,
        });
    }
}

/**
 * Every time the history changes, we need to rebuild the graph from the current data.
 * - a new command is pushed (a user action)
 * - an undo or redo is performed
 */
function onHistoryChange(ctx, buildOptions, batchCommand, setOptions = {}) {
    if (setOptions.build === false)
        return;
    // For undo/redo, we need to check the options stored in the command
    const [command] = (Array.isArray(batchCommand)) ? batchCommand : [batchCommand];
    generateGraphFromCurrentData(ctx, { ...buildOptions, ...command.options });
}

/**
 * Builds the JointJS graph from the current diagram data.
 */
function generateGraphFromCurrentData(ctx, buildOptions) {
    const { graph, diagramData } = ctx;
    buildDiagram(diagramData.toJSON(), graph, buildOptions);
}

