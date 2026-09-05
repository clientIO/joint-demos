/**
 * The controls.
 *
 * Size and difficulty are staged rather than applied: typing "1" on the way to
 * "12" should not throw away the board being played. They are read when *New
 * puzzle* is pressed, which is the button right next to them.
 */
import { useState } from 'react';
import type { GameApi } from '@/game/use-game';
import { clampSide, MAX_SIDE, MIN_SIDE } from '@/puzzle/board-size';
import type { Difficulty } from '@/puzzle/types';
// Imported rather than written as a "/…" src, so Vite emits a base-relative
// URL — the built demo is served from a sub-path and a rooted one would 404.
import jointjsLogo from '@/assets/jointjs-logo.svg';
import { HelpDialog } from './help-dialog';
import { ClearIcon, HelpIcon, MoonIcon, RedoIcon, SunIcon, UndoIcon } from './icons';
import { useTheme } from './use-theme';

export interface Settings {
    readonly cols: number;
    readonly rows: number;
    readonly difficulty: Difficulty;
}

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

/*
 * Shortcut labels for the button tooltips. The bindings themselves live in
 * `src/canvas/use-board-shortcuts.ts` — they have to be registered on the
 * diagram's keyboard, which only exists inside `<Diagram>`.
 */
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
const UNDO_HINT = IS_MAC ? '\u2318Z' : 'Ctrl+Z';
const REDO_HINT = IS_MAC ? '\u21e7\u2318Z' : 'Ctrl+Shift+Z';

export interface ToolbarProps {
    readonly game: GameApi;
    readonly settings: Settings;
    readonly onSettingsChange: (settings: Settings) => void;
    readonly onNewPuzzle: () => void;
}

export function Toolbar({ game, settings, onSettingsChange, onNewPuzzle }: ToolbarProps) {
    const [helpOpen, setHelpOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    return (
        <header className="toolbar">
            <div className="toolbar-group">
                <a
                    className="toolbar-brand"
                    href="https://www.jointjs.com/jointjs-plus"
                    target="_blank"
                    rel="noreferrer"
                    title="Built with JointJS+"
                >
                    <img src={jointjsLogo} alt="JointJS+" className="toolbar-logo" />
                </a>
                <span className="toolbar-title">Shikaku</span>
            </div>

            <div className="toolbar-group">
                <label className="field">
                    <span>Size</span>
                    <input
                        type="number"
                        aria-label="Board width"
                        min={MIN_SIDE}
                        max={MAX_SIDE}
                        value={settings.cols}
                        onChange={(event) =>
                            onSettingsChange({ ...settings, cols: clampSide(event.target.valueAsNumber) })
                        }
                    />
                    <span aria-hidden="true">×</span>
                    <input
                        type="number"
                        aria-label="Board height"
                        min={MIN_SIDE}
                        max={MAX_SIDE}
                        value={settings.rows}
                        onChange={(event) =>
                            onSettingsChange({ ...settings, rows: clampSide(event.target.valueAsNumber) })
                        }
                    />
                </label>
                <label
                    className="field"
                    title="The largest rectangle the generator may cut, scaled to the board"
                >
                    <span>Difficulty</span>
                    <select
                        value={settings.difficulty}
                        onChange={(event) =>
                            onSettingsChange({
                                ...settings,
                                difficulty: event.target.value as Difficulty,
                            })
                        }
                    >
                        {DIFFICULTIES.map((difficulty) => (
                            <option key={difficulty} value={difficulty}>
                                {difficulty}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    type="button"
                    className="primary"
                    title="Generate a board at the chosen size and difficulty"
                    onClick={onNewPuzzle}
                >
                    New puzzle
                </button>
            </div>

            <div className="toolbar-group">
                <button
                    type="button"
                    className="icon"
                    onClick={game.undo}
                    disabled={!game.canUndo}
                    title={`Undo (${UNDO_HINT})`}
                    aria-label={`Undo (${UNDO_HINT})`}
                >
                    <UndoIcon />
                </button>
                <button
                    type="button"
                    className="icon"
                    onClick={game.redo}
                    disabled={!game.canRedo}
                    title={`Redo (${REDO_HINT})`}
                    aria-label={`Redo (${REDO_HINT})`}
                >
                    <RedoIcon />
                </button>
                <button
                    type="button"
                    className="icon"
                    onClick={game.clear}
                    disabled={game.regions.length === 0}
                    title="Clear the board"
                    aria-label="Clear the board"
                >
                    <ClearIcon />
                </button>
            </div>

            <div className="toolbar-group toolbar-tools">
                <button
                    type="button"
                    className="icon"
                    title={theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'}
                    aria-label={
                        theme === 'dark' ? 'Switch to the light theme' : 'Switch to the dark theme'
                    }
                    onClick={toggleTheme}
                >
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                </button>
                <button
                    type="button"
                    className="icon"
                    title="Rules and how to play"
                    aria-label="Rules and how to play"
                    onClick={() => setHelpOpen(true)}
                >
                    <HelpIcon />
                </button>
                <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
            </div>

        </header>
    );
}
