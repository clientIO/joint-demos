/**
 * One board being played.
 *
 * The `<Diagram>` sits here rather than around the canvas alone, because the
 * rectangles are graph elements and the toolbar acts on them: undo, redo and
 * clear all go through hooks that need the graph in context.
 *
 * Mounted with a key derived from the puzzle, so a new board starts from an
 * empty graph and an empty undo stack without this component having to notice.
 */
import { useMemo } from 'react';
import { Diagram, type InteractionsOptions } from '@joint/react-plus';
import { Board } from '@/canvas/board';
import { buildSquares } from '@/canvas/cells';
import { Toolbar, type Settings } from '@/toolbar/toolbar';
import type { Puzzle } from '@/puzzle/types';
import { BoardStatus } from './board-status';
import { useGame } from './use-game';
import { useTimer } from './use-timer';

/**
 * No `<Selection>` is mounted and none is wanted: the drag on this board draws
 * a rectangle, and the library's click-to-select, Shift+drag region and
 * Delete / Ctrl+A bindings would only get in its way.
 *
 * `commandManager` is left alone on purpose — it defaults to on, and it is what
 * binds Ctrl/Cmd + Z and Shift + Ctrl/Cmd + Z to the history below.
 */
const INTERACTIONS: InteractionsOptions = { selection: false };

export interface ShikakuGameProps {
    readonly puzzle: Puzzle;
    /** `false` freezes the timer at zero, for a reproducible screenshot. */
    readonly clock: boolean;
    readonly settings: Settings;
    readonly onSettingsChange: (settings: Settings) => void;
    readonly onNewPuzzle: () => void;
}

function Playing({ puzzle, clock, settings, onSettingsChange, onNewPuzzle }: ShikakuGameProps) {
    const game = useGame(puzzle);
    // Stops the moment the last square is covered, so the toast can report the
    // time the board actually took — and never starts at all when the clock has
    // been turned off.
    const elapsed = useTimer(clock && !game.solved);

    return (
        <>
            <Toolbar
                game={game}
                settings={settings}
                onSettingsChange={onSettingsChange}
                onNewPuzzle={onNewPuzzle}
            />
            <main className="board-area">
                <Board
                    puzzle={puzzle}
                    game={game}
                    elapsed={elapsed}
                    onNewPuzzle={onNewPuzzle}
                />
                <BoardStatus puzzle={puzzle} game={game} elapsed={elapsed} />
            </main>
        </>
    );
}

export function ShikakuGame(props: ShikakuGameProps) {
    const squares = useMemo(() => buildSquares(props.puzzle), [props.puzzle]);

    return (
        // `history` is what gives the demo undo and redo, buttons and keyboard
        // shortcuts alike.
        <Diagram initialCells={squares} interactions={INTERACTIONS} history>
            <Playing {...props} />
        </Diagram>
    );
}
