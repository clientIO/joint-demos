/**
 * Every write to the shared board, as Liveblocks mutation hooks. Components never
 * touch storage directly: they call these, Liveblocks syncs the change to the room,
 * and the diagram re-draws from storage for everyone, the author included.
 */
import { LiveObject } from '@liveblocks/client';
import type { IncrementalCellsChange } from '@joint/react-plus';
import { useMutation } from '@liveblocks/react/suspense';
import type { Storage } from '@/liveblocks.config';
import type { Card, Kind } from '@/model';
import {
    CARD_HEIGHT,
    CARD_MAX_HEIGHT,
    CARD_MAX_WIDTH,
    CARD_MIN_HEIGHT,
    CARD_MIN_WIDTH,
    CARD_WIDTH,
    KIND_LABELS,
    defaultCardTitle,
    departmentOf,
} from '@/model';
import { useUiState } from '@/ui-state';

/** Rows kept in the activity feed. */
const FEED_LIMIT = 30;

/** An id that stays unique across tabs without a server round trip. */
function newId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function clamp(value: number, min: number, max: number): number {
    return Math.round(Math.min(Math.max(value, min), max));
}

/** Appends a feed row and drops the oldest past the limit. */
function logActivity(storage: LiveObject<Storage>, seat: number, text: string): void {
    const feed = storage.get('feed');
    feed.push({ id: newId('row'), at: Date.now(), seat, text });
    while (feed.length > FEED_LIMIT) feed.delete(0);
}

/** Adds a card of my department, selects it, and returns nothing if I have not joined. */
export function useAddCard() {
    const insertCard = useMutation(({ storage, self }, kind: Kind, x: number, y: number) => {
        const { seat } = self.presence;
        if (seat < 0) return null;
        const cards = storage.get('cards');
        let ordinal = 0;
        for (const card of cards.values()) {
            if (card.get('kind') === kind) ordinal += 1;
        }
        const id = newId('card');
        const title = defaultCardTitle(kind, ordinal);
        cards.set(id, new LiveObject<Card>({
            kind,
            title,
            detail: 'Double-click to rename, edit the rest in the panel',
            seat,
            x: Math.round(x),
            y: Math.round(y),
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
        }));
        logActivity(storage, seat, `${departmentOf(seat)} added the ${KIND_LABELS[kind].toLowerCase()} "${title}"`);
        return id;
    }, []);

    return (kind: Kind, x: number, y: number) => {
        const id = insertCard(kind, x, y);
        if (id === null) return;
        useUiState.setState({ selectedCard: id, selectedFlow: null, connectFrom: null, hasAddedCard: true });
    };
}

