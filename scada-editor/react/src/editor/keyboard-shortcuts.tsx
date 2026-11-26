import { useGraph, useGraphHistory, useOnKeyboardEvents, useSelectionCollection } from '@joint/react-plus';
import { useEscapeFallback } from './escape-layers';
import { levelUp } from './group-levels';
import { GRID_SIZE } from './connection-rules';
import { useEditorActions } from './use-editor-actions';

// Shift moves the selection five grid steps.
const LARGE_STEP_FACTOR = 5;
const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
};

/**
 * The shortcuts of the edit mode (the diagram's own are off: these know the groups and the IDs): undo, redo, the
 * clipboard (a pasted shape with an ID of its own), delete (a group left with one member dissolved), select all or
 * the elements, `Escape` one group level up, group / ungroup, flip, move the selection by the grid.
 * Not while typing (the keyboard skips the fields).
 */
export function KeyboardShortcuts() {
    const actions = useEditorActions();
    const { collection, selectCells } = useSelectionCollection();
    const { setCell, transaction } = useGraph();
    const { undo, redo } = useGraphHistory();

    /** The shortcut's default (of the browser) prevented, the action run. */
    const run = (action: () => void) => (event: { preventDefault: () => void }) => {
        event.preventDefault();
        action();
    };

    const moveSelection = (event: { readonly key: string; readonly shiftKey: boolean; preventDefault: () => void }) => {
        const direction = ARROWS[event.key];
        const elements = collection.toArray().filter((cell) => cell.isElement());
        if (!direction || elements.length === 0) {
            return;
        }
        event.preventDefault();
        const step = GRID_SIZE * (event.shiftKey ? LARGE_STEP_FACTOR : 1);
        transaction(() => {
            for (const element of elements) {
                // A member moves with its selected group.
                if (element.getAncestors().some((group) => collection.has(group))) {
                    continue;
                }
                const { x, y } = element.position();
                setCell(element.id, (previous) => ({ ...previous, position: { x: x + direction[0] * step, y: y + direction[1] * step } }));
            }
        }, { name: 'move' });
    };

    // `Escape` with nothing open over the diagram (a menu, Find): one group level up, the selection cleared at the top.
    useEscapeFallback(() => selectCells([...levelUp(collection)]));

    useOnKeyboardEvents({
        'ctrl+z command+z': run(undo),
        'ctrl+y command+y ctrl+shift+z command+shift+z': run(redo),
        'ctrl+c command+c': run(actions.copy),
        'ctrl+x command+x': run(actions.cut),
        'ctrl+v command+v': run(actions.paste),
        'delete backspace': run(actions.remove),
        'ctrl+a command+a': run(actions.selectAll),
        'ctrl+shift+a command+shift+a': (event) => {
            event.preventDefault();
            actions.selectElements();
        },
        'ctrl+g command+g': (event) => {
            event.preventDefault();
            actions.group();
        },
        'ctrl+shift+g command+shift+g': (event) => {
            event.preventDefault();
            actions.ungroup();
        },
        'shift+h': () => actions.flip('x'),
        'shift+v': () => actions.flip('y'),
        'up down left right shift+up shift+down shift+left shift+right': (event) => {
            if (event.originalEvent instanceof KeyboardEvent) {
                moveSelection(event.originalEvent);
            }
        },
    });
    return null;
}
