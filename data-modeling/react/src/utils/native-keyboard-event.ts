// The Diagram keyboard (ui.Keyboard) invokes shortcut handlers with the NATIVE
// KeyboardEvent, while the declared handler type suggests a jQuery-style event
// with `originalEvent`. Accept both shapes so reading `key` / modifier flags is
// safe regardless of which one arrives.
export function nativeKeyboardEvent(event: unknown): KeyboardEvent | null {
    if (event instanceof KeyboardEvent) return event;
    if (
        typeof event === 'object' &&
    event !== null &&
    'originalEvent' in event &&
    event.originalEvent instanceof KeyboardEvent
    ) {
        return event.originalEvent;
    }
    return null;
}
