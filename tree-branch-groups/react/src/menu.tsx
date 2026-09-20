import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { MenuRequest } from './choices';

/** An icon of a menu item, drawn the way the nodes draw theirs. */
function MenuIcon({ d, color }: { d: string; color: string }): ReactNode {
    return (
        <svg viewBox="-10 -10 20 20" width="18" height="18" aria-hidden="true">
            <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

interface MenuProps {
    request: MenuRequest;
    onClose: () => void;
}

/**
 * The one menu of the app, open below the button that asked for it: a small
 * panel with an icon and a label per item. A choice closes it, and so does
 * a click anywhere else, or `Escape`. Kept on the screen: a menu opened
 * near the right or the bottom edge moves in.
 */
export function Menu({ request, onClose }: MenuProps): ReactNode {
    const { anchor, items, onChoose, onHover } = request;
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ left: anchor.left, top: anchor.bottom + 6 });

    useLayoutEffect(() => {
        const el = ref.current;
        if (!el) return;
        const { width, height } = el.getBoundingClientRect();
        setPosition({
            left: Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8)),
            top: anchor.bottom + height + 6 > window.innerHeight ? anchor.top - height - 6 : anchor.bottom + 6
        });
    }, [anchor]);

    // The menu going - `Escape`, a click elsewhere - ends the hover of its item too: React fires no `mouseleave` on unmount.
    useEffect(() => () => onHover?.(null), [onHover]);

    useEffect(() => {
        const onPointerDown = (evt: PointerEvent): void => {
            if (!ref.current?.contains(evt.target as Node)) onClose();
        };
        const onKeyDown = (evt: KeyboardEvent): void => {
            if (evt.key === 'Escape') onClose();
        };
        // Capture: the click that closes the menu may land on a cell of the paper, which stops it.
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown, true);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown, true);
        };
    }, [onClose]);

    return (
        <div ref={ref} className="menu" style={position} role="menu">
            {items.map((item) => (
                <button
                    key={item.action}
                    type="button"
                    role="menuitem"
                    className="menu-item"
                    disabled={item.disabled}
                    onMouseEnter={() => onHover?.(item.action)}
                    onMouseLeave={() => onHover?.(null)}
                    onClick={() => {
                        onHover?.(null);
                        onClose();
                        onChoose(item.action);
                    }}
                >
                    <MenuIcon d={item.icon} color={item.color} />
                    <span>{item.label}</span>
                </button>
            ))}
        </div>
    );
}
