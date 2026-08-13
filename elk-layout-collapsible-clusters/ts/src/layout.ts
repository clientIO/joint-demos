import ELK from 'elkjs/lib/elk-api.js';
// Vite bundles the ELK worker and serves it from its own URL.
import ElkWorker from 'elkjs/lib/elk-worker.js?worker';

import type { dia } from '@joint/plus';

import type { ElkNode, ElkExtendedEdge, ElkPoint, LayoutOptions } from 'elkjs/lib/elk-api.d.ts';
import { isClusterSpec, type ClusterSpec, type NodeSpec } from './dataset';
import { Cluster, Edge, Leaf, CLUSTER_PADDING, COLLAPSED_SIZE, HEADER_HEIGHT, LEAF_SIZE } from './shapes';

const elk = new ELK({ workerFactory: () => new ElkWorker() });

const ROOT_LAYOUT_OPTIONS: LayoutOptions = {
    /**
     * There are no links between the top-level clusters, so they are packed
     * into a compact area instead of being placed in a single row.
     */
    'elk.algorithm': 'rectpacking',
    'elk.aspectRatio': '1.6',
    'elk.spacing.nodeNode': '60',
    /**
     * No link crosses a cluster boundary in this example, so every cluster can
     * be laid out on its own.
     */
    'elk.hierarchyHandling': 'SEPARATE_CHILDREN'
};

const CLUSTER_LAYOUT_OPTIONS: LayoutOptions = {
    'elk.algorithm': 'layered',
    'elk.direction': 'RIGHT',
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.spacing.nodeNode': '24',
    'elk.spacing.edgeNode': '16',
    'elk.layered.spacing.nodeNodeBetweenLayers': '48',
    /** Reserve the space of the cluster header. */
    'elk.padding': `[top=${HEADER_HEIGHT + CLUSTER_PADDING},left=${CLUSTER_PADDING},bottom=${CLUSTER_PADDING},right=${CLUSTER_PADDING}]`
};

/**
 * Create the JointJS cells of the whole diagram (including the content of the
 * clusters which are collapsed later on). The cells are created once - the
 * collapsing and the layout only change their geometry and visibility.
 */
export function createCells(clusters: ClusterSpec[]): dia.Cell[] {
    const cells: dia.Cell[] = [];
    clusters.forEach((cluster) => addCells(cluster, 0, cells));
    return cells;
}

function addCells(node: NodeSpec, depth: number, cells: dia.Cell[]): void {
    if (!isClusterSpec(node)) {
        cells.push(new Leaf({
            id: node.id,
            z: depth * 10,
            size: LEAF_SIZE,
            attrs: { label: { text: node.label }}
        }));
        return;
    }

    const cluster = new Cluster({
        id: node.id,
        z: depth * 10,
        size: COLLAPSED_SIZE,
        attrs: { headerText: { text: node.label }}
    });
    cluster.setDepth(depth);
    cells.push(cluster);

    node.children.forEach((child) => addCells(child, depth + 1, cells));
    // The links of a cluster are rendered above its body, but below its
    // children (which are one level deeper).
    node.edges.forEach(({ id, source, target }) => cells.push(new Edge({
        id,
        z: depth * 10 + 5,
        source: { id: source },
        target: { id: target }
    })));
}

/**
 * Embed the children into their clusters and move every link into the cluster
 * of its endpoints, so that a single `collapsed` flag hides the whole subtree.
 */
export function embedCells(graph: dia.Graph, clusters: ClusterSpec[]): void {
    clusters.forEach((cluster) => embedCluster(graph, cluster));
}

function embedCluster(graph: dia.Graph, cluster: ClusterSpec): void {
    const parent = graph.getCell(cluster.id) as Cluster;
    parent.embed(cluster.children.map(({ id }) => graph.getCell(id)));
    cluster.children.forEach((child) => {
        if (isClusterSpec(child)) embedCluster(graph, child);
    });
    cluster.edges.forEach(({ id }) => (graph.getCell(id) as dia.Link).reparent());
}

