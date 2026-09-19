import { useCellId, useGraph } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { canDelete } from '../actions';
import { useEditor } from '../editor-context';
import { COLORS, Decision, GroupStart } from '../shapes';
import { getActionTarget, getDeleteTitle } from '../tools';
import { TipButton } from '../tooltip';

/** A plus, in the size of the buttons: the add button below a leaf, the button of a pill. */
export function PlusIcon(): ReactNode {
    return (
        <svg viewBox="-9 -9 18 18" width="18" height="18" aria-hidden="true">
            <path d="M -4 0 4 0 M 0 -4 0 4" stroke="currentColor" strokeWidth={2} fill="none" />
        </svg>
    );
}

/** The "move to" item of the menu of an element: an arrow out and down. */
const MOVE_ICON = 'M -6 -6 V 6 H 6 M 6 6 L 2 2 M 6 6 L 2 10';
/** The "remove" item: a cross, in red. */
const DELETE_ICON = 'M -5 -5 5 5 M -5 5 5 -5';
const DELETE_COLOR = '#E54666';

/**
 * The "more" button of the element being rendered: three dots at its top
 * right, shown on hover; a click opens the menu of the element - its move
 * and its removal; hovering the "remove" item highlights what it would
 * remove. Nothing when the element cannot be deleted, or while a move is on.
 */
export function MoreButton(): ReactNode {
    const editor = useEditor();
    const { graph } = useGraph();
    const id = useCellId();
    const element = graph.getCell(id);
    if (!element?.isElement() || editor.moved) return null;
    const target = getActionTarget(element);
    if (!target || !canDelete(graph, target)) return null;
    // On a filled pill the dots are white.
    const filled = Decision.isDecision(element) || GroupStart.isGroupStart(element);
    return (
        <TipButton
            tip="More"
            className={`more${filled ? ' on-filled' : ''}`}
            onClick={(evt) => {
                const anchor = (evt.currentTarget as HTMLElement).getBoundingClientRect();
                editor.openMenu({
                    anchor,
                    items: [
                        // Greyed out when there is nowhere to move the element to.
                        { action: 'move', label: 'Move to…', icon: MOVE_ICON, color: COLORS.node.stroke, disabled: !editor.canMove(target) },
                        { action: 'remove', label: getDeleteTitle(target), icon: DELETE_ICON, color: DELETE_COLOR }
                    ],
                    onChoose: (action) => (action === 'move' ? editor.startMove(target) : editor.remove(target)),
                    onHover: (action) => editor.previewDeletion(action === 'remove' ? target : null)
                });
            }}
        >
            <span className="dots" aria-hidden="true" />
        </TipButton>
    );
}
