/**
 * The board canvas.
 *
 * The graph is provided above this, by the `<Diagram>` in `game.tsx` — it has
 * to wrap the toolbar too, because the rectangles live on the graph and the
 * toolbar's undo, redo and clear act on them.
 *
 * The squares are seeded once and never touched again. Placing a rectangle adds
 * an element over them; the one being dragged is another
 * (`usePendingCell`), written with history skipped.
 */
import { useState } from 'react';
import { Paper } from '@joint/react-plus';
import type { GameApi } from '@/game/use-game';
import { formatDuration } from '@/game/use-timer';
import { REJECT_MESSAGES } from '@/puzzle/rules';
import type { Puzzle } from '@/puzzle/types';
import { RenderCell } from './render-cell';
import { useDrawRegion } from './use-draw-region';
import { useFitToContent } from './use-fit-to-content';
import { usePendingCell } from './use-pending-cell';


export interface BoardProps {
    readonly puzzle: Puzzle;
    readonly game: GameApi;
    /** Milliseconds the board took, frozen once it is solved. */
    readonly elapsed: number;
    readonly onNewPuzzle: () => void;
}

export function Board({ puzzle, game, elapsed, onNewPuzzle }: BoardProps) {
    const { pending, rejection, handlers } = useDrawRegion(puzzle, game);
    const [toastDismissed, setToastDismissed] = useState(false);
    const showToast = game.solved && !toastDismissed;
    /*
     * The fit never changes for anything drawn over the board. Reserving room
     * for the toast rescaled the board the moment the last square was filled,
     * which is exactly the wrong moment to move the thing the player has just
     * finished looking at. The toast is drawn over the board instead, at the
     * top with everything else this demo has to say about it.
     */
    const ref = useFitToContent();

    usePendingCell(pending);

    /*
     * How many squares are under the rectangle being dragged, on every pointer
     * move. The game is hitting an exact number, and counting squares by eye is
     * the tedious part.
     *
     * Drawn large in the corner of the canvas, over the board rather than in a
     * band above it — a reserved band would push the board down and leave a gap
     * for the whole game to pay for one transient number. It sits on a
     * translucent backdrop so it stays legible over whatever it covers, reddens
     * with the outline when the rectangle cannot be placed, and the pill says
     * why.
     *
     * Not on the rectangle itself: a label inside the shape is one more thing
     * to read in exactly the place the shape is already saying something.
     */
    const count = pending ? pending.rect.w * pending.rect.h : null;

    return (
        // The board's own right-click means "remove this rectangle", so the
        // native menu has to stay away — including on the space around the
        // squares, which no element handler sees.
        <div
            className="board-stage"
            ref={ref}
            onContextMenu={(event) => event.preventDefault()}
        >
            <Paper
                className="board-paper"
                renderElement={RenderCell}
                // The paper's background is a stylesheet rule rather than this
                // prop, so it themes with everything else.
                // The squares are drawn on, not moved: every gesture on them
                // belongs to the rubber band.
                interactive={false}
                drawGrid={false}
                {...handlers}
            />
            {count !== null && (
                <p className={rejection ? 'board-count rejected' : 'board-count'}>{count}</p>
            )}
            {rejection && <p className="board-reject">{REJECT_MESSAGES[rejection]}</p>}
            {showToast && (
                <div className="toast" role="status">
                    <span className="toast-mark" aria-hidden="true">
                        ✓
                    </span>
                    <span className="toast-text">
                        <strong>Solved in {formatDuration(elapsed)}.</strong> Every square is
                        in a rectangle.
                    </span>
                    <button type="button" className="primary" onClick={onNewPuzzle}>
                        New puzzle
                    </button>
                    <button
                        type="button"
                        className="toast-close"
                        aria-label="Dismiss"
                        onClick={() => setToastDismissed(true)}
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}
