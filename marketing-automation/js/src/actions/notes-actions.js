import { V, mvc } from '@joint/plus';
import { Attribute } from '../diagram/const';
import Theme from '../diagram/theme';

let noteTextArea = null;

/**
 * Opens a textarea editor for the given note.
 */
export function openNoteEditor(app, note) {
    const { diagramData, paper, selection } = app;
    
    closeNoteEditor();
    
    /**
     * @todo: we could select the note, but it currently
     * causes visual glitches with the textarea position.
     */
    selection.collection.reset([]);
    
    const textarea = createTextareaElement(note);
    noteTextArea = textarea;
    
    // Append the textarea to the paper at the note position
    transformEditor(textarea, note, paper);
    paper.el.appendChild(textarea);
    
    textarea.focus();
    
    // Setup a listener to close the editor when clicking outside
    const listener = new mvc.Listener();
    listener.listenTo(paper, {
        'blank:pointerdown cell:pointerdown': () => closeNoteEditor(),
        'transform': () => transformEditor(textarea, note, paper)
    });
    
    // Prevent `cell:pointerdown` from being triggered on the textarea itself
    ['mousedown', 'touchstart'].forEach((eventName) => {
        textarea.addEventListener(eventName, (evt) => {
            evt.stopPropagation();
        });
    });
    
    // Save content on blur or Escape key
    textarea.addEventListener('blur', () => {
        diagramData.changeNode(note.id, { [Attribute.Markdown]: textarea.value });
        textarea.remove();
        listener.stopListening();
    });
    
    textarea.addEventListener('keyup', (evt) => {
        if (evt.key === 'Escape') {
            textarea.blur();
        }
    });
}

/**
 * Closes the currently opened note editor, if any.
 */
export function closeNoteEditor() {
    if (noteTextArea) {
        noteTextArea.blur();
        noteTextArea.remove();
        noteTextArea = null;
    }
}

// Helper functions

function createTextareaElement(note) {
    
    const textarea = document.createElement('textarea');
    const { width, height } = note.getBBox();
    
    // Position, Size & Styling
    const textareaStyle = textarea.style;
    textareaStyle.position = 'absolute';
    textareaStyle.boxSizing = 'border-box';
    textareaStyle.transformOrigin = '0 0';
    textareaStyle.letterSpacing = '0';
    textareaStyle.resize = 'none';
    textareaStyle.lineHeight = '1.5em';
    textareaStyle.border = 'none';
    textareaStyle.background = Theme.NoteBackgroundColor;
    textareaStyle.color = Theme.NoteTextColor;
    textareaStyle.borderRadius = `${Theme.NodeBorderRadius}px`;
    textareaStyle.padding = `${Theme.NodeVerticalPadding}px ${Theme.NodeHorizontalPadding}px`;
    textareaStyle.width = `${width}px`;
    textareaStyle.height = `${height}px`;
    textareaStyle.fontSize = note.attr('content/fontSize') + 'px';
    textareaStyle.fontFamily = note.attr('content/fontFamily');
    textareaStyle.fontWeight = note.attr('content/fontWeight');
    textareaStyle.color = note.attr('content/fill');
    textarea.value = note.getMarkdown();
    
    return textarea;
}

/**
 * Transforms the editor overlay to the note's model position.
 * @param textareaEl - The textarea element to transform.
 * @param note - The note model.
 * @param paper - The paper instance.
 */
function transformEditor(textareaEl, note, paper) {
    const position = note.position();
    const noteTransform = paper.matrix().translate(position.x, position.y);
    textareaEl.style.transform = V.matrixToTransformString(noteTransform);
}
