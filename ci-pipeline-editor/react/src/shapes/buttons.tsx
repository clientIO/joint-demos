import type { dia } from '@joint/plus';
import { useGraph } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { canDelete, getActionTarget, getDeleteTitle } from '../actions';
import type { MenuRequest } from '../components/menu';
import { TipButton } from '../components/tooltip';
import { useEditor } from '../editor-context';
import type { EditorApi } from '../editor-context';
import { COLORS } from './constants';
import { useCellModel } from './use-cell-model';

/** A plus, in the size of the buttons: the add button below a leaf, the button of a pill. */
export function PlusIcon(): ReactNode {
    return (
        <svg viewBox="-9 -9 18 18" width="18" height="18" aria-hidden="true">
            <path d="M -4 0 4 0 M 0 -4 0 4" stroke="currentColor" strokeWidth={2} fill="none" />
        </svg>
    );
}

/** The "move to" item of the menu of an element: an arrow out and down, in the teal of a move. */
const MOVE_ICON = 'M -6 -6 V 6 H 6 M 6 6 L 2 2 M 6 6 L 2 10';
/** The "remove" item: a cross, in red. */
const DELETE_ICON = 'M -5 -5 5 5 M -5 5 5 -5';
const DELETE_COLOR = 'var(--red)';

/**
 * The "more" button of the element being rendered: three dots at its top
 * right, shown on hover; a click opens the menu of the element - its move
 * and its removal; hovering the "remove" item highlights what it would
 * remove. Nothing when the element cannot be deleted, or while a move is on.
 * On a filled pill the dots are white (`filled`).
 */
export function MoreButton({ filled = false }: { filled?: boolean }): ReactNode {
    const editor = useEditor();
    const { graph } = useGraph();
    const model = useCellModel();
    if (!model.isElement() || editor.moved) return null;
    const target = getActionTarget(model);
    if (!target || !canDelete(graph, target)) return null;
    return (
        <TipButton
            tip="More"
            className={`more${filled ? ' on-filled' : ''}`}
            onClick={(evt) => editor.openMenu(getElementMenu(editor, target, (evt.currentTarget as HTMLElement).getBoundingClientRect()))}
        >
            <span className="dots" aria-hidden="true" />
        </TipButton>
    );
}

/**
 * The menu of an element, acting on `target` (see `getActionTarget()`),
 * below `anchor` - the "more" button, or the pointer of a right click: its
 * move and its removal; hovering an item shows what it would do.
 */
export function getElementMenu(editor: EditorApi, target: dia.Element, anchor: DOMRect): MenuRequest {
    return {
        anchor,
        items: [
            // Greyed out when there is nowhere to move the element to.
            { action: 'move', label: 'Move to…', icon: MOVE_ICON, color: COLORS.move, disabled: !editor.canMove(target) },
            { action: 'remove', label: getDeleteTitle(target), icon: DELETE_ICON, color: DELETE_COLOR }
        ],
        onChoose: (action) => (action === 'move' ? editor.startMove(target) : editor.remove(target)),
        // The hovered item shows what it would do: "remove" turns the cells red, "move" marks what would move.
        onHover: (action) => {
            editor.previewDeletion(action === 'remove' ? target : null);
            editor.previewMove(action === 'move' ? target : null);
        }
    };
}
