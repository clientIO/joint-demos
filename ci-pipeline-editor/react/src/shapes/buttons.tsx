import type { dia } from '@joint/plus';
import { useGraph } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { canRemoveBranch, canRemoveNode, getActionTarget, getMoveTitle, getRemoveTitle, hasBranch } from '../actions';
import type { MoveScope } from '../actions';
import type { MenuRequest } from '../components/menu';
import { TipButton } from '../components/tooltip';
import { useEditor } from '../editor-context';
import type { EditorApi } from '../editor-context';
import { COLORS } from './constants';
import { useCellModel } from './use-cell-model';

/** The plus every add button is marked with. */
export const PLUS_PATH = 'M -4 0 4 0 M 0 -4 0 4';

/** A plus, in the size of the buttons: the add button below a leaf, the button of a pill. */
export function PlusIcon(): ReactNode {
    return (
        <svg viewBox="-9 -9 18 18" width="18" height="18" aria-hidden="true">
            <path d={PLUS_PATH} stroke="currentColor" strokeWidth={2} fill="none" />
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
    if (!target || !canRemoveBranch(graph, target)) return null;
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

/** The items of the menu of an element: a move or a removal, of the element alone or of the branch below it. */
type ElementAction = 'move' | 'remove' | 'move-branch' | 'remove-branch';

/** What each item does: start a move, or remove - and how much it takes along. */
const ELEMENT_ACTIONS: Record<ElementAction, { moves: boolean; scope: MoveScope }> = {
    'move': { moves: true, scope: 'node' },
    'remove': { moves: false, scope: 'node' },
    'move-branch': { moves: true, scope: 'branch' },
    'remove-branch': { moves: false, scope: 'branch' }
};

/**
 * The menu of an element, acting on `target` (see `getActionTarget()`),
 * below `anchor` - the "more" button, or the pointer of a right click: it
 * moves or removes the element alone - its children move up in its place -
 * or the branch below it along with it. An item that cannot be chosen is
 * greyed out: nowhere to move to, nothing below it, or children its parent
 * could not take. Hovering an item shows what it would do.
 */
export function getElementMenu(editor: EditorApi, target: dia.Element, anchor: DOMRect): MenuRequest {
    const { graph } = editor;
    const branch = hasBranch(graph, target);
    return {
        anchor,
        items: [
            { action: 'move', label: getMoveTitle('node'), icon: MOVE_ICON, color: COLORS.move, disabled: !editor.canMove(target, 'node') },
            { action: 'remove', label: getRemoveTitle(target, 'node'), icon: DELETE_ICON, color: DELETE_COLOR, disabled: !canRemoveNode(graph, target) },
            { action: 'move-branch', label: getMoveTitle('branch'), icon: MOVE_ICON, color: COLORS.move, disabled: !branch || !editor.canMove(target, 'branch') },
            { action: 'remove-branch', label: getRemoveTitle(target, 'branch'), icon: DELETE_ICON, color: DELETE_COLOR, disabled: !branch || !canRemoveBranch(graph, target) }
        ],
        onChoose: (action) => {
            const { moves, scope } = ELEMENT_ACTIONS[action as ElementAction];
            if (moves) editor.startMove(target, scope); else editor.remove(target, scope);
        },
        // The hovered item shows what it would do: a removal turns the cells red, a move marks what would move.
        onHover: (action) => {
            const item = action === null ? null : ELEMENT_ACTIONS[action as ElementAction];
            editor.previewDeletion(item && !item.moves ? target : null, item?.scope ?? 'node');
            editor.previewMove(item?.moves ? target : null, item?.scope ?? 'node');
        }
    };
}
