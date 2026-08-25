// Canonical z paint order (bottom -> top) — the SINGLE source of truth for both the
// seed cells (schema-cells) and the runtime normalizer (use-z-order), and for the
// default link the canvas mints. Bottom to top: NOTES, then group CONTAINERS, then
// relation LINKS, then table nodes on top. So a group never covers a table or a
// link, links paint above the group panels but below the cards they connect, and
// notes sit behind everything. joint's embed() only needs child z > parent z, which
// Z_TABLE > Z_GROUP satisfies, so these never fight embedding.
export const Z_NOTE = 0;
export const Z_GROUP = 3;
// A SELECTED group lifts above the other group containers (so it's never buried when
// two groups overlap) but stays BELOW links + tables — you still see the wires and
// cards. Set by group-element on selection; use-z-order leaves this value alone.
export const Z_GROUP_SELECTED = 5;
export const Z_LINK = 6;
export const Z_TABLE = 10;
