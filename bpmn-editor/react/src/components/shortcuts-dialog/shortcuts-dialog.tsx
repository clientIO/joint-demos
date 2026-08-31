import { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import './shortcuts-dialog.css';

interface ShortcutsDialogProps {
    onClose: () => void;
}

// The shortcuts are bound in `hooks/use-keyboard-shortcuts.ts` (and, for the
// stencil, in `components/bpmn-stencil/bpmn-palette.tsx`) — keep both sides
// in step when a binding changes.
// `keys` is one combination; `or` is an equivalent second one (enter / F2).
type Shortcut = { keys: string[], or?: string[], action: string };
type ShortcutGroup = { title: string, shortcuts: Shortcut[] };

// `⌘` on Apple platforms, `Ctrl` everywhere else — the bindings themselves
// accept either.
const MOD = /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl';

const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
        title: 'Selection',
        shortcuts: [
            { keys: ['↑', '↓', '←', '→'], action: 'Move to the nearest shape that way (focusing a shape selects it)' },
            { keys: ['Tab'], action: 'Move to the next shape, pools and lanes included' },
            { keys: ['Shift', 'Tab'], action: 'Move to the previous shape' },
            { keys: [MOD, 'A'], action: 'Select all' },
            { keys: ['Esc'], action: 'Clear the selection' },
            { keys: ['Delete'], action: 'Delete the selection' },
            { keys: ['Shift'], action: 'Hold to drag a selection region' }
        ]
    },
    {
        title: 'Editing',
        shortcuts: [
            { keys: ['Enter'], or: ['F2'], action: 'Rename the selected shape' },
            { keys: ['Shift', 'Enter'], action: 'Line break while renaming' },
            { keys: ['Esc'], action: 'Discard the rename' },
            { keys: [MOD, 'Enter'], action: 'Add: a connected shape, a shape in a lane, or a lane in a pool' },
            { keys: [MOD, '↑'], or: [MOD, '↓'], action: 'Add a connected shape above or below' },
            { keys: [MOD, '←'], or: [MOD, '→'], action: 'Add a connected shape to the left or right' },
            { keys: ['Shift', MOD, 'Enter'], action: 'Link to another shape or pool — from a lane, add a lane after it' },
            { keys: [MOD, 'C'], action: 'Copy the selection' },
            { keys: [MOD, 'X'], action: 'Cut the selection' },
            { keys: [MOD, 'V'], action: 'Paste — a shape returns to its lane, a lane or pool is copied with its contents' }
        ]
    },
    {
        title: 'Moving and sizing',
        shortcuts: [
            { keys: ['Shift', '↑', '↓', '←', '→'], action: 'Move the selection by one grid step' },
            { keys: ['Alt', '→'], or: ['Alt', '↓'], action: 'Grow a pool, lane, group or comment (right or bottom edge)' },
            { keys: ['Alt', '←'], or: ['Alt', '↑'], action: 'Shrink it' },
            { keys: ['Alt', 'Shift', '←'], or: ['Alt', 'Shift', '↑'], action: 'Grow it from the left or top edge instead' }
        ]
    },
    {
        title: 'Stencil',
        shortcuts: [
            { keys: ['Tab'], action: 'Move to the shape palette' },
            { keys: ['↑', '↓'], action: 'Aim at the previous or next lane — for a lane, the insertion point between them' },
            { keys: ['←', '→'], action: 'Aim at the previous or next pool' },
            { keys: ['Enter'], or: ['Space'], action: 'Add the palette shape where the highlight shows' }
        ]
    },
    {
        title: 'Help',
        shortcuts: [
            { keys: ['F1'], action: 'Show this list' }
        ]
    },
    {
        title: 'View and history',
        shortcuts: [
            { keys: [MOD, 'Z'], action: 'Undo' },
            { keys: ['Shift', MOD, 'Z'], action: 'Redo' },
            { keys: [MOD, '+'], action: 'Zoom in' },
            { keys: [MOD, '−'], action: 'Zoom out' },
            { keys: [MOD, 'P'], action: 'Print the diagram' },
            { keys: ['↑', '↓', '←', '→'], action: 'Scroll the canvas, with nothing selected' }
        ]
    }
];

/**
 * Lists the editor's keyboard shortcuts. Opened from the toolbar — the
 * bindings are otherwise undiscoverable.
 */
export function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {

    // The dialog is rendered on demand rather than from a `Dialog.Trigger`,
    // so Radix has no trigger to hand the focus back to — remember what
    // opened it and restore that on close.
    const openerRef = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null);

    return (
        <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="shortcuts-dialog-backdrop" />
                <Dialog.Content
                    className="shortcuts-dialog"
                    aria-describedby={undefined}
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        openerRef.current?.focus();
                    }}
                >
                    <div className="shortcuts-dialog-header">
                        <Dialog.Title asChild>
                            <h2>Keyboard shortcuts</h2>
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button type="button" className="shortcuts-dialog-close" aria-label="Close">
                                <X size={16} />
                            </button>
                        </Dialog.Close>
                    </div>
                    <div className="shortcuts-dialog-body">
                        {SHORTCUT_GROUPS.map((group) => (
                            <section key={group.title} className="shortcuts-group">
                                <h3>{group.title}</h3>
                                {/* Action first: it is what the reader scans for, and it
                                    is what a screen reader announces before the keys. */}
                                <dl>
                                    {group.shortcuts.map((shortcut) => (
                                        <div className="shortcuts-row" key={`${group.title}-${shortcut.action}-${shortcut.keys.join()}`}>
                                            <dt>{shortcut.action}</dt>
                                            <dd>
                                                {shortcut.keys.map((key) => (
                                                    <kbd key={key}>{key}</kbd>
                                                ))}
                                                {shortcut.or && (
                                                    <>
                                                        <span className="shortcuts-or">or</span>
                                                        {shortcut.or.map((key) => (
                                                            <kbd key={key}>{key}</kbd>
                                                        ))}
                                                    </>
                                                )}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            </section>
                        ))}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
