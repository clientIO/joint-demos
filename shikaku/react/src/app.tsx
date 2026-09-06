import { useCallback, useMemo, useState } from 'react';
import { resolveBoardRequest } from '@/board-request';
import { ShikakuGame } from '@/game/game';
import { generatePuzzle } from '@/puzzle/generate';
import { randomSeed } from '@/puzzle/rng';
import type { Settings } from '@/toolbar/toolbar';

/*
 * The first board can be named, by query string or by environment — see
 * `board-request.ts`. Read once, as the initial state: after that the toolbar
 * owns the settings and every new puzzle draws a fresh seed.
 */
const INITIAL = resolveBoardRequest({
    search: window.location.search,
    env: import.meta.env,
});

/** The settings a board was generated from, plus its seed. */
type Request = Settings & { readonly seed: number };

export function App() {
    const [settings, setSettings] = useState<Settings>(INITIAL);
    const [request, setRequest] = useState<Request>(INITIAL);

    /*
     * Generation is synchronous. It is a partition plus up to a dozen
     * uniqueness checks — milliseconds on the sizes the toolbar allows — and
     * running it in the render keeps the board a plain function of the request,
     * with no loading state to thread through the tree.
     */
    const puzzle = useMemo(() => generatePuzzle(request), [request]);

    /*
     * Takes the settings to use, because the dialog changes them and generates
     * in one press: passing them in avoids reading a `settings` state that has
     * not been committed yet.
     */
    const onNewPuzzle = useCallback(
        (next: Settings = settings) => {
            setSettings(next);
            setRequest({ ...next, seed: randomSeed() });
        },
        [settings]
    );

    return (
        <div className="app">
            {/*
              * Keyed on the board: a new puzzle is a new element set, a new
              * graph, and an empty game. Remounting says all of that at once.
              */}
            <ShikakuGame
                key={`${puzzle.seed}:${puzzle.cols}x${puzzle.rows}`}
                puzzle={puzzle}
                clock={INITIAL.clock}
                settings={settings}
                onNewPuzzle={onNewPuzzle}
            />
        </div>
    );
}
