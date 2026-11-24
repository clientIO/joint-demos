/**
 * Presence drawn on the board: colleagues' live cursors, and a ghost where a
 * colleague is about to drop a card from the palette. Both are decorative (the side
 * panel says the same in text), so they ignore the pointer and hide from readers.
 */
import { Overlay } from '@joint/react-plus';
import { CARD_HEIGHT, CARD_WIDTH, KIND_LABELS, departmentOf, seatColor } from '@/model';
import { activityLabel, usePeerCursors, usePeerPlacings } from '@/presence';
import type { PeerCursor, PeerPlacing } from '@/presence';

function CursorPlate({ cursor }: Readonly<{ cursor: PeerCursor }>) {
    const color = seatColor(cursor.seat);
    const activity = activityLabel(cursor.verb);
    return (
        <Overlay x={cursor.x} y={cursor.y} className="pb-no-pointer flex flex-col items-start" wheelTransparent aria-hidden>
            <svg width={18} height={20} viewBox="0 0 18 20" aria-hidden>
                <path d="M 2 1 L 16 9.5 L 9.6 11.4 L 6.4 18 Z" fill={color} stroke="var(--panel)" strokeWidth={1.4} />
            </svg>
            <span
                className="ml-3 flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-bold"
                style={{ background: color, color: 'var(--seat-ink)' }}
            >
                {departmentOf(cursor.seat)} · {cursor.name}
                {activity !== null && <span className="font-medium opacity-75">· {activity}</span>}
            </span>
        </Overlay>
    );
}

/** Every colleague's pointer, with their department, name and current activity. */
export function PeerCursors() {
    const cursors = usePeerCursors();
    return cursors.map((cursor) => <CursorPlate key={cursor.connectionId} cursor={cursor} />);
}

function PlacingGhost({ placing }: Readonly<{ placing: PeerPlacing }>) {
    const color = seatColor(placing.seat);
    return (
        <Overlay x={placing.x} y={placing.y} scaleWithPaper wheelTransparent className="pb-no-pointer" aria-hidden>
            <div
                className="flex items-start gap-2 rounded-[14px] border-[1.5px] border-dashed px-3.5 py-3 text-[12.5px] font-bold"
                style={{
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                    borderColor: color,
                    color,
                    background: `color-mix(in oklch, ${color} 9%, transparent)`,
                }}
            >
                {KIND_LABELS[placing.kind]}
                <span className="font-medium opacity-75">· {placing.name}</span>
            </div>
        </Overlay>
    );
}

/** A dashed outline where each colleague is dragging a new card in from the palette. */
export function PeerPlacingGhosts() {
    const placings = usePeerPlacings();
    return placings.map((placing) => <PlacingGhost key={placing.connectionId} placing={placing} />);
}
