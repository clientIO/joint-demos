import Controller from './Controller';
import { buildDiagram } from '../diagram/builder';

import type { dia } from '@joint/plus';
import type { SystemDiagramContext } from '../diagram/types';
import type { BuildDiagramOptions } from '../diagram/builder';
/**
 * BuildController manages transforming the diagram data into the JointJS graph.
 */
export default class BuildController extends Controller<[SystemDiagramContext, BuildDiagramOptions]> {

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
function onHistoryChange(
    ctx: SystemDiagramContext,
    buildOptions: BuildDiagramOptions,
    batchCommand: dia.CommandManager.BatchCommand | dia.CommandManager.Command,
    setOptions: dia.Cell.Options = {}
) {
    if (setOptions.build === false) return;
    // For undo/redo, we need to check the options stored in the command
    const [command] = (Array.isArray(batchCommand)) ? batchCommand : [batchCommand];
    generateGraphFromCurrentData(ctx, { ...buildOptions, ...command.options });
}

/**
 * Builds the JointJS graph from the current diagram data.
 */
function generateGraphFromCurrentData(ctx: SystemDiagramContext, buildOptions: BuildDiagramOptions) {
    const { graph, diagramData, paper } = ctx;

    paper.freeze();
    buildDiagram(diagramData.toJSON(), graph, buildOptions).then(() => {
        paper.unfreeze();
    });
}

