import { Controller } from '../classes/Controller';
import type { App } from '../classes/App';
import { layoutTree } from '../actions';

export default class LayoutController extends Controller<App> {

    startListening() {
        const { graph, history } = this.context;
        this.stopListening();
        this.listenTo(graph, {
            'layout:request': onLayoutRequest,
        });
        this.listenTo(history, {
            'stack:undo stack:redo': onHistoryChange,
        });
    }
}

// Tree

function onLayoutRequest(app: App) {
    layoutTree(app);
}

function onHistoryChange(app: App) {
    layoutTree(app);
}
