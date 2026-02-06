import { ui } from '@joint/plus';
import { IDEA_LABEL_PLACEHOLDER, IDEA_URL_COLOR } from '../theme';
import { prependHttp } from '../utils';

const { TextEditor } = ui;

// Text Editing
export function startEditingIdeaLabel(app, idea, event) {
    const { paper, graph } = app;
    const ideaView = idea.findView(paper);
    const { LABEL_PROPERTY, ANNOTATIONS_PROPERTY, PLACEHOLDER_PROPERTY } = idea;
    const initialText = idea.get(LABEL_PROPERTY);
    const initialAnnotations = idea.get(ANNOTATIONS_PROPERTY);
    const isKeyboardEvent = event instanceof KeyboardEvent;
    const shouldRenderSynchronously = { async: false };
    if (isKeyboardEvent) {
        const { key } = event;
        // `space` starts editing the text where it ends
        if (key !== ' ') {
            idea.set({
                [LABEL_PROPERTY]: key,
                [ANNOTATIONS_PROPERTY]: []
            }, shouldRenderSynchronously);
        }
    }
    
    idea.set(PLACEHOLDER_PROPERTY, IDEA_LABEL_PLACEHOLDER, shouldRenderSynchronously);
    
    function restoreIdeaLabel() {
        idea.set({
            [PLACEHOLDER_PROPERTY]: ' ',
            [LABEL_PROPERTY]: initialText,
            [ANNOTATIONS_PROPERTY]: initialAnnotations
        });
    }
    
    function saveIdeaLabel() {
        const newLabel = idea.get(LABEL_PROPERTY);
        const newAnnotations = idea.get(ANNOTATIONS_PROPERTY);
        restoreIdeaLabel();
        graph.startBatch('save-idea-label');
        idea.set({
            [LABEL_PROPERTY]: newLabel,
            [ANNOTATIONS_PROPERTY]: newAnnotations
        }, {
            addToHistory: true
        });
        graph.stopBatch('save-idea-label');
        graph.triggerLayout();
    }
    
    TextEditor.edit(ideaView.getLabelNode(), {
        theme: 'modern',
        cellView: ideaView,
        textProperty: LABEL_PROPERTY,
        annotationsProperty: ANNOTATIONS_PROPERTY,
        annotateUrls: true,
        urlAnnotation: (url) => {
            return {
                attrs: {
                    'data-url': url,
                    'fill': IDEA_URL_COLOR,
                    'cursor': 'pointer',
                    'text-decoration': 'underline',
                    'event': 'element:url:pointerdown'
                }
            };
        },
        placeholder: IDEA_LABEL_PLACEHOLDER,
        onKeydown: (evt) => {
            const { code, shiftKey } = evt;
            switch (code) {
                case 'Enter': {
                    if (shiftKey)
                        break;
                    evt.stopPropagation();
                    TextEditor.close();
                    saveIdeaLabel();
                    break;
                }
                case 'Escape': {
                    evt.stopPropagation();
                    TextEditor.close();
                    restoreIdeaLabel();
                    break;
                }
                case 'Tab': {
                    // Disable the Tab key while the text editor is open
                    evt.preventDefault();
                    break;
                }
            }
        },
        onOutsidePointerdown: () => {
            TextEditor.close();
            saveIdeaLabel();
        }
    });
    
    // Text Selection
    let selectionStart;
    let selectionEnd;
    if (isKeyboardEvent) {
        // Place the cursor at the end of the text
        selectionStart = selectionEnd = initialText.length + 1;
    }
    else {
        // Select the word under the cursor
        const charNumFromEvent = TextEditor.getCharNumFromEvent(event);
        [selectionStart, selectionEnd] = TextEditor.getWordBoundary(charNumFromEvent);
    }
    TextEditor.select(selectionStart, selectionEnd);
}

export function openURL(app, url) {
    if (!url)
        return;
    window.open(prependHttp(url), '_blank');
}
