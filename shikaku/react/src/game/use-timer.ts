/**
 * How long this board has been open.
 *
 * Starts with the board and stops when it is solved. There is no reset: a new
 * puzzle remounts the whole game, and the clock starts again with it.
 *
 * Wall clock, deliberately — it keeps counting while the tab is in the
 * background, which is what a player would expect of the time a puzzle took.
 */
import { useEffect, useRef, useState } from 'react';

/** Often enough that the seconds never look stuck, cheap enough not to matter. */
const TICK_MS = 200;

/**
 * @param running - `false` freezes the clock, and stamps the final elapsed time
 *   as it stops rather than leaving it wherever the last tick landed.
 * @returns milliseconds since the board appeared.
 */
export function useTimer(running: boolean): number {
    // Stamped in the effect, not at the `useRef` call: reading the clock during
    // render is impure, and the difference is a frame.
    const startedAt = useRef<number | null>(null);
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        startedAt.current ??= performance.now();
        const from = startedAt.current;
        const read = () => setElapsed(performance.now() - from);
        // Stopping runs this once more, so the time shown is the time at the
        // moment it stopped and not up to a tick short of it.
        read();
        if (!running) return;
        const timer = setInterval(read, TICK_MS);
        return () => clearInterval(timer);
    }, [running]);

    return elapsed;
}

/** `m:ss`, or `h:mm:ss` once a board has taken that long. */
export function formatDuration(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const seconds = total % 60;
    const minutes = Math.floor(total / 60) % 60;
    const hours = Math.floor(total / 3600);
    const pad = (value: number) => String(value).padStart(2, '0');
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
