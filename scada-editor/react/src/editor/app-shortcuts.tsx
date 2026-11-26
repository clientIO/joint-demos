import { useOnKeyboardEvents } from '@joint/react-plus';
import { useEscapeLayers } from './escape-layers';

interface AppShortcutsProps {
    /** `Cmd + F`: Find opened, or its filter focused again (both modes). */
    readonly onFind: () => void;
    /** `Cmd + \`: the palette and the inspector hidden, or shown (edit mode). */
    readonly onTogglePanels?: () => void;
}

/** The shortcuts of the app, beyond the diagram's: Find, the panels, `Escape`. Not while typing (the keyboard skips the fields). */
export function AppShortcuts({ onFind, onTogglePanels }: AppShortcutsProps) {
    const escapeLayers = useEscapeLayers();
    useOnKeyboardEvents({
        'ctrl+f command+f': (event) => {
            // Not the find of the browser.
            event.preventDefault();
            onFind();
        },
        'ctrl+\\ command+\\': (event) => {
            event.preventDefault();
            onTogglePanels?.();
        },
        // One thing a press: what is open on top closed, else the diagram's own (see `escape-layers.ts`).
        escape: escapeLayers.press,
    });
    return null;
}
