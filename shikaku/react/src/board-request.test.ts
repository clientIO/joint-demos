import { describe, expect, it } from 'vitest';
import {
    boardUrl,
    DEFAULT_COLS,
    DEFAULT_DIFFICULTY,
    DEFAULT_ROWS,
    resolveBoardRequest,
} from './board-request';
import { MAX_SIDE, MIN_SIDE } from './puzzle/board-size';

const seed = () => 42;

describe('resolveBoardRequest', () => {
    it('falls back to the default board', () => {
        expect(resolveBoardRequest({ fallbackSeed: seed })).toEqual({
            cols: DEFAULT_COLS,
            rows: DEFAULT_ROWS,
            difficulty: DEFAULT_DIFFICULTY,
            seed: 42,
            clock: true,
        });
    });

    it('reads a board out of a query string', () => {
        expect(
            resolveBoardRequest({ search: '?seed=1234&width=12&height=8&difficulty=hard' })
        ).toEqual({ cols: 12, rows: 8, difficulty: 'hard', seed: 1234, clock: true });
    });

    it('accepts cols / rows as aliases', () => {
        expect(resolveBoardRequest({ search: '?cols=7&rows=9', fallbackSeed: seed })).toMatchObject({
            cols: 7,
            rows: 9,
        });
    });

    it('reads a board out of the environment', () => {
        expect(
            resolveBoardRequest({
                env: { VITE_SEED: '7', VITE_WIDTH: '15', VITE_HEIGHT: '15', VITE_DIFFICULTY: 'easy' },
            })
        ).toEqual({ cols: 15, rows: 15, difficulty: 'easy', seed: 7, clock: true });
    });

    it('lets the query string win over the environment', () => {
        expect(
            resolveBoardRequest({ search: '?seed=1', env: { VITE_SEED: '2', VITE_WIDTH: '20' }})
        ).toMatchObject({ seed: 1, cols: 20 });
    });

    it('holds a named size to the same limits as the inputs', () => {
        expect(resolveBoardRequest({ search: '?width=1&height=99', fallbackSeed: seed })).toMatchObject({
            cols: MIN_SIDE,
            rows: MAX_SIDE,
        });
        expect(resolveBoardRequest({ search: '?width=8.6', fallbackSeed: seed })).toMatchObject({
            cols: 9,
        });
    });

    it('ignores values it cannot use', () => {
        expect(
            resolveBoardRequest({ search: '?seed=&width=wide&difficulty=fiendish', fallbackSeed: seed })
        ).toEqual({
            cols: DEFAULT_COLS,
            rows: DEFAULT_ROWS,
            difficulty: DEFAULT_DIFFICULTY,
            seed: 42,
            clock: true,
        });
    });

    it('turns the clock off on request, however it is spelled', () => {
        for (const value of ['off', 'no', 'false', '0', 'OFF']) {
            expect(
                resolveBoardRequest({ search: `?clock=${value}`, fallbackSeed: seed }).clock
            ).toBe(false);
        }
        expect(resolveBoardRequest({ search: '?clock=on', fallbackSeed: seed }).clock).toBe(true);
        expect(resolveBoardRequest({ env: { VITE_CLOCK: 'off' }, fallbackSeed: seed }).clock).toBe(
            false
        );
    });

    it('normalizes a seed to 32 bits unsigned, as the generator does', () => {
        expect(resolveBoardRequest({ search: '?seed=-1' })).toMatchObject({ seed: 4294967295 });
    });

    it('is case-insensitive about difficulty', () => {
        expect(resolveBoardRequest({ search: '?difficulty=HARD', fallbackSeed: seed })).toMatchObject({
            difficulty: 'hard',
        });
    });
});

describe('boardUrl', () => {
    const board = { cols: 12, rows: 8, difficulty: 'hard' as const, seed: 1234 };

    it('writes everything resolveBoardRequest reads', () => {
        const url = boardUrl(board, 'https://example.com/shikaku/');
        expect(url).toBe(
            'https://example.com/shikaku/?seed=1234&width=12&height=8&difficulty=hard'
        );
        expect(resolveBoardRequest({ search: new URL(url).search })).toMatchObject(board);
    });

    it('drops whatever opened the page', () => {
        const url = boardUrl(board, 'https://example.com/?seed=9&clock=off&unrelated=1');
        expect(new URL(url).searchParams.get('seed')).toBe('1234');
        expect(new URL(url).searchParams.has('clock')).toBe(false);
        expect(new URL(url).searchParams.has('unrelated')).toBe(false);
    });

    it('round-trips a board through a link', () => {
        const reopened = resolveBoardRequest({
            search: new URL(boardUrl(board, 'https://example.com/')).search,
        });
        expect(boardUrl(reopened, 'https://example.com/')).toBe(
            boardUrl(board, 'https://example.com/')
        );
    });
});
