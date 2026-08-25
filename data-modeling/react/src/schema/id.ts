// Tiny prefixed-id generator. WHY a counter, not Math.random: a monotonic
// counter is collision-free by construction and deterministic-friendly — a
// fresh factory replays the same id sequence, which keeps tests and imports
// reproducible. Base-36 keeps ids short (e.g. `col_1`, `tbl_z`, `tbl_10`).

// Create an independent id source. `seed` sets the starting counter so tests
// can pin a known sequence; each call increments before formatting.
export function createIdFactory(seed = 0): (prefix: string) => string {
    let n = seed;
    return (prefix) => `${prefix}_${(n += 1).toString(36)}`;
}

// Default app-wide source. Import `createIdFactory` instead when you need an
// isolated, resettable sequence (e.g. deterministic tests or bulk import).
export const newId: (prefix: string) => string = createIdFactory();
