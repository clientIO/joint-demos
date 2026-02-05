import type { dia } from '@joint/plus';
import { ui } from '@joint/plus';
import { Controller } from '../classes/Controller';
import type { App } from '../classes/App';
import type { IdeaView } from '../shapes/idea';
import { openImagePicker } from '../utils';
import {
    startEditingIdeaLabel,
    removeIdeaImage,
    addIdeaImage,
    addNextSiblingIdea,
    addPrevSiblingIdea,
    addLastChildIdea,
    removeIdeaBranch,
    changeIdeaColor,
    selectIdea,
    focusIdea,
    blurIdea,
    showURLDialog,
} from '../actions';

export default class EditController extends Controller<App> {

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

const onPaperElementPointerdown: App.Callback<dia.Paper.EventMap['element:pointerdown']> =
    (app, ideaView) => {
        const { treeView, graph } = app;
        const { model } = ideaView;
        if (graph.getRoot() === model) return;
        treeView.startDragging([model]);
    };

function onPaperElementURLPointerDown(app: App, ideaView: IdeaView, evt: dia.Event) {
    evt.stopPropagation();
    evt.preventDefault();
    if (evt.ctrlKey || evt.metaKey) return;
    showURLDialog(app, ideaView, evt.target.dataset.url);
}

const onPaperElementPointerDblClick: App.Callback<dia.Paper.EventMap['element:pointerdblclick']> =
    (app, elementView: IdeaView, evt) => {
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

function onKeyEnter(app: App) {
    const { selection } = app;
    if (selection.isEmpty()) return;
    const idea = selection.first();
    const newIdea = addNextSiblingIdea(app, idea) || addLastChildIdea(app, idea);
    selectIdea(app, newIdea);
}

function onKeyShiftEnter(app: App) {
    const { selection } = app;
    if (selection.isEmpty()) return;
    const idea = selection.first();
    const newIdea = addPrevSiblingIdea(app, idea) || addLastChildIdea(app, idea);
    if (!newIdea) return;
    selectIdea(app, newIdea);
}

function onKeyCtrlEnter(app: App) {
    const { selection } = app;
    if (selection.isEmpty()) return;
    const idea = selection.first();
    const newIdea = addLastChildIdea(app, idea);
    selectIdea(app, newIdea);
}

function onKeyDelete(app: App) {
    const { graph, selection } = app;
    if (selection.isEmpty()) return;
    const idea = selection.first();
    const parentIdea = graph.getParent(idea);
    if (!parentIdea) return;
    removeIdeaBranch(app, idea);
    selectIdea(app, parentIdea);
}

function onKeyPrintable(app: App, evt: dia.Event) {
    const { selection } = app;
    if (evt.ctrlKey) return;
    if (selection.isEmpty()) return;
    evt.preventDefault();
    startEditingIdeaLabel(app, selection.first(), evt);
}

function onCtrlZ(app: App) {
    const { history } = app;
    history.undo();
}

function onCtrlShiftZ(app: App) {
    const { history } = app;
    history.redo();
}

// TextEditor

const onTextEditorOpen: App.Callback<ui.TextEditor.EventMap['open']> =
    (app: App) => {
        const { selection } = app;
        if (selection.isEmpty()) return;
        focusIdea(app, selection.first());
    };

const onTextEditorClose: App.Callback<ui.TextEditor.EventMap['close']> =
    (app: App) => {
        blurIdea(app);
    };

// Toolbar

function onToolbarIdeaImage(app: App) {
    const { selection } = app;
    const idea = selection.first();
    if (idea.hasImage()) {
        removeIdeaImage(app, idea);
    } else {
        openImagePicker(imageUrl => addIdeaImage(app, idea, imageUrl));
    }
}

function onToolbarIdeaColor(app: App, color: string) {
    const { selection } = app;
    const idea = selection.first();
    if (!idea) return;
    changeIdeaColor(app, idea, color);
}
