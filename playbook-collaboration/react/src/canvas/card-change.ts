import type { ElementRecord } from '@joint/react-plus';
import type { CardData } from './derive-cells';

/**
 * What a card looks like to a colleague: where it is, how big, what it says.
 * A change in any of these is a change they can see.
 */
export interface CardSnapshot {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly kind: string;
  readonly title: string;
  readonly subtitle: string;
}

export function cardSnapshot(cell: ElementRecord<CardData>): CardSnapshot {
    return {
        x: cell.position?.x ?? 0,
        y: cell.position?.y ?? 0,
        width: cell.size?.width ?? 0,
        height: cell.size?.height ?? 0,
        kind: cell.data?.kind ?? '',
        title: cell.data?.title ?? '',
        subtitle: cell.data?.subtitle ?? '',
    };
}

export function isSameCardSnapshot(a: CardSnapshot, b: CardSnapshot): boolean {
    return (
        a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.kind === b.kind &&
    a.title === b.title &&
    a.subtitle === b.subtitle
    );
}

/**
 * A `useCell` selector that answers "when did someone ELSE last change this
 * card?": it keeps the last snapshot it saw and, when the cell differs from
 * it, records the moment, unless the change is mine (`isMine` reads my own
 * gestures off the local state). Returns a primitive, so the card re-renders
 * only when a colleague's change lands, not on every cell commit.
 */
export function createChangeClock(
    isMine: () => boolean,
    now: () => number = Date.now
): (cell: ElementRecord<CardData>) => number | undefined {
    let last: CardSnapshot | null = null;
    let changedAt: number | undefined;
    return (cell) => {
        const next = cardSnapshot(cell);
        if (last === null) {
            last = next;
            return changedAt;
        }
        if (isSameCardSnapshot(last, next)) return changedAt;
        last = next;
        if (!isMine()) changedAt = now();
        return changedAt;
    };
}
