import { ui } from '@joint/plus';

import type { GroupKind } from './shapes';

/** What the menu offers to add: a plain node, or a group of either kind. */
export type AddChoice = 'node' | GroupKind;

/**
 * Opens a small vertical menu right below `target` - the plus button of a
 * group - with the three things that can be added below the group. Closes on
 * a choice, or on a click anywhere else. Only one menu is open at a time.
 */
export function openAddMenu(target: HTMLElement | SVGElement, onChoose: (choice: AddChoice) => void): void {
    ui.ContextToolbar.close();
    const menu = new ui.ContextToolbar({
        target,
        vertical: true,
        autoClose: true,
        padding: 6,
        tools: [
            { action: 'node', content: 'Node' },
            { action: 'branch', content: 'Branch' },
            { action: 'cycle', content: 'Loop' }
        ]
    });
    for (const choice of ['node', 'branch', 'cycle'] as const) {
        menu.on(`action:${choice}`, () => {
            menu.remove();
            onChoose(choice);
        });
    }
    menu.render();
}
