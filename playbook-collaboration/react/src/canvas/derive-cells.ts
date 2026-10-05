import { linkMarkerArrowOpen, linkMarkerCircle } from '@joint/react-plus';
import type { CellRecord, ElementPort, ElementRecord, LinkRecord } from '@joint/react-plus';
import type { Flow, FlowId, Kind, NodeId, CardNode, PortSide } from '@/model/types';
import { CARD_HEIGHT, CARD_WIDTH } from '@/state/store';

/**
 * The shared document → controlled JointJS cells. Pure and deterministic, so
 * every collaborator derives the identical board from the identical store.
 */

export interface CardData {
  readonly kind: Kind;
  readonly title: string;
  readonly subtitle: string;
  /** Seat of the owning department. */
  readonly ownerSeat: number;
  readonly ownerDept: string;
}

export interface FlowData {
  /** A colleague's flow still in the air, drawn dashed; committed flows are not. */
  readonly isDraft: boolean;
}

const EMPTY_FLOW_DATA: FlowData = { isDraft: false };

export type BoardCell = CellRecord<CardData, FlowData>;

/** The pin-style connector ends: a port dot leaving, an open arrow arriving. */
const PORT_DOT = linkMarkerCircle({
    fill: 'var(--paper)',
    stroke: 'var(--port-stroke)',
    strokeWidth: 1.5,
});
const ARROW = linkMarkerArrowOpen({ stroke: 'context-stroke', strokeWidth: 1.5 });

/**
 * Every process card carries two REAL model ports, vertically centred on its
 * flanks: an IN dot on the left that only receives, an OUT dot on the right
 * that flows leave from. A flow always runs out to in, so the direction is
 * readable from the dots alone and a dragged flow can only start on an OUT
 * dot and land on an IN dot. A note has no ports: it annotates the board and
 * never joins the process.
 */
const CARD_PORTS: Record<PortSide, ElementPort> = {
    left: { cx: 0, cy: 'calc(h/2)', className: 'jb-port jb-port-in', passive: true },
    right: { cx: 'calc(w)', cy: 'calc(h/2)', className: 'jb-port jb-port-out' },
};
const NO_PORTS: Record<string, ElementPort> = {};

const CARD_PORT_STYLE: Partial<ElementPort> = {
    width: 12,
    height: 12,
};

/** Whether a flow may exist between these two cards. */
function canFlow(from: CardNode | undefined, to: CardNode | undefined): boolean {
    return from !== undefined && to !== undefined && from.kind !== 'note' && to.kind !== 'note';
}

export function deriveCells(
    nodes: Readonly<Record<NodeId, CardNode>>,
    flows: Readonly<Record<FlowId, Flow>>,
    seatOf: (owner: string) => number,
    departmentOf: (owner: string) => string,
    selectedFlow: FlowId | null = null
): BoardCell[] {
    const nodeList = Object.values(nodes).sort((a, b) => (a.id < b.id ? -1 : 1));
    const flowList = Object.values(flows).sort((a, b) => (a.id < b.id ? -1 : 1));

    const elements: Array<ElementRecord<CardData>> = nodeList.map((node) => ({
        id: node.id,
        type: 'element',
        position: { x: node.x, y: node.y },
        size: { width: node.w ?? CARD_WIDTH, height: node.h ?? CARD_HEIGHT },
        portMap: node.kind === 'note' ? NO_PORTS : CARD_PORTS,
        portStyle: CARD_PORT_STYLE,
        data: {
            kind: node.kind,
            title: node.title,
            subtitle: node.subtitle,
            ownerSeat: seatOf(node.owner),
            ownerDept: departmentOf(node.owner),
        },
    }));

    const links: Array<LinkRecord<FlowData>> = flowList
        .filter((flow) => canFlow(nodes[flow.from], nodes[flow.to]))
        .map((flow) => ({
            id: flow.id,
            type: 'link',
            z: -1,
            source: { id: flow.from, port: 'right' },
            target: { id: flow.to, port: 'left' },
            data: EMPTY_FLOW_DATA,
            style: {
                color: 'var(--flow-stroke)',
                width: 1.5,
                linecap: 'round',
                linejoin: 'round',
                className: flow.id === selectedFlow ? 'jb-flow is-selected' : 'jb-flow',
                wrapperClassName: 'jb-flow-wrapper',
                sourceMarker: PORT_DOT,
                targetMarker: ARROW,
            },
        }));

    return [...elements, ...links];
}
