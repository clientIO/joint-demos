/**
 * Sweeping a rectangle out of the grid.
 *
 * The squares are inert — `<Paper interactive={false}>` — so a press on one is
 * free to mean "start drawing here". `startRectangleRegion()` is what draws:
 * it binds `pointermove` / `pointerup` on the *document*, not on the paper, so
 * it picks up a press that has already happened and this can be started from
 * inside the `element:pointerdown` handler rather than waiting for a second
 * gesture.
 *
 * Two details that matter:
 *
 * - The band's first sampled point is the first `pointermove`, not the press.
 *   Unioning it with the pressed square's box pins the anchor exactly, however
 *   far the pointer has traveled before the first move arrives.
 * - Its own translucent rectangle is hidden, in `index.css` — the option for it
 *   loses to the library's stylesheet. The painted squares are the feedback,
 *   and they are painted on every move, in the color the rectangle will keep,
 *   so commit changes nothing but the opacity.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { g, type dia } from '@joint/plus';
import { useOnKeyboardEvents, useRegion } from '@joint/react-plus';
import type { PaperEventHandler, PaperEventMap } from '@joint/react-plus';
import { pickColor } from '@/puzzle/colors';
import { validatePlacement, type Placement, type RejectReason } from '@/puzzle/rules';
import type { Puzzle, Rect } from '@/puzzle/types';
import type { GameApi } from '@/game/use-game';
import type { CellData } from './cells';
import { CELL, snapToGrid } from './grid';
import type { PendingRect } from './use-pending-cell';

export interface DrawRegionApi {
    /** The rectangle under the cursor, or `null` when nothing is being drawn. */
    readonly pending: PendingRect | null;
    /** Why the rectangle being dragged cannot be placed, or `null`. */
    readonly rejection: RejectReason | null;
    readonly handlers: Pick<
        PaperEventMap,
        'onElementPointerDown' | 'onElementPointerClick' | 'onElementContextMenu'
    >;
}

interface Evaluated {
    readonly rect: Rect;
    readonly placement: Placement;
}

export function useDrawRegion(puzzle: Puzzle, game: GameApi): DrawRegionApi {
    const { startRectangleRegion } = useRegion();
    const [pending, setPending] = useState<PendingRect | null>(null);
    const [rejection, setRejection] = useState<RejectReason | null>(null);
    /*
     * Set by Escape. The region view offers no way to abort a gesture from the
     * outside — it resolves on pointerup and nothing else — so the drag is
     * abandoned here instead: the preview goes at once, further moves are
     * ignored, and whatever the band finally resolves to is thrown away.
     */
    const canceled = useRef(false);
    const { clues, cols, rows } = puzzle;
    const { regions, place, remove } = game;

    const onElementPointerDown = useCallback<PaperEventHandler<'onElementPointerDown'>>(
        ({ model, event }) => {
            /*
             * A right-press also reaches `element:pointerdown`; leave it to
             * `onElementContextMenu`.
             *
             * `?? 0` because a touch has no button at all: the paper maps
             * `touchstart` to this same handler, and a `TouchEvent` carries no
             * `button` property. Comparing it to 0 directly turned every touch
             * into a right-press and made the demo unusable on a phone.
             */
            if ((event.button ?? 0) !== 0) return;

            // Pressing on a rectangle that is already placed does nothing.
            // Every rectangle drawn from there would overlap it, and a drag
            // that can only ever be refused is worse than no drag.
            const data = model.get('data') as CellData;
            if (data.kind !== 'square') return;

            const anchor = new g.Rect(data.gx * CELL, data.gy * CELL, CELL, CELL);

            // `regions` is read once, at the press: nothing can change the
            // board while a drag is in flight.
            const evaluate = (bbox: g.Rect): Evaluated => {
                const rect = snapToGrid(anchor.union(bbox), cols, rows);
                return { rect, placement: validatePlacement(rect, clues, regions) };
            };
            const show = ({ rect, placement }: Evaluated): void => {
                setPending({ rect, color: placement.ok ? pickColor(rect, regions) : null });
                setRejection(placement.ok ? null : placement.reason);
            };

            let moved = false;
            canceled.current = false;

            void (async() => {
                const band = await startRectangleRegion({
                    // Typed explicitly: the option travels through
                    // `mvc.ViewOptions`, whose index signature widens it away.
                    onChange: (bbox: g.Rect) => {
                        moved = true;
                        if (canceled.current) return;
                        show(evaluate(bbox));
                    },
                });

                setPending(null);
                if (canceled.current) return;

                // No move at all means a click: take the pressed square on its
                // own, which is how a `1` gets placed. A canceled drag (right
                // button, Escape, a lost pointer) resolves to `null` too, but
                // only after at least one move — so `moved` tells them apart.
                const bbox = band ?? (moved ? null : anchor);
                if (!bbox) {
                    setRejection(null);
                    return;
                }

                const { rect, placement } = evaluate(bbox);
                if (placement.ok) place(rect, placement.clueIndex);
                // Cleared either way: the reason is only ever shown next to the
                // rectangle being dragged, and that rectangle is gone.
                setRejection(null);
            })();
        },
        [clues, cols, rows, regions, place, startRectangleRegion]
    );

    /**
     * Takes a rectangle off the board.
     *
     * Rectangles are drawn over the squares, so a press inside one lands on the
     * rectangle itself and its element id names it. On a bare square there is
     * nothing to remove.
     */
    const removeUnder = useCallback(
        (model: dia.Element) => {
            const data = model.get('data') as CellData;
            if (data.kind !== 'region' || data.given) return;
            remove(String(model.id));
            setRejection(null);
        },
        [remove]
    );

    const onElementContextMenu = useCallback<PaperEventHandler<'onElementContextMenu'>>(
        ({ model, event }) => {
            event.preventDefault();
            removeUnder(model);
        },
        [removeUnder]
    );

    /*
     * A plain click removes a rectangle too. Right-click is the natural gesture
     * with a mouse and the only one a phone cannot make, and a rectangle is the
     * one thing on this board a click could mean — pressing one never starts a
     * drag, since every rectangle drawn from inside it would overlap. Undo is a
     * keystroke away if it was not meant.
     *
     * A drag past the paper's `clickThreshold` is not a click, so placing a
     * rectangle never removes the one under where the finger came up.
     */
    const onElementPointerClick = useCallback<PaperEventHandler<'onElementPointerClick'>>(
        ({ model }) => removeUnder(model),
        [removeUnder]
    );

    const cancelDrag = useCallback(() => {
        canceled.current = true;
        setPending(null);
        setRejection(null);
    }, []);

    /*
     * The only shortcut this demo binds itself — undo and redo come from
     * `<Diagram history>`. It lives here rather than beside the toolbar buttons
     * because Escape acts on the drag, and the drag is what this hook owns.
     *
     * `useOnKeyboardEvents` binds to the keyboard the nearest `<Diagram>` owns,
     * the same one those shortcuts use, and ignores keys pressed while focus
     * sits in an `<input>` or `<select>` — so typing a board size cancels
     * nothing.
     */
    useOnKeyboardEvents({ escape: () => cancelDrag() });

    const handlers = useMemo(
        () => ({ onElementPointerDown, onElementPointerClick, onElementContextMenu }),
        [onElementPointerDown, onElementPointerClick, onElementContextMenu]
    );

    return { pending, rejection, handlers };
}
