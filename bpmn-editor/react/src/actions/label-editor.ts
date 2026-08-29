import { labelEditorWrapperStyles } from '../shapes/shared-config';

import type { dia, ui } from '@joint/plus';
import type { AppShape, AppElement, AppLink } from '../shapes/shapes-typing';
import type { LabelElementView } from '../shapes/shape-view';
import './label-editor.css';

type Selection = Pick<ui.Selection, 'collection'>;

// Shared with the blur handlers: the text is written to the cell when the
// editor loses focus, unless the edit was cancelled with Escape.
type EditorState = { cancelled: boolean };

// The single open label editor (one at a time by design).
let currentEditor: HTMLDivElement | null = null;

// Saves and removes the open label editor, if any. Called on paper
// pointerdowns — clicking the SVG does not blur the contenteditable natively.
export function closeLabelEditor() {
    if (!currentEditor) return;

    // Trigger blur event to save the text and remove the editor
    (currentEditor.firstChild! as HTMLDivElement).blur();
    currentEditor = null;
}

// Opens an inline label editor over the cell.
export function openLabelEditor(paper: dia.Paper, selection: Selection, cellView: dia.CellView) {

    const cell = cellView.model as AppShape;

    if (!cell.getLabelEditorStyles) return;

    const editableWrapper = document.createElement('div');
    editableWrapper.classList.add('label-editor-wrapper');

    const wrapperStyles = { ...labelEditorWrapperStyles, ...cell.getLabelEditorStyles(paper) };

    // Apply global wrapper styles and styles from the shape
    Object.assign(editableWrapper.style, wrapperStyles);

    const contentEditableDiv = document.createElement('div');
    contentEditableDiv.contentEditable = 'true';
    contentEditableDiv.classList.add('label-editor');

    editableWrapper.appendChild(contentEditableDiv);

    // Keep the cell selected so the inspector stays open during the edit.
    selection.collection.reset([cellView.model]);

    const state: EditorState = { cancelled: false };

    // Where the focus goes when the editor is closed with the keyboard —
    // the canvas for a keyboard-started edit, so the shortcuts keep working.
    const opener = document.activeElement as HTMLElement | null;

    if (cell.isLink()) {
        editLinkLabel(editableWrapper, contentEditableDiv, cell as AppLink, paper, state);
    } else {
        editElementLabel(editableWrapper, contentEditableDiv, cell as AppElement, paper, state);
    }

    // Select all text in the editable area
    const range = document.createRange();
    const sel = window.getSelection();
    range.setStart(contentEditableDiv, contentEditableDiv.childNodes.length);
    range.selectNodeContents(contentEditableDiv);
    sel?.removeAllRanges();
    sel?.addRange(range);

    // Prevent default scroll behavior and manage centering
    contentEditableDiv.addEventListener('input', () => {
        // Reset the height to recalculate the scrollHeight
        contentEditableDiv.style.height = 'auto';

        // Calculate new height
        const newHeight = contentEditableDiv.clientHeight;

        // Ensure editable area also expands as needed
        contentEditableDiv.style.height = `${newHeight}px`;
    });

    // Enable text selection
    contentEditableDiv.addEventListener('mousedown', (evt) => {
        evt.stopPropagation();
    });

    // Enable saving on Enter (without shift), cancel on Escape
    contentEditableDiv.addEventListener('keydown', (evt) => {

        const isEnter = evt.key === 'Enter' && !evt.shiftKey;
        const isEscape = evt.key === 'Escape';

        if (!isEnter && !isEscape) return;

        if (isEnter) {
            evt.preventDefault();
        }
        // The app shortcuts are bound on `document` and the editor is gone
        // by the time the event gets there — without this the Enter closing
        // the editor would reopen it, and the Escape would clear the
        // selection.
        evt.stopPropagation();

        // Escape discards the edit: the text is only written on blur.
        state.cancelled = isEscape;

        contentEditableDiv.blur();
        selection.collection.reset([cell]);
        currentEditor = null;
        opener?.focus();
    });

    currentEditor = editableWrapper;
}

function editLinkLabel(editorWrapper: HTMLDivElement, editable: HTMLDivElement, link: AppLink, paper: dia.Paper, state: EditorState) {

    const label = link.label(0)?.attrs?.label?.text;
    editable.innerText = label ?? '';

    // Hide the labels, so the label editor is visible instead
    const labelsNode = paper.findViewByModel(link)?.el.querySelector('.labels') as SVGElement | null;
    if (labelsNode) {
        labelsNode.style.display = 'none';
    }

    paper.el.appendChild(editorWrapper);
    editable.focus();

    editable.addEventListener('blur', () => {

        // Escape discards the edit — the link keeps the label it had.
        if (!state.cancelled) {

            // Remove line breaks
            const parsedText = editable.innerText.trim().replace(/<br>/, '');

            if (parsedText !== '') {

                link.label(0, {
                    attrs: {
                        label: {
                            text: parsedText
                        }
                    }
                });

            } else {
                link.removeLabel(0);
            }
        }

        // Show the labels
        if (labelsNode) {
            labelsNode.style.display = 'block';
        }

        editorWrapper.remove();
    });
}

function editElementLabel(editorWrapper: HTMLDivElement, editable: HTMLDivElement, element: AppElement, paper: dia.Paper, state: EditorState) {

    const labelPath = element.labelPath;

    // Store the original label
    const originalLabel = element.attr(labelPath) || '';
    editable.innerText = originalLabel;

    const labelElementView = paper.findViewByModel(element) as LabelElementView;
    labelElementView.setLabelNodeDisplay(false);

    paper.el.appendChild(editorWrapper);
    editable.focus();

    editable.addEventListener('blur', () => {

        // Escape discards the edit — the original label stays untouched.
        if (!state.cancelled) {
            element.attr(labelPath, editable.innerText.trim());
        }
        labelElementView.setLabelNodeDisplay(true);

        editorWrapper.remove();
    });
}
