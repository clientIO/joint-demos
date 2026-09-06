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

const DIFFICULTY_HINTS: Record<Difficulty, string> = {
    easy: 'Small rectangles',
    medium: 'A mix',
    hard: 'Large rectangles, more places each number could sit',
};

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
                <div className="field-row">
                    {/*
                      * A span rather than a <label>: a label points at one
                      * control and there are two here. Each input carries its
                      * own accessible name.
                      */}
                    <span className="field-label">Size</span>
                    <div className="field-controls">
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
                    </div>
                </div>

                {/*
                  * Three real radios behind the buttons: one choice out of
                  * three, which is what a radio group is, and it arrows between
                  * them from the keyboard without any work here.
                  */}
                <fieldset className="field-row">
                    <legend className="field-label">Difficulty</legend>
                    <div className="choices">
                        {DIFFICULTIES.map((difficulty) => (
                            <label
                                key={difficulty}
                                className="choice"
                                title={DIFFICULTY_HINTS[difficulty]}
                            >
                                <input
                                    type="radio"
                                    name="difficulty"
                                    value={difficulty}
                                    checked={draft.difficulty === difficulty}
                                    onChange={() =>
                                        setDraft((previous) => ({ ...previous, difficulty }))
                                    }
                                />
                                {/*
                                  * `data-label` feeds a hidden bold copy of the
                                  * word, which is what keeps the segment as wide
                                  * as its own selected state — see `index.css`.
                                  */}
                                <span data-label={difficulty}>{difficulty}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
            </div>

            <form method="dialog" className="dialog-actions">
                <button type="submit">Cancel</button>
                {/*
                  * "Generate" rather than "New puzzle" again: the dialog is
                  * already titled that, and the button says what pressing it
                  * does.
                  */}
                <button
                    type="submit"
                    className="primary"
                    formMethod="dialog"
                    onClick={() => onNewPuzzle(draft)}
                >
                    Generate
                </button>
            </form>
        </dialog>
    );
}
