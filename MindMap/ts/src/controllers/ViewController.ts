import type { dia } from '@joint/plus';
import { Controller } from '../classes/Controller';
import type { App } from '../classes/App';
import {
    selectParent,
    selectNextSibling,
    selectPrevSibling,
    selectSuccessorIdea,
    selectIdea,
    deselectIdeas,
    showHelpDialog,
    openURL,
} from '../actions';
import type { IdeaView } from '../shapes/idea';

export default class ViewController extends Controller<App> {

    startListening() {
        const { paper, keyboard, toolbar } = this.context;
        this.stopListening();
        this.listenTo(paper, {
            'blank:pointerdown': onPaperBlankPointerDown,
            'element:pointerclick': onPaperElementPointerClick,
            'element:url:pointerdown': onPaperElementURLPointerDown
        });
        this.listenTo(keyboard, {
            'up': onKeyUp,
            'down': onKeyDown,
            'left': onKeyLeft,
            'right': onKeyRight,
        });
        this.listenTo(toolbar, {
            'help:pointerclick': onToolbarHelp
        });
    }
}

// Paper

const onPaperBlankPointerDown: App.Callback<dia.Paper.EventMap['blank:pointerdown']> =
    (app, evt) => {
        const { scroller } = app;
        scroller.startPanning(evt);
        deselectIdeas(app);
    };

const onPaperElementPointerClick: App.Callback<dia.Paper.EventMap['element:pointerclick']> =
    (app, ideaView: IdeaView) => {
        const { model } = ideaView;
        selectIdea(app, model);
    };

function onPaperElementURLPointerDown(app: App, ideaView: IdeaView, evt: dia.Event) {
    const { model } = ideaView;
    selectIdea(app, model);
    evt.stopPropagation();
    if (!evt.ctrlKey && !evt.metaKey) return;
    openURL(app, evt.target.dataset.url);
}

// Keyboard

function onKeyUp(app: App, evt: dia.Event) {
    const { selection } = app;
    if (selection.isEmpty()) return;
    const el = selection.first();
    selectPrevSibling(app, el) || selectParent(app, el);
    evt.preventDefault();
}

function onKeyDown(app: App, evt: dia.Event) {
    const { selection } = app;
    if (selection.isEmpty()) return;
    const el = selection.first();
    selectNextSibling(app, el) || selectParent(app, el);
    evt.preventDefault();
}

function onKeyRight(app: App, evt: dia.Event) {
    const { selection, graph } = app;
    if (selection.isEmpty()) return;
    evt.preventDefault();
    const el = selection.first();
    switch (graph.getDirection(el)) {
        case 'L': {
            selectParent(app, el);
            break;
        }
        case 'R': {
            selectSuccessorIdea(app, el);
            break;
        }
        default: {
            selectSuccessorIdea(app, el, 'R');
            break;
        }
    }

}

function onKeyLeft(app: App, evt: dia.Event) {
    const { selection, graph } = app;
    if (selection.isEmpty()) return;
    evt.preventDefault();
    const el = selection.first();
    switch (graph.getDirection(el)) {
        case 'R': {
            selectParent(app, el);
            break;
        }
        case 'L': {
            selectSuccessorIdea(app, el);
            break;
        }
        default: {
            selectSuccessorIdea(app, el, 'L');
            break;
        }
    }
}

// Toolbar

function onToolbarHelp(app: App) {
    showHelpDialog(app);
}
