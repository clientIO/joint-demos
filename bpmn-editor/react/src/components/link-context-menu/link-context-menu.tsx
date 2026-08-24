import { useEffect, useRef, useState } from 'react';
import { g } from '@joint/plus';
import { Overlay, usePaper, useSelectionCollection, useOnPaperEvents } from '@joint/react-plus';
import { openLabelEditor } from '../../actions/label-editor';
import { Annotation, AnnotationLink } from '../../shapes/annotation/annotation-shapes';

import type { dia } from '@joint/plus';
import type { AppLink, LinkContextMenuAction } from '../../shapes/shapes-typing';
import './link-context-menu.css';

interface MenuState {
    // Local (graph) coordinates.
    x: number;
    y: number;
    link: AppLink;
}

/**
 * Context menu of a link, opened on right-click: add/edit the link label,
 * attach a comment to the link.
 */
export function LinkContextMenu() {

    const [menu, setMenu] = useState<MenuState | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    const { paper } = usePaper();
    const selection = useSelectionCollection();

    useOnPaperEvents({
        onLinkContextMenu: ({ paper, model, event }) => {
            const link = model as AppLink;
            // The link decides what its context menu offers.
            if (link.getContextMenuActions().length === 0) return;
            const { x, y } = paper.clientToLocalPoint(event.clientX!, event.clientY!);
            setMenu({ x, y, link });
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

    const onAddComment = () => {
        setMenu(null);
        if (!paper) return;

        const { link, x, y } = menu;
        const linkView = paper.findViewByModel(link) as dia.LinkView;
        if (!linkView) return;

        const graph = paper.model;
        const batchName = 'add-comment';

        graph.startBatch(batchName);

        const annotation = new Annotation({ position: { x: x + 40, y: y - 120 }});
        const annotationLink = new AnnotationLink({
            source: { id: annotation.id },
            // Pin the connection to the right-clicked point of the link.
            target: {
                id: link.id,
                anchor: {
                    name: 'connectionLength',
                    args: { length: linkView.getClosestPointLength(new g.Point(x, y)) }
                }
            }
        });
        graph.addCells([annotation, annotationLink]);

        graph.stopBatch(batchName);

        // Select the comment and let the user type it right away (the view
        // renders asynchronously).
        selection.collection.reset([annotation]);
        paper.once('render:done', () => {
            const annotationView = paper.findViewByModel(annotation);
            if (annotationView) openLabelEditor(paper, selection, annotationView);
        });
    };

    const menuItems: Record<LinkContextMenuAction, { content: string; onClick: () => void }> = {
        'edit-label': {
            content: menu.link.hasLabels() ? 'Edit Label' : 'Add Label',
            onClick: onEditLabel
        },
        'add-comment': {
            content: 'Add Comment',
            onClick: onAddComment
        }
    };

    return (
        <Overlay x={menu.x} y={menu.y}>
            <div ref={menuRef} className="context-menu">
                {menu.link.getContextMenuActions().map((action) => {
                    const { content, onClick } = menuItems[action];
                    return (
                        <button key={action} type="button" className="context-menu-item" onClick={onClick}>
                            {content}
                        </button>
                    );
                })}
            </div>
        </Overlay>
    );
}
