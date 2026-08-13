/**
 * A deterministic generator of the example diagram description.
 *
 * The description knows nothing about JointJS nor ELK. The `layout.ts` module
 * turns it into JointJS cells once (`createCells()`) and into an ELK graph on
 * every layout (`createElkGraph()`, with the collapsed clusters pruned).
 */

export interface LeafSpec {
    id: string;
    label: string;
}

export interface ClusterSpec {
    id: string;
    label: string;
    children: NodeSpec[];
    /** Links between the direct children of this cluster. */
    edges: EdgeSpec[];
}

export type NodeSpec = LeafSpec | ClusterSpec;

export interface EdgeSpec {
    id: string;
    source: string;
    target: string;
}

export function isClusterSpec(node: NodeSpec): node is ClusterSpec {
    return 'children' in node;
}

const SEED = 20250813;
/** The number of the top-level clusters. */
const CLUSTER_COUNT = 12;
/** The number of the nested clusters per top-level cluster. */
const SUB_CLUSTER_COUNT: [number, number] = [2, 4];
/** The number of leaf nodes placed directly in a top-level cluster. */
const CLUSTER_LEAF_COUNT: [number, number] = [2, 5];
/** The number of leaf nodes of a nested cluster. */
const SUB_CLUSTER_LEAF_COUNT: [number, number] = [6, 14];
/** How many links are added on top of the ones connecting all the siblings. */
const EXTRA_EDGE_RATIO = 0.4;

const CLUSTER_NAMES = [
    'Ingress', 'Identity', 'Billing', 'Catalog', 'Search', 'Media',
    'Analytics', 'Messaging', 'Payments', 'Fulfilment', 'Support', 'Platform',
    'Telemetry', 'Reporting', 'Provisioning', 'Compliance'
];

const GROUP_NAMES = [
    'core', 'edge', 'batch', 'read path', 'write path', 'pipeline', 'control'
];

const LEAF_NAMES = [
    'api', 'worker', 'cache', 'store', 'queue', 'router', 'indexer',
    'scheduler', 'gateway', 'proxy', 'stream', 'sync', 'audit', 'mapper',
    'shard', 'bridge'
];

/**
 * Create the example diagram description: an array of the top-level clusters.
 */
export function createDiagram(): ClusterSpec[] {
    const random = createRandom(SEED);
    const clusters: ClusterSpec[] = [];
    for (let i = 0; i < CLUSTER_COUNT; i++) {
        clusters.push(createCluster(`c${i}`, pickName(CLUSTER_NAMES, i), 0, random));
    }
    return clusters;
}

type Random = () => number;

function createCluster(
    id: string,
    label: string,
    depth: number,
    random: Random
): ClusterSpec {
    const children: NodeSpec[] = [];
    const isTopLevel = depth === 0;

    if (isTopLevel) {
        const count = randomInt(random, SUB_CLUSTER_COUNT);
        // Every nested cluster of a single cluster gets a different name.
        const groupNames = shuffle(GROUP_NAMES, random);
        for (let i = 0; i < count; i++) {
            children.push(createCluster(
                `${id}-g${i}`,
                `${label} ${pickName(groupNames, i)}`,
                depth + 1,
                random
            ));
        }
    }

    const leafCount = randomInt(random, isTopLevel ? CLUSTER_LEAF_COUNT : SUB_CLUSTER_LEAF_COUNT);
    for (let i = 0; i < leafCount; i++) {
        const name = LEAF_NAMES[randomInt(random, [0, LEAF_NAMES.length - 1])];
        children.push({
            id: `${id}-n${i}`,
            label: `${name}-${`${i + 1}`.padStart(2, '0')}`
        });
    }

    return { id, label, children, edges: createEdges(id, children, random) };
}

/**
 * Connect the siblings of a single cluster. Every child (but the first one) is
 * connected to an earlier sibling, so that no child is left out, then a few
 * more links are added at random. Links never cross the cluster boundary.
 */
function createEdges(clusterId: string, children: NodeSpec[], random: Random): EdgeSpec[] {
    const edges: EdgeSpec[] = [];
    const keys = new Set<string>();

    const addEdge = (sourceIndex: number, targetIndex: number): void => {
        const source = children[sourceIndex].id;
        const target = children[targetIndex].id;
        const key = `${source}|${target}`;
        if (source === target || keys.has(key)) return;
        keys.add(key);
        edges.push({ id: `${clusterId}-e${edges.length}`, source, target });
    };

    for (let i = 1; i < children.length; i++) {
        addEdge(randomInt(random, [0, i - 1]), i);
    }

    const extraCount = Math.round(children.length * EXTRA_EDGE_RATIO);
    for (let i = 0; i < extraCount; i++) {
        const targetIndex = randomInt(random, [1, Math.max(1, children.length - 1)]);
        addEdge(randomInt(random, [0, targetIndex - 1]), targetIndex);
    }

    return edges;
}

function shuffle(items: string[], random: Random): string[] {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = randomInt(random, [0, i]);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function pickName(names: string[], index: number): string {
    const name = names[index % names.length];
    const round = Math.floor(index / names.length);
    return round === 0 ? name : `${name} ${round + 1}`;
}

function randomInt(random: Random, [min, max]: [number, number]): number {
    return min + Math.floor(random() * (max - min + 1));
}

/** A linear congruential generator - the same diagram on every run. */
function createRandom(seed: number): Random {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}
