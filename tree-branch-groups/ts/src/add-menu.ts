import { ui } from '@joint/plus';

import { COLORS, DECISION_ICON, GROUP_ICONS, NODE_ICON } from './shapes';
import type { GroupKind } from './shapes';

/** What the menu offers to add: a plain node, a decision, a group of either kind, or an end of the diagram. */
export type AddChoice = 'node' | 'decision' | GroupKind | 'end';

/** The label and the icon of every choice; the icons are those the nodes wear. */
const ITEMS: Record<AddChoice, { label: string; icon: string; color: string }> = {
    node: { label: 'Node', icon: NODE_ICON, color: COLORS.node.stroke },
    decision: { label: 'Decision', icon: DECISION_ICON, color: COLORS.node.stroke },
    fork: { label: 'Fork', icon: GROUP_ICONS.fork, color: COLORS.node.stroke },
    loop: { label: 'Loop', icon: GROUP_ICONS.loop, color: COLORS.node.stroke },
    end: { label: 'End', icon: NODE_ICON, color: COLORS.terminal }
};

/** The content of a menu item: the icon, drawn the way the nodes draw it, and the label. */
function renderItem(choice: AddChoice): string {
    const { label, icon, color } = ITEMS[choice];
    return `
        <svg viewBox="-10 -10 20 20" width="18" height="18" aria-hidden="true">
            <path d="${icon}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>${label}</span>
    `;
}

/**
 * Opens a small vertical menu next to `target` - the plus button of a group
 * or the "add" tool of a node - with the things that can be added there.
 * Closes on a choice, or on a click anywhere else. Only one menu is open at
 * a time. Styled by `styles.css` through its `data-type`.
 */
export function openAddMenu(target: HTMLElement | SVGElement, choices: AddChoice[], onChoose: (choice: AddChoice) => void): void {
    ui.ContextToolbar.close();
    const menu = new ui.ContextToolbar({
        target,
        type: 'add-menu',
        vertical: true,
        autoClose: true,
        padding: 8,
        tools: choices.map((choice) => ({ action: choice, content: renderItem(choice) }))
    });
    for (const choice of choices) {
        menu.on(`action:${choice}`, () => {
            menu.remove();
            onChoose(choice);
        });
    }
    menu.render();
}
