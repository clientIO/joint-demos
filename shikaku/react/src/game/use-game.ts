/**
 * The player's side of a board: which rectangles are on it.
 *
 * The rectangles *are* graph elements — there is no second copy in React state.
 * That is what lets undo and redo be the library's: `<Diagram history>` records
 * the adds and removes on a `dia.CommandManager`, `useGraphHistory` drives it,
 * and `interactions.commandManager` binds Ctrl/Cmd + Z and Shift + Ctrl/Cmd + Z
 * without this demo writing a keystroke of its own.
 *
 * The alternative — an array of rectangles in React with the elements derived
 * from it — cannot use that history at all: a CommandManager undo puts the
 * element back on the graph while React still holds the old array, and the next
 * sync writes it straight back out.
 *
 * Placement is strict, so what is on the graph is always a legal board.
 */
import { useCallback, useMemo } from 'react';
import { useCells, useGraph, useGraphHistory, useGraphHistoryStack } from '@joint/react-plus';
import { buildRegionCell, isRegionData, regionId, type BoardElement } from '@/canvas/cells';
import { pickColor } from '@/puzzle/colors';
import { coveredCells } from '@/puzzle/rules';
import type { Puzzle, Rect, Region } from '@/puzzle/types';

export interface GameApi {
    /** Every rectangle on the board, the given ones included. */
    readonly regions: readonly Region[];
    /** Only the ones the player placed. */
    readonly placed: readonly Region[];
    /** Add a rectangle that has already been validated. */
    readonly place: (rect: Rect, clueIndex: number) => void;
    /** Drop a rectangle by id — which is its element id. */
    readonly remove: (regionId: string) => void;
    readonly undo: () => void;
    readonly redo: () => void;
    readonly clear: () => void;
    readonly canUndo: boolean;
    readonly canRedo: boolean;
    /** Squares covered by the placed rectangles. */
    readonly covered: number;
    /** Squares on the board. */
    readonly total: number;
    readonly solved: boolean;
}

/**
 * The placed rectangles, read off the graph.
 *
 * The rectangle being dragged is an element too, but it is not a placement —
 * `pending` is what tells them apart.
 */
function selectRegions(cells: readonly { id?: unknown; data?: unknown }[]): readonly Region[] {
    const regions: Region[] = [];
    for (const cell of cells) {
        const data = cell.data as BoardElement['data'] | undefined;
        if (!isRegionData(data) || data.pending || data.clueIndex === null) continue;
        regions.push({
            id: String(cell.id),
            rect: data.rect,
            clueIndex: data.clueIndex,
            color: data.color,
            given: data.given,
        });
    }
    return regions;
}

/**
 * Keeps the array identity stable while the board has not changed.
 *
 * `selectRegions` builds fresh objects on every commit, and the selector runs
 * on every graph change — including each move of the rectangle being dragged.
 * Without this the array would be new sixty times a second and everything
 * downstream of it would re-run.
 */
function sameRegions(a: readonly Region[], b: readonly Region[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((region, index) => {
        const other = b[index];
        return (
            region.id === other.id &&
            region.color === other.color &&
            region.given === other.given &&
            region.clueIndex === other.clueIndex &&
            region.rect.w === other.rect.w &&
            region.rect.h === other.rect.h
        );
    });
}

export function useGame(puzzle: Puzzle): GameApi {
    const { setCell, removeCells, transaction } = useGraph<BoardElement>();
    const { undo, redo } = useGraphHistory();
    const { canUndo, canRedo } = useGraphHistoryStack();
    const regions = useCells(selectRegions, sameRegions);

    const place = useCallback(
        (rect: Rect, clueIndex: number) => {
            const clue = puzzle.clues[clueIndex];
            setCell(
                buildRegionCell({
                    id: regionId(rect),
                    rect,
                    clueIndex,
                    color: pickColor(rect, regions),
                    pending: false,
                    clue: { value: clue.value, x: clue.x, y: clue.y },
                })
            );
        },
        [puzzle, regions, setCell]
    );

    /** What the player has placed — the board's own 1s are not theirs to move. */
    const placed = useMemo(() => regions.filter((region) => !region.given), [regions]);

    const remove = useCallback(
        (id: string) => {
            removeCells([id]);
        },
        [removeCells]
    );

    const clear = useCallback(() => {
        if (placed.length === 0) return;
        // One transaction, so clearing a full board is one press of undo away.
        transaction(() => removeCells(placed.map((region) => region.id)));
    }, [placed, removeCells, transaction]);

    const covered = useMemo(() => coveredCells(regions), [regions]);
    const total = puzzle.cols * puzzle.rows;

    return {
        regions,
        place,
        remove,
        undo,
        redo,
        clear,
        placed,
        canUndo,
        canRedo,
        covered,
        total,
        solved: covered === total,
    };
}
