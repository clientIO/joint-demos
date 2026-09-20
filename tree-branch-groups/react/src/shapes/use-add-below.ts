import { useGraph } from '@joint/react-plus';
import type { dia } from '@joint/plus';
import type { MouseEvent } from 'react';

import { getAddChoices, getAddItems } from '../choices';
import type { AddChoice } from '../choices';
import { useEditor } from '../editor-context';

/**
 * The hook behind every button that adds below an element - the one
 * hanging below a leaf, the `+` of a decision or of the start of a fork:
 * a click opens the add menu for the parent, or, while a move is on, drops
 * the moved subtree below it. Hidden while a move is on that the parent
 * cannot take.
 */
export function useAddBelow(parentId: dia.Cell.ID | null): { hidden: boolean; title: string; onClick: (evt: MouseEvent) => void } {
    const editor = useEditor();
    const { graph } = useGraph();
    const parent = parentId === null ? undefined : (graph.getCell(parentId) as dia.Element | undefined);
    const moving = editor.moved !== null;
    const hidden = !parent || (moving && !editor.canDropBelow(parent));
    return {
        hidden,
        title: moving ? 'Move here' : 'Add below',
        onClick: (evt) => {
            if (!parent) return;
            if (moving) {
                editor.dropBelow(parent);
                return;
            }
            const anchor = (evt.currentTarget as HTMLElement).getBoundingClientRect();
            editor.openMenu({
                anchor,
                items: getAddItems(getAddChoices(parent)),
                onChoose: (choice) => editor.addBelow(parent, choice as AddChoice)
            });
        }
    };
}
