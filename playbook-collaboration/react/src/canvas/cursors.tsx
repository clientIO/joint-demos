import { Overlay } from '@joint/react-plus';
import { seatColor } from '@/model/palette';
import type { Presence } from '@/model/types';
import { useOthers } from '@/state/use-room';

/**
 * Colleagues' live cursors: a pointer in the department's color with a
 * "Department · Name" plate, plus the live verb while they work. Figma-grade
 * presence, in business dress.
 */

const CURSOR_CLASS = 'jb-nopointer flex flex-col items-start';

function verbOf(presence: Presence): string | null {
    switch (presence.doing) {
        case 'mapping':
            return 'mapping';
        case 'moving':
            return 'moving a card';
        case 'resizing':
            return 'resizing a card';
        case 'editing':
            return 'editing a card';
        default:
            return null;
    }
}

function Cursor({ presence }: Readonly<{ presence: Presence }>) {
    if (!presence.cursor) return null;
    const color = seatColor(presence.seat);
    const verb = verbOf(presence);
    return (
    // Decorative: the team panel carries the same who-is-doing-what as text.
        <Overlay
            x={presence.cursor.x}
            y={presence.cursor.y}
            className={CURSOR_CLASS}
            wheelTransparent
            aria-hidden
        >
            <svg width={18} height={20} viewBox="0 0 18 20" aria-hidden>
                <path
                    d="M 2 1 L 16 9.5 L 9.6 11.4 L 6.4 18 Z"
                    fill={color}
                    stroke="var(--panel)"
                    strokeWidth={1.4}
                />
            </svg>
            <span
                className="ml-3 flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[10px] font-bold"
                style={{ background: color, color: 'var(--seat-ink)' }}
            >
                {presence.department} · {presence.person}
                {verb !== null && <span className="font-medium opacity-75">— {verb}</span>}
            </span>
        </Overlay>
    );
}

export function Cursors() {
    const others = useOthers();
    return (
        <>
            {others.map((colleague) => (
                <Cursor key={colleague.id} presence={colleague.presence} />
            ))}
        </>
    );
}
