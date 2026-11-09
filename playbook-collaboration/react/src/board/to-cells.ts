/**
 * Storage to diagram: turns the shared cards and flows into the cell records the
 * controlled `<Diagram cells>` draws. Pure and deterministic, so every collaborator
 * derives the same board from the same storage.
 */
import { linkMarkerArrowOpen, linkMarkerCircle } from '@joint/react-plus';
import type { CellRecord, ElementPort, ElementRecord, LinkRecord } from '@joint/react-plus';
import type { FlowDraft } from '@/liveblocks.config';
import type { Card, Flow, Kind } from '@/model';
import { seatColor } from '@/model';

/** What a card's renderer receives as `data`. */
export interface CardData {
    readonly kind: Kind;
    readonly title: string;
    readonly detail: string;
    readonly seat: number;
}

export type BoardCell = CellRecord<CardData>;

/** A colleague's flow still in the air, tagged with who draws it. */
export interface PeerDraft extends FlowDraft {
    readonly connectionId: number;
    readonly seat: number;
}

/**
 * Two real ports per card: an IN dot on the left that only receives and an OUT dot
 * on the right that flows leave from, so a flow's direction reads from the dots.
 * A note has none: it annotates the board and never joins the process.
 */
const CARD_PORTS: Record<string, ElementPort> = {
    in: { cx: 0, cy: 'calc(h/2)', width: 12, height: 12, className: 'pb-port pb-port-in', passive: true },
    out: { cx: 'calc(w)', cy: 'calc(h/2)', width: 12, height: 12, className: 'pb-port pb-port-out' },
};
const NO_PORTS: Record<string, ElementPort> = {};

/** Pin-style flow ends: a port dot where it leaves, an open arrow where it lands. */
const PORT_DOT = linkMarkerCircle({ fill: 'var(--paper)', stroke: 'var(--port-stroke)', strokeWidth: 1.5 });
const ARROW = linkMarkerArrowOpen({ stroke: 'context-stroke', strokeWidth: 1.5 });

/** Loose in the air a draft is a straight line; snapped, it takes the route the flow will. */
const LOOSE_ROUTER = { name: 'normal' } as const;
const SNAPPED_ROUTER = { name: 'rightAngle', args: { margin: 20 }} as const;

function toCardCell(id: string, card: Card): ElementRecord<CardData> {
    return {
        id,
        type: 'element',
        position: { x: card.x, y: card.y },
        size: { width: card.width, height: card.height },
        portMap: card.kind === 'note' ? NO_PORTS : CARD_PORTS,
        data: { kind: card.kind, title: card.title, detail: card.detail, seat: card.seat },
    };
}

function toFlowCell(id: string, flow: Flow, isSelected: boolean): LinkRecord {
    return {
        id,
        type: 'link',
        z: -1,
        source: { id: flow.source, port: 'out' },
        target: { id: flow.target, port: 'in' },
        style: {
            color: 'var(--flow-stroke)',
            width: 1.5,
            linecap: 'round',
            linejoin: 'round',
            // Selection is local to this tab, so it is a class here, not a stored field.
            className: isSelected ? 'pb-flow is-selected' : 'pb-flow',
            wrapperClassName: 'pb-flow-hit-area',
            sourceMarker: PORT_DOT,
            targetMarker: ARROW,
        },
    };
}

/** Where a draft's loose end goes: the snapped IN dot, or the pointer if that card is gone. */
function draftTarget(draft: FlowDraft, cards: Readonly<Record<string, Card>>) {
    return draft.target !== null && draft.target in cards
        ? { id: draft.target, port: 'in' }
        : { x: draft.x, y: draft.y };
}

/** A colleague's flow in the air: dashed, in their color, from the OUT dot to their pointer. */
function toPeerDraftCell(draft: PeerDraft, cards: Readonly<Record<string, Card>>): LinkRecord {
    const target = draftTarget(draft, cards);
    return {
        id: `draft-${draft.connectionId}`,
        type: 'link',
        z: 10,
        source: { id: draft.source, port: 'out' },
        target,
        router: 'id' in target ? SNAPPED_ROUTER : LOOSE_ROUTER,
        style: { color: seatColor(draft.seat), width: 1.5, dasharray: '6,4', linecap: 'round', className: 'pb-flow' },
    };
}

/**
 * My own flow in the air, under the id of the link I am dragging. Without it, a
 * re-sync caused by someone else's edit would remove that link mid-drag, since
 * the controlled cells own everything on the board.
 */
function toOwnDraftCell(draft: FlowDraft, cards: Readonly<Record<string, Card>>): LinkRecord {
    return {
        id: draft.linkId,
        type: 'link',
        z: 10,
        source: { id: draft.source, port: 'out' },
        target: draftTarget(draft, cards),
        style: OWN_DRAFT_STYLE,
    };
}

/** The look of my own draft; the paper's `defaultLink` uses it too. */
export const OWN_DRAFT_STYLE = { color: 'var(--accent)', width: 1.5, dasharray: '6,4', linecap: 'round' } as const;

/**
 * The full controlled cell list. Flows touching a missing card or a note are
 * skipped, so a half-applied remote edit can never point a link at nothing.
 */
export function toCells(
    cards: Readonly<Record<string, Card>>,
    flows: Readonly<Record<string, Flow>>,
    selectedFlow: string | null,
    peerDrafts: readonly PeerDraft[],
    ownDraft: FlowDraft | null
): BoardCell[] {
    const cells: BoardCell[] = [];
    for (const [id, card] of Object.entries(cards)) cells.push(toCardCell(id, card));
    for (const [id, flow] of Object.entries(flows)) {
        const source = cards[flow.source];
        const target = cards[flow.target];
        if (!source || !target || source.kind === 'note' || target.kind === 'note') continue;
        cells.push(toFlowCell(id, flow, id === selectedFlow));
    }
    for (const draft of peerDrafts) {
        if (draft.source in cards) cells.push(toPeerDraftCell(draft, cards));
    }
    if (ownDraft !== null && ownDraft.source in cards) cells.push(toOwnDraftCell(ownDraft, cards));
    return cells;
}
