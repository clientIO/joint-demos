import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts';

/**
 * Renders nothing. Wires the keyboard shortcuts (delete, undo/redo,
 * select-all, zoom, escape).
 */
export function KeyboardShortcuts() {

    useKeyboardShortcuts();

    return null;
}
