/**
 * Which board to open with.
 *
 * A board is a pure function of its size, difficulty and seed, so naming those
 * is enough to reproduce one exactly. Both a query string and the environment
 * can do it:
 *
 * ```sh
 * # From the CLI, for the whole session:
 * VITE_SEED=1234 VITE_WIDTH=12 VITE_HEIGHT=8 VITE_DIFFICULTY=hard npm run dev
 *
 * # Per page load, which is what an end-to-end test wants:
 * open 'http://localhost:5173/?seed=1234&width=12&height=8&difficulty=hard'
 * ```
 *
 * The query string wins over the environment, and anything not named falls back
 * to the defaults — so `?seed=1234` alone opens the default 10x10 medium board
 * at that seed. Without a seed anywhere, a random one is drawn, which is the
 * ordinary case.
 *
 * `ones=off` leaves the 1s as numbers for the player to draw, rather than
 * starting with them filled in.
 *
 * `clock=off` stops the timer before it starts. Naming a board makes everything
 * on screen reproducible except the clock, which would tick on regardless — so
 * this is what makes a screenshot of the demo comparable with the one taken
 * yesterday. It is a switch for the tooling, not a feature of the game.
 */
import { clampSide } from '@/puzzle/board-size';
import { randomSeed } from '@/puzzle/rng';
import type { Difficulty } from '@/puzzle/types';

export interface BoardRequest {
    readonly cols: number;
    readonly rows: number;
    readonly difficulty: Difficulty;
    readonly seed: number;
    /** `false` freezes the timer at zero. See `clock=off`. */
    readonly clock: boolean;
    /** `false` leaves the 1s as numbers to be drawn. See `ones=off`. */
    readonly fillOnes: boolean;
}

export const DEFAULT_COLS = 10;
export const DEFAULT_ROWS = 10;
export const DEFAULT_DIFFICULTY: Difficulty = 'medium';

const DIFFICULTIES: readonly string[] = ['easy', 'medium', 'hard'];

/** Everything anyone might reasonably write to mean "no". */
const OFF: readonly string[] = ['off', 'no', 'false', '0'];

/** Reads a source of named values — a query string, or `import.meta.env`. */
type Read = (name: string) => string | undefined;

function readNumber(read: Read, ...names: readonly string[]): number | null {
    for (const name of names) {
        const raw = read(name);
        if (raw === undefined || raw.trim() === '') continue;
        const value = Number(raw);
        if (Number.isFinite(value)) return value;
    }
    return null;
}

function readOff(read: Read, ...names: readonly string[]): boolean | null {
    for (const name of names) {
        const raw = read(name)?.trim().toLowerCase();
        if (raw !== undefined && raw !== '') return !OFF.includes(raw);
    }
    return null;
}

function readDifficulty(read: Read, ...names: readonly string[]): Difficulty | null {
    for (const name of names) {
        const raw = read(name)?.trim().toLowerCase();
        if (raw && DIFFICULTIES.includes(raw)) return raw as Difficulty;
    }
    return null;
}

/**
 * A link that reopens this board.
 *
 * The reverse of {@link resolveBoardRequest}: everything it reads, this writes.
 * The clock is left out — a shared board should be timed by whoever opens it —
 * and so is anything the player has placed. What is shared is the puzzle.
 */
export function boardUrl(
    board: Pick<BoardRequest, 'cols' | 'rows' | 'difficulty' | 'seed' | 'fillOnes'>,
    base: string
): string {
    const url = new URL(base);
    // Replaced wholesale rather than merged: whatever opened this page should
    // not ride along into the link.
    url.search = '';
    url.searchParams.set('seed', String(board.seed));
    url.searchParams.set('width', String(board.cols));
    url.searchParams.set('height', String(board.rows));
    url.searchParams.set('difficulty', board.difficulty);
    // Only when it differs from the default, so an ordinary link stays short.
    if (!board.fillOnes) url.searchParams.set('ones', 'off');
    return url.toString();
}

export interface ResolveOptions {
    /** `location.search`, or any query string. */
    readonly search?: string;
    /** `import.meta.env`, or any map of environment values. */
    readonly env?: Record<string, string | undefined>;
    /** Used when no seed is named. Defaults to a random one. */
    readonly fallbackSeed?: () => number;
}

/**
 * The board to open with, from the query string, then the environment, then the
 * defaults.
 */
export function resolveBoardRequest({
    search = '',
    env = {},
    fallbackSeed = randomSeed,
}: ResolveOptions = {}): BoardRequest {
    const params = new URLSearchParams(search);
    const query: Read = (name) => params.get(name) ?? undefined;
    const environment: Read = (name) => env[name];

    const cols =
        readNumber(query, 'width', 'cols') ?? readNumber(environment, 'VITE_WIDTH', 'VITE_COLS');
    const rows =
        readNumber(query, 'height', 'rows') ?? readNumber(environment, 'VITE_HEIGHT', 'VITE_ROWS');
    const difficulty =
        readDifficulty(query, 'difficulty') ?? readDifficulty(environment, 'VITE_DIFFICULTY');
    const seed = readNumber(query, 'seed') ?? readNumber(environment, 'VITE_SEED');
    const clock = readOff(query, 'clock') ?? readOff(environment, 'VITE_CLOCK');
    const fillOnes = readOff(query, 'ones') ?? readOff(environment, 'VITE_ONES');

    return {
        cols: cols === null ? DEFAULT_COLS : clampSide(cols),
        rows: rows === null ? DEFAULT_ROWS : clampSide(rows),
        difficulty: difficulty ?? DEFAULT_DIFFICULTY,
        // `>>> 0` for the same reason the generator does it: the seed is a
        // 32-bit unsigned value, and a negative or fractional one would still
        // produce a board, just not the one the caller named.
        seed: seed === null ? fallbackSeed() : seed >>> 0,
        clock: clock ?? true,
        fillOnes: fillOnes ?? true,
    };
}
