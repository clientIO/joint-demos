import type { LinkRecord } from '@joint/react-plus';
import { seatColor } from '@/model/palette';
import type { CardNode, FlowDraft, NodeId, PortSide } from '@/model/types';
import type { FlowData } from './derive-cells';

/**
 * Colleagues' flows that are still in the air. A flow dragged out of a port
 * is shown to everyone while it is being drawn, not only once it lands:
 * a dashed link in the dragger's colour from the port to their pointer,
 * the same draft the dragger sees, so nobody is surprised by a flow that
 * appears out of nowhere. Once the dragger's end snaps to a port, the
 * draft lands on that port here too and takes the route the flow will.
 */

export interface PeerDraft extends FlowDraft {
  /** The colleague's connection id. */
  readonly id: string;
  readonly seat: number;
}

const NO_DRAFT_LINKS: Array<LinkRecord<FlowData>> = [];
const LOOSE_ROUTER = { name: 'normal' } as const;
/** The same right-angle routing the committed flows get (see `LINK_ROUTING`). */
const SNAPPED_ROUTER = { name: 'rightAngle', args: { margin: 20 }} as const;

/**
 * One dashed link per colleague drawing a flow; drafts whose source card is
 * gone are skipped.
 */
export function deriveDraftLinks(
    drafts: readonly PeerDraft[],
    nodes: Readonly<Record<NodeId, CardNode>>
): Array<LinkRecord<FlowData>> {
    if (drafts.length === 0) return NO_DRAFT_LINKS;
    return drafts
        .filter((draft) => nodes[draft.from] !== undefined)
        .map((draft) => {
            const isSnapped =
        draft.to !== undefined && draft.toPort !== undefined && nodes[draft.to] !== undefined;
            return {
                id: `draft-${draft.id}`,
                type: 'link' as const,
                z: 10,
                source: { id: draft.from, port: draft.fromPort },
                target: isSnapped
                    ? { id: draft.to as NodeId, port: draft.toPort as PortSide }
                    : { x: draft.x, y: draft.y },
                // Loose in the air the draft is a straight line to the pointer, as
                // it is for the dragger; snapped, it takes the route the flow will
                // (spelled out: the board's default only routes links it considers
                // connected, and a draft is not one of them).
                router: isSnapped ? SNAPPED_ROUTER : LOOSE_ROUTER,
                data: { isDraft: true },
                style: {
                    color: seatColor(draft.seat),
                    width: 1.5,
                    dasharray: '6,4',
                    linecap: 'round',
                    className: 'jb-flow jb-peer-draft',
                },
            };
        });
}
