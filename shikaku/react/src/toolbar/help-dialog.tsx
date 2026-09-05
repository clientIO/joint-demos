/**
 * The rules, and how to play them here.
 *
 * A native `<dialog>` opened with `showModal()`: the backdrop, the focus trap,
 * Escape-to-close and the top layer are all the platform's, so this is markup
 * and a `ref` rather than a modal implementation.
 */
import { useEffect, useRef } from 'react';


export interface HelpDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
}

export function HelpDialog({ open, onClose }: HelpDialogProps) {
    const dialog = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const element = dialog.current;
        if (!element) return;
        // `showModal` throws if the dialog is already open, and `open` is the
        // source of truth either way.
        if (open && !element.open) element.showModal();
        if (!open && element.open) element.close();
    }, [open]);

    return (
        // `close` covers every way the platform can shut it — Escape, the
        // backdrop, the form button — so React state never drifts from the DOM.
        <dialog ref={dialog} className="help" onClose={onClose}>
            <h2>Shikaku</h2>
            <p>
                Cut the whole grid into rectangles. Every rectangle must contain
                exactly one number, and cover exactly that many squares. Every
                square ends up in exactly one rectangle, and each board has a
                single solution.
            </p>

            <h3>Playing</h3>
            <ul>
                <li>
                    <b>Draw</b> — press on a square and drag. The big number in the
                    corner is how many squares you are covering.
                </li>
                <li>
                    <b>A single square</b> — click it. That is how a <code>1</code> is
                    placed.
                </li>
                <li>
                    <b>Remove</b> — right-click inside a rectangle.
                </li>
                <li>
                    <b>Escape</b> — abandon the rectangle you are dragging.
                </li>
                <li>
                    <b>Undo / redo</b> — <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Z</kbd>, and
                    with <kbd>Shift</kbd> to redo.
                </li>
            </ul>

            <h3>Good to know</h3>
            <ul>
                <li>
                    Only a legal rectangle can be placed. One that is the wrong size,
                    holds no number or two, or runs into a rectangle already on the
                    board, previews in dashed red and is dropped when you let go — so
                    nothing on the board is ever wrong.
                </li>
                <li>
                    Neighboring rectangles never share a color, so the boundary
                    between two of them is always readable.
                </li>
                <li>
                    <b>Size</b> and <b>Difficulty</b> take effect on <b>New puzzle</b>.
                    Difficulty is the largest rectangle the generator may cut.
                </li>
                <li>
                    The clock in the corner starts with the board and stops when you
                    finish. A new puzzle starts it again.
                </li>
                <li>The seed in the corner reproduces a board exactly.</li>
            </ul>

            <form method="dialog">
                <button type="submit" className="primary">
                    Got it
                </button>
            </form>
        </dialog>
    );
}
