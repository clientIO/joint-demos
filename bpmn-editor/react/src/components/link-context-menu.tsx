import { useEffect, useRef } from 'react';
import { Overlay } from '@joint/react-plus';

import type { ContextMenuState } from '../editor/context-menu-bridge';

interface LinkContextMenuProps {
    menu: ContextMenuState | null;
    onClose: () => void;
}

// Context menu rendered at a graph coordinate via the Overlay component.
export function LinkContextMenu({ menu, onClose }: LinkContextMenuProps) {

    const menuRef = useRef<HTMLDivElement | null>(null);

    // Close on Escape or any pointerdown outside the menu.
    useEffect(() => {
        if (!menu) return;
        const onPointerDown = (evt: PointerEvent) => {
            if (!menuRef.current?.contains(evt.target as Node)) onClose();
        };
        const onKeyDown = (evt: KeyboardEvent) => {
            if (evt.key === 'Escape') onClose();
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [menu, onClose]);

    if (!menu) return null;

    return (
        <Overlay x={menu.x} y={menu.y}>
            <div ref={menuRef} className="context-menu">
                {menu.items.map((item) => (
                    <button
                        type="button"
                        key={item.action}
                        className="context-menu-item"
                        onClick={() => menu.onAction(item.action)}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
        </Overlay>
    );
}
