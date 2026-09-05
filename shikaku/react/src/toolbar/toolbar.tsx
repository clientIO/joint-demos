/**
 * The controls.
 *
 * Size and difficulty are staged rather than applied: typing "1" on the way to
 * "12" should not throw away the board being played. They are read when *New
 * puzzle* is pressed, which is the button right next to them.
 */
import { useEffect, useState } from 'react';
import { boardUrl } from '@/board-request';
import type { GameApi } from '@/game/use-game';
import type { Difficulty, Puzzle } from '@/puzzle/types';
// Imported rather than written as a "/…" src, so Vite emits a base-relative
// URL — the built demo is served from a sub-path and a rooted one would 404.
import jointjsLogo from '@/assets/jointjs-logo.svg';
import { HelpDialog } from './help-dialog';
import { CheckIcon, ClearIcon, HelpIcon, LinkIcon, MoonIcon, RedoIcon, SunIcon, UndoIcon } from './icons';
import { SizeInput } from './size-input';
import { useTheme } from './use-theme';

export interface Settings {
    readonly cols: number;
    readonly rows: number;
    readonly difficulty: Difficulty;
}

const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

/*
 * Shortcut labels for the button tooltips. The bindings themselves are the
 * library's, from `<Diagram history>`.
 */
const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
const UNDO_HINT = IS_MAC ? '\u2318Z' : 'Ctrl+Z';
const REDO_HINT = IS_MAC ? '\u21e7\u2318Z' : 'Ctrl+Shift+Z';

/** How long the share button reports what happened before going quiet. */
const SHARED_MS = 1800;

type Shared = 'idle' | 'copied' | 'failed';

const SHARE_TITLES: Record<Shared, string> = {
    idle: 'Copy a link to this board',
    copied: 'Link copied',
    failed: 'Could not reach the clipboard',
};

export interface ToolbarProps {
    readonly puzzle: Puzzle;
    readonly game: GameApi;
    readonly settings: Settings;
    readonly onSettingsChange: (settings: Settings) => void;
    readonly onNewPuzzle: () => void;
}

export function Toolbar({ puzzle, game, settings, onSettingsChange, onNewPuzzle }: ToolbarProps) {
    const [helpOpen, setHelpOpen] = useState(false);
    const [shared, setShared] = useState<Shared>('idle');
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        if (shared === 'idle') return;
        const timer = setTimeout(() => setShared('idle'), SHARED_MS);
        return () => clearTimeout(timer);
    }, [shared]);

    /*
     * A board is a pure function of its size, difficulty and seed, so a link
     * carrying those three is the whole puzzle. What the player has placed is
     * not part of it: the point of sharing is to hand someone the same puzzle,
     * not the same progress.
     */
    const share = async () => {
        try {
            await navigator.clipboard.writeText(boardUrl(puzzle, window.location.href));
            setShared('copied');
        } catch {
            // No clipboard: an insecure origin, or permission refused. Saying so
            // beats a button that looks like it worked.
            setShared('failed');
        }
    };
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
                    <SizeInput
                        label="Board width"
                        value={settings.cols}
                        onChange={(cols) => onSettingsChange({ ...settings, cols })}
                    />
                    <span aria-hidden="true">×</span>
                    <SizeInput
                        label="Board height"
                        value={settings.rows}
                        onChange={(rows) => onSettingsChange({ ...settings, rows })}
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
                    className={shared === 'copied' ? 'icon copied' : 'icon'}
                    title={SHARE_TITLES[shared]}
                    aria-label={SHARE_TITLES[shared]}
                    onClick={share}
                >
                    {shared === 'copied' ? <CheckIcon /> : <LinkIcon />}
                </button>
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
