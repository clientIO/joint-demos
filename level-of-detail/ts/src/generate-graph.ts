import type { dia } from '@joint/plus';
import { Link, NODE_SIZE, Service } from './shapes';
import type { ServiceData } from './shapes';
import type { ServiceStatus } from './theme';

/**
 * A generated service map: 1,200 elements and ~1,600 links.
 *
 * The same map as the React version of this demo, from the same seed - so the
 * two can be compared side by side. Generated rather than committed as JSON:
 * the same graph as a saved file would be several megabytes.
 *
 * The size is picked so that the interesting thing is unavoidable: at 100% zoom
 * a screenful is a dozen cards, and framing the whole map puts every one of the
 * 1,200 elements in the viewport at once. Virtual rendering cannot help there -
 * everything really is on screen - so what an element costs to draw is the only
 * thing left to change.
 */

const NODE_COUNT = 1200;
const LINK_COUNT = 1600;

/** Elements per row. 1,200 over 30 columns is 40 rows. */
const COLUMNS = 30;

const COLUMN_PITCH = NODE_SIZE.width + 110;
const ROW_PITCH = NODE_SIZE.height + 120;

/** How far down the map a link may reach. 1 is the next row. */
const MAX_ROW_SPAN = 3;
/** How far sideways a link may reach, in columns. */
const MAX_COLUMN_SPAN = 3;

const SERVICE_NAMES = [
    'auth', 'billing', 'cart', 'catalog', 'checkout', 'delivery', 'events',
    'fraud', 'gateway', 'identity', 'inventory', 'invoices', 'ledger', 'mailer',
    'notifier', 'orders', 'payments', 'pricing', 'profiles', 'quotas', 'ratings',
    'refunds', 'search', 'sessions', 'shipping', 'stock', 'tax', 'uploads'
];

const GROUPS = ['Commerce', 'Platform', 'Payments', 'Growth', 'Data', 'Identity'];
const REGIONS = ['eu-west-1', 'eu-central-1', 'us-east-1', 'us-west-2', 'ap-south-1'];

/**
 * `mulberry32`. The map has to be the same on every load: a diagram that
 * reshuffles itself is not something a frame rate can be compared across.
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

/** The element at `(row, column)`, or `null` when that slot is off the map. */
function indexAt(atRow: number, atColumn: number): number | null {
    if (atColumn < 0 || atColumn >= COLUMNS) return null;
    const index = atRow * COLUMNS + atColumn;
    return index >= 0 && index < NODE_COUNT ? index : null;
}

/**
 * Mostly healthy, with enough trouble scattered about to be worth finding.
 *
 * The proportion is the reason the lowest level of detail is useful rather than
 * merely cheap: roughly one service in eight is off, so zoomed out the map is a
 * pale field with a few dozen warm blocks in it, and those are exactly what you
 * would be zooming out to look for.
 */
function pickStatus(random: () => number): ServiceStatus {
    const roll = random();
    if (roll > 0.94) return 'down';
    if (roll > 0.86) return 'degraded';
    return 'healthy';
}

function makeData(index: number, random: () => number): ServiceData {
    const status = pickStatus(random);
    return {
        name: `${SERVICE_NAMES[index % SERVICE_NAMES.length]}-${String(index).padStart(4, '0')}`,
        group: GROUPS[Math.floor(random() * GROUPS.length)],
        region: REGIONS[Math.floor(random() * REGIONS.length)],
        // A struggling service is a slow one - the card's numbers and its pill
        // should tell the same story.
        latencyMs: Math.round(12 + random() * (status === 'healthy' ? 90 : 700)),
        load: status === 'healthy' ? 0.15 + random() * 0.5 : 0.6 + random() * 0.4,
        status
    };
}

export function generateCells(seed = 20260915): dia.Cell[] {
    const random = createRandom(seed);
    const pick = (span: number) => Math.floor(random() * (span * 2 + 1)) - span;

    const cells: dia.Cell[] = [];

    for (let index = 0; index < NODE_COUNT; index++) {
        cells.push(new Service({
            id: `n${index}`,
            position: {
                x: column(index) * COLUMN_PITCH,
                y: row(index) * ROW_PITCH
            },
            data: makeData(index, random)
        }));
    }

    /*
     * `sourceIndex>targetIndex` pairs already used. Two links between the same
     * pair would be drawn on top of each other and read as one thicker line.
     */
    const seen = new Set<string>();
    const connect = (sourceIndex: number, targetIndex: number): void => {
        if (sourceIndex === targetIndex) return;
        const key = `${sourceIndex}>${targetIndex}`;
        if (seen.has(key)) return;
        seen.add(key);
        cells.push(new Link({
            id: `l${seen.size}`,
            source: { id: `n${sourceIndex}` },
            target: { id: `n${targetIndex}` }
        }));
    };

    // The spine: every element below the first row is reached from one above
    // it, so the map is connected and reads as a flow rather than as a mesh.
    for (let index = COLUMNS; index < NODE_COUNT; index++) {
        const parent = indexAt(row(index) - 1, column(index) + pick(1));
        connect(parent ?? index - COLUMNS, index);
    }

    // The rest: calls that skip a row or cut across columns.
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
