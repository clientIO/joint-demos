import { ui } from '@joint/plus';
import { Controller } from '../classes/Controller';
import { openImagePicker } from '../utils';
import { startEditingIdeaLabel, removeIdeaImage, addIdeaImage, addNextSiblingIdea, addPrevSiblingIdea, addLastChildIdea, removeIdeaBranch, changeIdeaColor, selectIdea, focusIdea, blurIdea, showURLDialog, } from '../actions';

export default class EditController extends Controller {
    
    startListening() {
        const { paper, keyboard, toolbar } = this.context;
        this.stopListening();
        this.listenTo(paper, {
            'element:pointerdown': onPaperElementPointerdown,
            'element:url:pointerdown': onPaperElementURLPointerDown,
            'element:pointerdblclick': onPaperElementPointerDblClick,
        });
        this.listenTo(keyboard, {
            'printable': onKeyPrintable,
            'enter': onKeyEnter,
            'shift+enter': onKeyShiftEnter,
            'ctrl+enter': onKeyCtrlEnter,
            'delete backspace': onKeyDelete,
            'ctrl+z': onCtrlZ,
            'ctrl+shift+z': onCtrlShiftZ
        });
        this.listenTo(ui.TextEditor, {
            'open': onTextEditorOpen,
            'close': onTextEditorClose
        });
        this.listenTo(toolbar, {
            'idea-image:pointerclick': onToolbarIdeaImage,
            'idea-color:input': onToolbarIdeaColor
        });
    }
}

// Paper

const onPaperElementPointerdown = (app, ideaView) => {
    const { treeView, graph } = app;
    const { model } = ideaView;
    if (graph.getRoot() === model)
        return;
    treeView.startDragging([model]);
};

function onPaperElementURLPointerDown(app, ideaView, evt) {
    evt.stopPropagation();
    evt.preventDefault();
    if (evt.ctrlKey || evt.metaKey)
        return;
    showURLDialog(app, ideaView, evt.target.dataset.url);
}

const onPaperElementPointerDblClick = (app, elementView, evt) => {
    const { model } = elementView;
    const section = elementView.findAttribute('data-section', evt.target);
    switch (section) {
        case 'image': {
            openImagePicker(imageUrl => addIdeaImage(app, model, imageUrl));
            break;
        }
        case 'text':
        default: {
            startEditingIdeaLabel(app, model, evt);
            break;
        }
    }
};

// Keyboard

function onKeyEnter(app) {
    const { selection } = app;
    if (selection.isEmpty())
        return;
    const idea = selection.first();
    const newIdea = addNextSiblingIdea(app, idea) || addLastChildIdea(app, idea);
    selectIdea(app, newIdea);
}

function onKeyShiftEnter(app) {
    const { selection } = app;
    if (selection.isEmpty())
        return;
    const idea = selection.first();
    const newIdea = addPrevSiblingIdea(app, idea) || addLastChildIdea(app, idea);
    if (!newIdea)
        return;
    selectIdea(app, newIdea);
}

function onKeyCtrlEnter(app) {
    const { selection } = app;
    if (selection.isEmpty())
        return;
    const idea = selection.first();
    const newIdea = addLastChildIdea(app, idea);
    selectIdea(app, newIdea);
}

function onKeyDelete(app) {
    const { graph, selection } = app;
    if (selection.isEmpty())
        return;
    const idea = selection.first();
    const parentIdea = graph.getParent(idea);
    if (!parentIdea)
        return;
    removeIdeaBranch(app, idea);
    selectIdea(app, parentIdea);
}

function onKeyPrintable(app, evt) {
    const { selection } = app;
    if (evt.ctrlKey)
        return;
    if (selection.isEmpty())
        return;
    evt.preventDefault();
    startEditingIdeaLabel(app, selection.first(), evt);
}

function onCtrlZ(app) {
    const { history } = app;
    history.undo();
}

function onCtrlShiftZ(app) {
    const { history } = app;
    history.redo();
}

// TextEditor

const onTextEditorOpen = (app) => {
    const { selection } = app;
    if (selection.isEmpty())
        return;
    focusIdea(app, selection.first());
};

const onTextEditorClose = (app) => {
    blurIdea(app);
};

// Toolbar

function onToolbarIdeaImage(app) {
    const { selection } = app;
    const idea = selection.first();
    if (idea.hasImage()) {
        removeIdeaImage(app, idea);
    }
    else {
        openImagePicker(imageUrl => addIdeaImage(app, idea, imageUrl));
    }
}

function onToolbarIdeaColor(app, color) {
    const { selection } = app;
    const idea = selection.first();
    if (!idea)
        return;
    changeIdeaColor(app, idea, color);
}
