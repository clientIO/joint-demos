import { Controller } from '../classes/Controller';
import type { App } from '../classes/App';
import {
    highlightIdeas,
    updateToolbarButtons
} from '../actions';
import type { dia } from '@joint/core';

export default class SelectionController extends Controller<App> {

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

function onSelectionReset(app: App) {
    const { selection } = app;
    const ideas = selection.toArray();
    // Selection Frames
    highlightIdeas(app, ideas);
    // Toolbar
    updateToolbarButtons(app, ideas);
}

// Graph

function onGraphReset(app: App) {
    const { graph, selection } = app;
    selection.reset([graph.getRoot()]);
}

// History

function onHistoryChange(app: App) {
    const { graph, selection } = app;
    // Make sure the selected ideas are in the graph after a history change
    const ideas = selection.filter((idea: dia.Cell) => Boolean(graph.getCell(idea)));
    selection.reset(ideas);
}
