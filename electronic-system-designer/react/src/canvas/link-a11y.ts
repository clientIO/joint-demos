// Wires are drawn by renderLink INSIDE the link view's root <g> — the element
// that carries a cell's focus and selection. That root is the library's: it
// has no name, no role, and no tabindex. (Chrome alone lets it be tabbed to —
// an accident of the focus listeners React hangs on every portal container;
// Firefox and Safari skip it.) Name it and make it the wire's single tab stop
// from the decoration's ref — the same imperative reach the canvas uses for
// its scroll container, and for the same reason: the element is not ours.

/** Ref callback: names the wire's focusable root after its net or bundle. */
export function nameLinkRoot(label: string) {
    return (node: SVGGElement | null): void => {
        const root = node?.closest('[model-id]');
        if (!root) return;
        root.setAttribute('tabindex', '0');
        root.setAttribute('role', 'img');
        root.setAttribute('aria-label', label);
        // Reuses the symbols' keyboard-focus outline (index.css).
        root.classList.add('esd-focusable');
    };
}
