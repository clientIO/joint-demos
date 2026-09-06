/**
 * What the next board should be.
 *
 * Size and difficulty are here rather than in the toolbar because they are not
 * controls for the board on screen — they describe the next one. Out of the row
 * they also stop the toolbar wrapping on anything narrow.
 *
 * The dialog edits a draft and hands it over only when *New puzzle* is pressed,
 * so closing it leaves the board and the settings exactly as they were. That
 * also means the size fields never need to be reconciled with a board mid-edit.
 */
import { useEffect, useRef, useState } from 'react';
import type { Difficulty } from '@/puzzle/types';
import { SizeInput } from './size-input';
import type { Settings } from './toolbar';

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

export interface SettingsDialogProps {
    readonly open: boolean;
    readonly settings: Settings;
    readonly onClose: () => void;
    /** Generate a board from these settings. */
    readonly onNewPuzzle: (settings: Settings) => void;
}

export function SettingsDialog({ open, settings, onClose, onNewPuzzle }: SettingsDialogProps) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [draft, setDraft] = useState(settings);

    useEffect(() => {
        const element = dialog.current;
        if (!element) return;
        if (open && !element.open) {
            // Opened, so it starts from what the board on screen was made with.
            setDraft(settings);
            element.showModal();
        }
        if (!open && element.open) element.close();
    }, [open, settings]);

    return (
        <dialog ref={dialog} className="dialog" onClose={onClose}>
            <h2>New puzzle</h2>

            <div className="dialog-fields">
                <label className="field">
                    <span>Size</span>
                    <SizeInput
                        label="Board width"
                        value={draft.cols}
                        onChange={(cols) => setDraft((previous) => ({ ...previous, cols }))}
                    />
                    <span aria-hidden="true">×</span>
                    <SizeInput
                        label="Board height"
                        value={draft.rows}
                        onChange={(rows) => setDraft((previous) => ({ ...previous, rows }))}
                    />
                </label>

                <label
                    className="field"
                    title="The largest rectangle the generator may cut, scaled to the board"
                >
                    <span>Difficulty</span>
                    <select
                        value={draft.difficulty}
                        onChange={(event) =>
                            setDraft((previous) => ({
                                ...previous,
                                difficulty: event.target.value as Difficulty,
                            }))
                        }
                    >
                        {DIFFICULTIES.map((difficulty) => (
                            <option key={difficulty} value={difficulty}>
                                {difficulty}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <form method="dialog" className="dialog-actions">
                <button type="submit">Cancel</button>
                {/*
                  * `formMethod="dialog"` so this closes the dialog too; the
                  * click handler is what generates the board.
                  */}
                <button
                    type="submit"
                    className="primary"
                    formMethod="dialog"
                    onClick={() => onNewPuzzle(draft)}
                >
                    New puzzle
                </button>
            </form>
        </dialog>
    );
}
