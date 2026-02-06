import { Controller } from '../classes/Controller';
import { selectParent, selectNextSibling, selectPrevSibling, selectSuccessorIdea, selectIdea, deselectIdeas, showHelpDialog, openURL, } from '../actions';

export default class ViewController extends Controller {
    
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

const onPaperBlankPointerDown = (app, evt) => {
    const { scroller } = app;
    scroller.startPanning(evt);
    deselectIdeas(app);
};

const onPaperElementPointerClick = (app, ideaView) => {
    const { model } = ideaView;
    selectIdea(app, model);
};

function onPaperElementURLPointerDown(app, ideaView, evt) {
    const { model } = ideaView;
    selectIdea(app, model);
    evt.stopPropagation();
    if (!evt.ctrlKey && !evt.metaKey)
        return;
    openURL(app, evt.target.dataset.url);
}

// Keyboard

function onKeyUp(app, evt) {
    const { selection } = app;
    if (selection.isEmpty())
        return;
    const el = selection.first();
    selectPrevSibling(app, el) || selectParent(app, el);
    evt.preventDefault();
}

function onKeyDown(app, evt) {
    const { selection } = app;
    if (selection.isEmpty())
        return;
    const el = selection.first();
    selectNextSibling(app, el) || selectParent(app, el);
    evt.preventDefault();
}

function onKeyRight(app, evt) {
    const { selection, graph } = app;
    if (selection.isEmpty())
        return;
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

function onKeyLeft(app, evt) {
    const { selection, graph } = app;
    if (selection.isEmpty())
        return;
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

function onToolbarHelp(app) {
    showHelpDialog(app);
}
