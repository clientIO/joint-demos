import { useEffect, useRef, useState } from 'react';
import { Overlay, usePaper, useSelectionCollection, useOnPaperEvents } from '@joint/react-plus';
import { openLabelEditor } from '../../actions/label-editor';

import type { AppLink } from '../../shapes/shapes-typing';
import './link-context-menu.css';

interface MenuState {
    // Local (graph) coordinates.
    x: number;
    y: number;
    link: AppLink;
}

// Context menu of a link, opened on right-click. Offers adding/editing the
// link label (handled by the edit interactions via the event bus).
export function LinkContextMenu() {

    const [menu, setMenu] = useState<MenuState | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const { paper } = usePaper();
    const selection = useSelectionCollection();

    useOnPaperEvents({
        onLinkContextMenu: ({ paper, model, event }) => {
            const { x, y } = paper.clientToLocalPoint(event.clientX!, event.clientY!);
            setMenu({ x, y, link: model as AppLink });
        },
        onCellPointerDown: () => setMenu(null),
        onBlankPointerDown: () => setMenu(null)
    });

    // Close on Escape or any pointerdown outside the menu.
    useEffect(() => {
        if (!menu) return;
        const onPointerDown = (evt: PointerEvent) => {
            if (!menuRef.current?.contains(evt.target as Node)) setMenu(null);
        };
        const onKeyDown = (evt: KeyboardEvent) => {
            if (evt.key === 'Escape') setMenu(null);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [menu]);

    if (!menu) return null;

    const onEditLabel = () => {
        setMenu(null);
        if (!paper) return;
        const linkView = paper.findViewByModel(menu.link);
        if (linkView) openLabelEditor(paper, selection, linkView);
    };

    return (
        <Overlay x={menu.x} y={menu.y}>
            <div ref={menuRef} className="context-menu">
                <button type="button" className="context-menu-item" onClick={onEditLabel}>
                    {menu.link.hasLabels() ? 'Edit Label' : 'Add Label'}
                </button>
            </div>
        </Overlay>
    );
}