/** A card's geometry, as the graph reports it. */
interface Geometry {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

/** Writes a card's geometry, rounded and within the size limits; no write if nothing changed. */
function writeGeometry(card: LiveObject<Card>, geometry: Geometry): void {
    const next = {
        x: Math.round(geometry.x),
        y: Math.round(geometry.y),
        width: clamp(geometry.width, CARD_MIN_WIDTH, CARD_MAX_WIDTH),
        height: clamp(geometry.height, CARD_MIN_HEIGHT, CARD_MAX_HEIGHT),
    };
    const isSame = card.get('x') === next.x && card.get('y') === next.y
        && card.get('width') === next.width && card.get('height') === next.height;
    if (!isSame) card.update(next);
}

/**
 * Writes a card's position on every pointer move of a drag, so peers see it travel,
 * and marks me "moving" it in presence. The graph keeps the drag in a batch until
 * the pointer is released, so {@link useSaveCellChanges} alone would only sync the
 * drop point.
 */
export function useMoveCard() {
    return useMutation(({ storage, self, setMyPresence }, cardId: string, x: number, y: number) => {
        const card = storage.get('cards').get(cardId);
        if (!card || (card.get('x') === x && card.get('y') === y)) return;
        card.update({ x, y });
        const { busy } = self.presence;
        if (busy?.cardId !== cardId || busy.verb !== 'moving') {
            setMyPresence({ busy: { cardId, verb: 'moving' }});
        }
    }, []);
}

/** Writes each step of a resize, for the same reason as {@link useMoveCard}. */
export function useResizeCard() {
    return useMutation(({ storage }, cardId: string, geometry: Geometry) => {
        const card = storage.get('cards').get(cardId);
        if (card) writeGeometry(card, geometry);
    }, []);
}

/**
 * The safety net: whatever card geometry the graph reports as changed when a
 * gesture ends is written back to storage. After a drag or resize this is usually
 * a no-op, since the live writes above got there first. Anything else the graph
 * reports (a dropped palette clone, for one) is not part of the document and is
 * ignored; the next cells sync removes it.
 */
export function useSaveCellChanges() {
    return useMutation(({ storage }, { changed }: IncrementalCellsChange) => {
        const cards = storage.get('cards');
        for (const [id, cell] of changed) {
            const card = cards.get(String(id));
            if (!card || !('position' in cell) || !cell.position || !cell.size) continue;
            writeGeometry(card, { ...cell.position, ...cell.size });
        }
    }, []);
}

/** The card fields people edit by hand. */
export type CardEdit = Partial<Pick<Card, 'title' | 'detail' | 'kind'>>;

/** Edits a card's text or kind; a new title also lands in the activity feed. */
export function useEditCard() {
    return useMutation(({ storage, self }, cardId: string, edit: CardEdit) => {
        const card = storage.get('cards').get(cardId);
        if (!card) return;
        const title = edit.title?.trim();
        const previousTitle = card.get('title');
        if (title !== undefined && title !== '' && title !== previousTitle) {
            card.set('title', title);
            logActivity(storage, self.presence.seat, `"${previousTitle}" renamed to "${title}"`);
        }
        const detail = edit.detail?.trim();
        if (detail !== undefined && detail !== card.get('detail')) card.set('detail', detail);
        if (edit.kind !== undefined && edit.kind !== card.get('kind')) card.set('kind', edit.kind);
    }, []);
}

/** Removes a card and its flows; only the owning department may do so. */
export function useRemoveCard() {
    return useMutation(({ storage, self }, cardId: string) => {
        const card = storage.get('cards').get(cardId);
        const { seat } = self.presence;
        if (!card || card.get('seat') !== seat) return;
        const flows = storage.get('flows');
        for (const [flowId, flow] of flows) {
            if (flow.source === cardId || flow.target === cardId) flows.delete(flowId);
        }
        storage.get('cards').delete(cardId);
        logActivity(storage, seat, `${departmentOf(seat)} removed "${card.get('title')}"`);
    }, []);
}

/** Connects two cards. Self-loops, duplicates and notes are refused. */
export function useAddFlow() {
    return useMutation(({ storage, self }, source: string, target: string) => {
        const cards = storage.get('cards');
        const from = cards.get(source);
        const to = cards.get(target);
        const { seat } = self.presence;
        if (seat < 0 || !from || !to || source === target) return;
        if (from.get('kind') === 'note' || to.get('kind') === 'note') return;
        const flows = storage.get('flows');
        for (const flow of flows.values()) {
            if (flow.source === source && flow.target === target) return;
        }
        flows.set(newId('flow'), { source, target });
        logActivity(storage, seat, `${departmentOf(seat)} connected "${from.get('title')}" to "${to.get('title')}"`);
    }, []);
}

/** Removes a flow. */
export function useRemoveFlow() {
    return useMutation(({ storage, self }, flowId: string) => {
        const flows = storage.get('flows');
        const flow = flows.get(flowId);
        if (!flow) return;
        flows.delete(flowId);
        const cards = storage.get('cards');
        const from = cards.get(flow.source)?.get('title') ?? '...';
        const to = cards.get(flow.target)?.get('title') ?? '...';
        const { seat } = self.presence;
        logActivity(storage, seat, `${departmentOf(seat)} removed "${from}" to "${to}"`);
    }, []);
}

/** Renames the board for everyone. */
export function useSetBoardTitle() {
    return useMutation(({ storage }, title: string) => {
        const trimmed = title.trim();
        if (trimmed !== '' && trimmed !== storage.get('title')) storage.set('title', trimmed);
    }, []);
}
