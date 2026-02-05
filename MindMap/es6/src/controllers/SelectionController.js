import { Controller } from '../classes/Controller';
import { highlightIdeas, updateToolbarButtons } from '../actions';

export default class SelectionController extends Controller {
    
    startListening() {
        const { graph, selection, history } = this.context;
        this.stopListening();
        this.listenTo(selection, {
            'reset': onSelectionReset,
        });
        this.listenTo(graph, {
            'reset': onGraphReset
        });
        this.listenTo(history, {
            'stack:undo stack:redo': onHistoryChange,
        });
    }
}

// Selection

function onSelectionReset(app) {
    const { selection } = app;
    const ideas = selection.toArray();
    // Selection Frames
    highlightIdeas(app, ideas);
    // Toolbar
    updateToolbarButtons(app, ideas);
}

// Graph

function onGraphReset(app) {
    const { graph, selection } = app;
    selection.reset([graph.getRoot()]);
}

// History

function onHistoryChange(app) {
    const { graph, selection } = app;
    // Make sure the selected ideas are in the graph after a history change
    const ideas = selection.filter((idea) => Boolean(graph.getCell(idea)));
    selection.reset(ideas);
}
