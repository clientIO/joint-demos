/**
 * A seeded pseudo-random generator, so a board is a pure function of its seed
 * and the toolbar can show a seed the player can come back to.
 *
 * mulberry32: 32-bit state, one multiply-shift round per number. Not
 * cryptographic, but it has a long period and a good spread, which is all a
 * puzzle generator asks of it.
 */
export interface Rng {
    /** A float in `[0, 1)`. */
    next(): number;
    /** An integer in `[0, max)`. */
    int(max: number): number;
    /** Fisher-Yates, in place, returning the same array. */
    shuffle<T>(items: T[]): T[];
    /** Index into `weights`, chosen with probability proportional to the weight. */
    weighted(weights: readonly number[]): number;
}

export function mulberry32(seed: number): Rng {
    let state = seed >>> 0;
    const next = (): number => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const int = (max: number): number => Math.floor(next() * max);
    return {
        next,
        int,
        shuffle(items) {
            for (let i = items.length - 1; i > 0; i--) {
                const j = int(i + 1);
                [items[i], items[j]] = [items[j], items[i]];
            }
            return items;
        },
        weighted(weights) {
            let total = 0;
            for (const weight of weights) total += weight;
            let ticket = next() * total;
            for (let i = 0; i < weights.length; i++) {
                ticket -= weights[i];
                if (ticket < 0) return i;
            }
            return weights.length - 1;
        },
    };
}

/** A fresh seed for a new board. */
export function randomSeed(): number {
    return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
