/**
 * The rules the board enforces while the player draws.
 *
 * Placement is strict: a rectangle is committed only when it is legal, so the
 * board can never hold a wrong rectangle and "solved" is simply "every cell
 * covered".
 */
import { coversOnlyClue } from './candidates';
import { rectContains, rectsOverlap, type Clue, type Rect, type Region } from './types';

/** Why a swept-out rectangle cannot be placed. */
export type RejectReason = 'overlap' | 'no-clue' | 'many-clues' | 'wrong-area';

export type Placement =
    | { readonly ok: true; readonly clueIndex: number }
    | { readonly ok: false; readonly reason: RejectReason };

/** Indices of every clue inside `rect`. */
export function cluesInside(rect: Rect, clues: readonly Clue[]): number[] {
    const found: number[] = [];
    for (let i = 0; i < clues.length; i++) {
        if (rectContains(rect, clues[i].x, clues[i].y)) found.push(i);
    }
    return found;
}

/**
 * Whether `rect` may be placed on a board that already holds `regions`.
 *
 * The three failures a player can produce, in the order they are worth
 * reporting: the rectangle runs into one already on the board; it holds no
 * number, or more than one; its area does not match the number it holds.
 */
export function validatePlacement(
    rect: Rect,
    clues: readonly Clue[],
    regions: readonly Region[]
): Placement {
    for (const region of regions) {
        if (rectsOverlap(rect, region.rect)) return { ok: false, reason: 'overlap' };
    }
    const inside = cluesInside(rect, clues);
    if (inside.length === 0) return { ok: false, reason: 'no-clue' };
    if (inside.length > 1) return { ok: false, reason: 'many-clues' };

    const clueIndex = inside[0];
    if (rect.w * rect.h !== clues[clueIndex].value) return { ok: false, reason: 'wrong-area' };
    // Belt and braces: `coversOnlyClue` is the same rule `cluesInside` just
    // checked, and it is what the generator's candidates were filtered by.
    if (!coversOnlyClue(rect, clueIndex, clues)) return { ok: false, reason: 'many-clues' };
    return { ok: true, clueIndex };
}

/** How many cells the placed regions cover between them. */
export function coveredCells(regions: readonly Region[]): number {
    return regions.reduce((total, region) => total + region.rect.w * region.rect.h, 0);
}

/** Human-readable reason, for the toolbar's status line. */
export const REJECT_MESSAGES: Record<RejectReason, string> = {
    overlap: 'Overlaps a rectangle already on the board',
    'no-clue': 'A rectangle has to contain a number',
    'many-clues': 'A rectangle can contain only one number',
    'wrong-area': 'The area has to match the number',
};
