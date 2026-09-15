import type { ElementRecord, LinkRecord } from '@joint/react-plus';
import { LINK_COLOR } from '@/theme';
import type { ServiceStatus } from '@/theme';

/**
 * The `data` slice each node receives.
 *
 * Every level of detail reads from this one record — the card shows all of it,
 * the chip shows the name and the latency, the block shows only the status as a
 * colour. Nothing about the node's rendering is stored here: what a node looks
 * like is decided by the zoom, not by the model.
 */
export interface NodeData {
    readonly name: string;
    readonly group: string;
    readonly region: string;
    readonly latencyMs: number;
    /** Share of capacity in use, 0–1. Drawn as the bar on the card. */
    readonly load: number;
    readonly status: ServiceStatus;
}

export type ServiceElement = ElementRecord<NodeData>;
export type ServiceCell = ServiceElement | LinkRecord;

/**
 * One size for all three levels of detail.
 *
 * This is the rule the whole demo rests on: the level of detail changes what a
 * node *draws*, never how big it is. The size lives on the model, so the links,
 * the quad-tree index and virtual rendering's viewport test all keep working on
 * geometry that never moves — a node that shrank when it dropped to a block
 * would drag every link end with it and reflow the diagram as you zoomed.
 */
export const NODE_SIZE = { width: 300, height: 96 } as const;

/* Two fixed stacking levels: every link below every node. */
const LINK_Z = 1;
const ELEMENT_Z = 2;

export interface NodeSpec {
    readonly id: string;
    readonly data: NodeData;
    readonly position: { readonly x: number; readonly y: number };
}

/**
 * Builds one node record.
 *
 * The size is written onto the model rather than measured back out of the DOM:
 * the high-detail card is rendered by `<HTMLHost useModelGeometry>`, which takes
 * its box from the element instead of putting a `ResizeObserver` round trip
 * behind each of the 1,200 nodes. It is also what keeps the box identical
 * across the three levels — an SVG chip has no measurable layout to agree with
 * an HTML card about.
 */
export function makeNode({ id, data, position }: NodeSpec): ServiceElement {
    return {
        id,
        type: 'element',
        z: ELEMENT_Z,
        position,
        size: NODE_SIZE,
        data,
    };
}

/**
 * Builds one link record.
 *
 * No arrowhead and no label: a marker is a second path per link, and at the
 * zoom levels where this graph is interesting it would be a sub-pixel smudge.
 * The links are plain SVG cells drawn by JointJS — React renders the nodes
 * only, which is why the level of detail is a question about elements.
 */
export function makeLink(id: string, sourceId: string, targetId: string): LinkRecord {
    return {
        id,
        type: 'link',
        z: LINK_Z,
        source: { id: sourceId },
        target: { id: targetId },
        style: { color: LINK_COLOR, width: 1 },
    };
}
