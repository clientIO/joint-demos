import { Controller } from '../classes/Controller';
import { layoutTree } from '../actions';

export default class LayoutController extends Controller {
    
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

function onLayoutRequest(app) {
    layoutTree(app);
}

function onHistoryChange(app) {
    layoutTree(app);
}
