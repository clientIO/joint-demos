import { Overlay } from '@joint/react-plus';
import { seatColor } from '@/model/palette';
import { KIND_LABELS } from '@/model/types';
import type { Presence } from '@/model/types';
import { CARD_HEIGHT, CARD_WIDTH } from '@/state/store';
import { useOthers } from '@/state/use-room';

/**
 * Cards colleagues are dragging in from the rail: a dashed outline in their
 * colour where the card would land, so nobody sees a card appear out of
 * nowhere. Presence-driven and decorative, like the cursors.
 */

function Ghost({ presence }: Readonly<{ presence: Presence }>) {
    const placing = presence.placing;
    if (placing === null) return null;
    const color = seatColor(presence.seat);
    return (
        <Overlay
            x={placing.x}
            y={placing.y}
            scaleWithPaper
            wheelTransparent
            className="jb-nopointer"
            aria-hidden
        >
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
                <span className="font-medium opacity-75">· {presence.person}</span>
            </div>
        </Overlay>
    );
}

export function PeerGhosts() {
    const others = useOthers();
    return (
        <>
            {others.map((colleague) => (
                <Ghost key={colleague.id} presence={colleague.presence} />
            ))}
        </>
    );
}
