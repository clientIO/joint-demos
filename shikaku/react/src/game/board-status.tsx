/**
 * Where the board stands: rectangles placed, squares covered, and the seed the
 * board came from.
 *
 * Sits in the corner of the canvas rather than in the top bar. It is state, not
 * a control — reading it means looking at the board anyway — and out of the top
 * bar it stops the toolbar from wrapping on anything narrower than a very wide
 * window.
 */
import type { Puzzle } from '@/puzzle/types';
import type { GameApi } from './use-game';
import { formatDuration } from './use-timer';

export interface BoardStatusProps {
    readonly puzzle: Puzzle;
    readonly game: GameApi;
    /** Milliseconds since the board appeared. */
    readonly elapsed: number;
}

export function BoardStatus({ puzzle, game, elapsed }: BoardStatusProps) {
    return (
        <div className="board-status">
            <span className="board-clock">{formatDuration(elapsed)}</span>
            <span>
                {game.regions.length}/{puzzle.clues.length} rectangles
            </span>
            <span>
                {game.covered}/{game.total} squares
            </span>
            <span className="muted" title="The board is a pure function of this seed.">
                seed {puzzle.seed}
            </span>
            {!puzzle.unique && (
                <span
                    className="warn"
                    title="The generator could not confirm a single solution for this board."
                >
                    multiple solutions possible
                </span>
            )}
        </div>
    );
}