/**
 * Lay the diagram out with ELK and apply the result to the JointJS graph.
 */
export async function layoutDiagram(graph: dia.Graph, clusters: ClusterSpec[]): Promise<void> {
    const elkGraph = await elk.layout(createElkGraph(graph, clusters));
    applyNodeLayout(graph, elkGraph, 0, 0);
}

/**
 * Convert the diagram description into an ELK graph. The content of a
 * collapsed cluster is left out - the cluster becomes a plain node of the
 * size of its header.
 */
function createElkGraph(graph: dia.Graph, clusters: ClusterSpec[]): ElkNode {
    return {
        id: 'root',
        layoutOptions: ROOT_LAYOUT_OPTIONS,
        children: clusters.map((cluster) => createElkNode(graph, cluster))
    };
}

function createElkNode(graph: dia.Graph, node: NodeSpec): ElkNode {
    if (!isClusterSpec(node)) {
        return { id: node.id, ...LEAF_SIZE };
    }
    const cluster = graph.getCell(node.id) as Cluster;
    if (cluster.isCollapsed()) {
        return { id: node.id, ...COLLAPSED_SIZE };
    }
    return {
        id: node.id,
        layoutOptions: CLUSTER_LAYOUT_OPTIONS,
        children: node.children.map((child) => createElkNode(graph, child)),
        edges: node.edges.map(({ id, source, target }) => ({
            id,
            sources: [source],
            targets: [target]
        }))
    };
}

/**
 * Apply the layout of a single ELK node. The coordinates of its children (and
 * of the links declared on it) are relative to its own origin, `[ox, oy]` is
 * the absolute position of that origin.
 */
function applyNodeLayout(graph: dia.Graph, node: ElkNode, ox: number, oy: number): void {
    const { children = [], edges = [] } = node;
    // The local positions of the children are needed to convert the absolute
    // link end points into the anchors of the end elements.
    const childPositions = new Map<string, ElkPoint>();

    children.forEach((child) => {
        const x = child.x ?? 0;
        const y = child.y ?? 0;
        childPositions.set(child.id, { x, y });
        const element = graph.getCell(child.id) as dia.Element;
        // Note: `element.set()` is used instead of `element.position()` and
        // `element.resize()` - the children of the element are positioned by
        // ELK too and must not be moved along with their parent.
        element.set({
            position: { x: ox + x, y: oy + y },
            size: {
                width: child.width ?? LEAF_SIZE.width,
                height: child.height ?? LEAF_SIZE.height
            }
        });
        applyNodeLayout(graph, child, ox + x, oy + y);
    });

    edges.forEach((edge) => applyEdgeLayout(graph, edge, childPositions, ox, oy));
}

function applyEdgeLayout(
    graph: dia.Graph,
    edge: ElkExtendedEdge,
    childPositions: Map<string, ElkPoint>,
    ox: number,
    oy: number
): void {
    const [section] = edge.sections ?? [];
    if (!section) return;
    const { startPoint, endPoint, bendPoints = [] } = section;
    const link = graph.getCell(edge.id) as dia.Link;
    link.set({
        source: getLinkEnd(edge.sources[0], startPoint, childPositions),
        target: getLinkEnd(edge.targets[0], endPoint, childPositions),
        vertices: bendPoints.map(({ x, y }) => ({ x: ox + x, y: oy + y }))
    });
}

/**
 * Pin the link end to the exact point ELK has routed the link to.
 */
function getLinkEnd(
    id: string,
    point: ElkPoint,
    childPositions: Map<string, ElkPoint>
): dia.Link.EndJSON {
    const { x, y } = childPositions.get(id) ?? { x: 0, y: 0 };
    return {
        id,
        anchor: {
            name: 'topLeft',
            args: {
                dx: point.x - x,
                dy: point.y - y,
                useModelGeometry: true
            }
        }
    };
}
