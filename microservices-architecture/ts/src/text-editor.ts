import type { dia } from '@joint/plus';
import { V, mvc } from '@joint/plus';

let activeInput: HTMLInputElement | null = null;

/**
 * Opens an inline text editor over the element's label.
 */
export function openTextEditor(paper: dia.Paper, element: dia.Element) {

    closeTextEditor();

    const elementView = element.findView(paper) as dia.ElementView;
    if (!elementView) return;

    // Read font attributes from the element's label
    const labelAttrs = element.attr('label');
    if (!labelAttrs) return;

    const originalText = labelAttrs.text || '';
    const fontSize = labelAttrs.fontSize || 12;
    const fontFamily = labelAttrs.fontFamily || 'sans-serif';
    const fontWeight = labelAttrs.fontWeight || 'normal';
    const fill = labelAttrs.fill || '#000';

    // Get the label's bounding box in local coordinates
    const labelNode = elementView.findNode('label') as SVGGraphicsElement;
    if (!labelNode) return;
    const labelBBox = labelNode.getBBox();

    // Create the input element
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'inline-text-editor';
    input.value = originalText;

    // Dynamic font styles
    const { width } = element.size();
    const style = input.style;
    style.fontSize = `${fontSize}px`;
    style.fontFamily = fontFamily;
    style.fontWeight = String(fontWeight);
    style.color = fill;
    style.width = `${width}px`;
    style.height = `${labelBBox.height + 8}px`;

    activeInput = input;

    // Position the input over the label using the paper's transform matrix
    const positionInput = () => {
        const pos = element.position();
        const inputTransform = paper.matrix().translate(
            pos.x,
            pos.y + labelBBox.y + labelBBox.height / 2 - (labelBBox.height + 8) / 2
        );
        input.style.transform = V.matrixToTransformString(inputTransform);
    };

    positionInput();
    paper.el.appendChild(input);
    input.focus();
    input.select();

    // Listen for paper events
    const listener = new mvc.Listener();

    listener.listenTo(paper, {
        'blank:pointerdown cell:pointerdown': () => closeTextEditor(),
        'transform': () => positionInput(),
    });

    listener.listenTo(element, {
        'remove': () => closeTextEditor(),
    });

    // Prevent paper events when interacting with the input
    ['mousedown', 'touchstart'].forEach((eventName) => {
        input.addEventListener(eventName, (evt) => {
            evt.stopPropagation();
        });
    });

    // Prevent keyboard shortcuts (Delete/Backspace) from propagating
    input.addEventListener('keydown', (evt) => {
        evt.stopPropagation();
        if (evt.key === 'Escape') {
            input.value = originalText;
            input.blur();
        } else if (evt.key === 'Enter') {
            input.blur();
        }
    });

    // Save on blur
    input.addEventListener('blur', () => {
        const newText = input.value.trim();
        if (newText && newText !== originalText) {
            element.attr('label/text', newText);
        }
        input.remove();
        listener.stopListening();
        if (activeInput === input) {
            activeInput = null;
        }
    });
}

/**
 * Closes the currently open text editor, if any.
 */
export function closeTextEditor() {
    if (activeInput) {
        activeInput.blur();
        activeInput = null;
    }
}
