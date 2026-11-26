// The inputs that take no text: a key pressed on them is a shortcut (a control of the equipment focused).
const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'range', 'button', 'submit', 'reset', 'color', 'file', 'image']);

/** Whether the key is typed into a field (a text box, a list, an editable text): not a shortcut then. */
export function isTyping(event: KeyboardEvent): boolean {
    const { target } = event;
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    if (target instanceof HTMLInputElement) {
        return !NON_TEXT_INPUTS.has(target.type);
    }
    return target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}
