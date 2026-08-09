import { makeLink, makeNode, NODE_SIZE } from './cells';
import type { FlowCell } from './cells';

/**
 * A generated stress graph: ~750 nodes and ~1250 links, no ports.
 *
 * Bigger than either saved graph and shaped to be harder on the router. Without
 * ports every link attaches to its element's centre — Libavoid routes from the
 * shape's single central pin, free to leave in any direction — so the router
 * has to pick each end's side itself instead of being told. And with more links
 * than nodes, most nodes carry several, which is what puts the nudging
 * behaviour (pushing parallel runs apart) under real load.
 *
 * Generated rather than committed as JSON: the same graph as a saved file would
 * be several megabytes.
 */

const NODE_COUNT = 750;
const LINK_COUNT = 1250;

/** Nodes per row. 750 over 25 columns is 30 rows. */
const COLUMNS = 25;

const COLUMN_PITCH = NODE_SIZE.message.width + 140;
const ROW_PITCH = NODE_SIZE.message.height + 190;

/** How far down the sheet a link may reach. 1 is the next row. */
const MAX_ROW_SPAN = 3;
/** How far sideways a link may reach, in columns. */
const MAX_COLUMN_SPAN = 3;

const WORDS = [
    'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel',
    'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa',
];

/**
 * `mulberry32`. The graph has to be the same on every load — a diagram that
 * reshuffles itself is not something a routing time can be compared across.
 */
function createRandom(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = Math.imul(state ^ (state >>> 15), 1 | state);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const column = (index: number) => index % COLUMNS;
const row = (index: number) => Math.floor(index / COLUMNS);

/** The node at `(row, column)`, or `null` when that cell is off the sheet. */
function indexAt(atRow: number, atColumn: number): number | null {
    if (atColumn < 0 || atColumn >= COLUMNS) return null;
    const index = atRow * COLUMNS + atColumn;
    return index >= 0 && index < NODE_COUNT ? index : null;
}

export function generateGraph(seed = 20250808): readonly FlowCell[] {
    const random = createRandom(seed);
    const pick = (span: number) => Math.floor(random() * (span * 2 + 1)) - span;

    const cells: FlowCell[] = [];

    for (let index = 0; index < NODE_COUNT; index++) {
        cells.push(makeNode({
            id: `n${index}`,
            kind: 'message',
            label: `${WORDS[index % WORDS.length]} ${index}`,
            position: {
                x: column(index) * COLUMN_PITCH,
                y: row(index) * ROW_PITCH,
            },
            // No ports: the link attaches to the node's centre.
        }));
    }

    /*
     * `sourceIndex→targetIndex` pairs already used.
     *
     * Two links between the same pair would be routed as a parallel run and
     * nudged apart, which reads as one thick line rather than as two edges. The
     * generator would produce a few by chance, so they are filtered here.
     */
    const seen = new Set<string>();
    const connect = (sourceIndex: number, targetIndex: number): boolean => {
        if (sourceIndex === targetIndex) return false;
        const key = `${sourceIndex}>${targetIndex}`;
        if (seen.has(key)) return false;
        seen.add(key);
        cells.push(makeLink({
            id: `l${seen.size}`,
            source: { id: `n${sourceIndex}` },
            target: { id: `n${targetIndex}` },
            label: WORDS[seen.size % WORDS.length],
            labelPosition: 0.25,
        }));
        return true;
    };

    // The spine: every node below the first row is reached from one above it,
    // so the graph is connected and reads as a flow rather than as a mesh.
    for (let index = COLUMNS; index < NODE_COUNT; index++) {
        const parent = indexAt(row(index) - 1, column(index) + pick(1));
        connect(parent ?? index - COLUMNS, index);
    }

    // The rest: shortcuts that skip a row or cut across columns. These are what
    // the router has to work for — they cross the spine and each other.
    let attempts = 0;
    while (seen.size < LINK_COUNT && attempts < LINK_COUNT * 20) {
        attempts++;
        const sourceIndex = Math.floor(random() * NODE_COUNT);
        const targetRow = row(sourceIndex) + 1 + Math.floor(random() * MAX_ROW_SPAN);
        const target = indexAt(targetRow, column(sourceIndex) + pick(MAX_COLUMN_SPAN));
        if (target === null) continue;
        connect(sourceIndex, target);
    }

    return cells;
}
