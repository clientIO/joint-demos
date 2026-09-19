import { ui } from '@joint/plus';

import { COLORS, DECISION_ICON, GROUP_ICONS, NODE_ICON } from './shapes';
import type { GroupKind } from './shapes';

/** What the add menu offers: a plain node, a decision, a group of either kind, or an end of the diagram. */
export type AddChoice = 'node' | 'decision' | GroupKind | 'end';

/** An item of a menu: an icon, drawn the way the nodes draw theirs, and a label. */
export interface MenuItem<A extends string> {
    action: A;
    label: string;
    icon: string;
    color: string;
    /** Shown, but not to be chosen: greyed out. */
    disabled?: boolean;
}

interface MenuHandlers<A extends string> {
    onChoose: (action: A) => void;
    /** Called with the hovered item, and with `null` when the pointer leaves it. */
    onHover?: (action: A | null) => void;
}

function renderItem<A extends string>({ label, icon, color }: MenuItem<A>): string {
    return `
        <svg viewBox="-10 -10 20 20" width="18" height="18" aria-hidden="true">
            <path d="${icon}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>${label}</span>
    `;
}

/**
 * Opens a small vertical menu next to `target` with `items`. Closes on a
 * choice, or on a click anywhere else. Only one menu is open at a time.
 * Styled by `styles.css` through its `data-type`.
 */
export function openMenu<A extends string>(target: HTMLElement | SVGElement, items: MenuItem<A>[], { onChoose, onHover }: MenuHandlers<A>): void {
    ui.ContextToolbar.close();
    const menu = new ui.ContextToolbar({
        target,
        type: 'menu',
        vertical: true,
        autoClose: true,
        padding: 8,
        tools: items.map((item) => ({ action: item.action, content: renderItem(item), attrs: item.disabled ? { disabled: 'disabled' } : {}}))
    });
    for (const { action, disabled } of items) {
        if (disabled) continue;
        menu.on(`action:${action}`, () => {
            onHover?.(null);
            menu.remove();
            onChoose(action);
        });
    }
    menu.render();
    if (onHover) {
        for (const button of Array.from(menu.el.querySelectorAll<HTMLElement>('.tool[data-action]'))) {
            button.addEventListener('mouseenter', () => onHover(button.dataset.action as A));
            button.addEventListener('mouseleave', () => onHover(null));
        }
    }
}

const ADD_ITEMS: Record<AddChoice, Omit<MenuItem<AddChoice>, 'action'>> = {
    node: { label: 'Node', icon: NODE_ICON, color: COLORS.node.stroke },
    decision: { label: 'Decision', icon: DECISION_ICON, color: COLORS.node.stroke },
    fork: { label: 'Fork', icon: GROUP_ICONS.fork, color: COLORS.node.stroke },
    loop: { label: 'Loop', icon: GROUP_ICONS.loop, color: COLORS.node.stroke },
    end: { label: 'End', icon: NODE_ICON, color: COLORS.terminal }
};

/** The add menu: next to the plus button of a leaf, of a decision, of a fork or of a link, with what can be added there. */
export function openAddMenu(target: HTMLElement | SVGElement, choices: AddChoice[], onChoose: (choice: AddChoice) => void): void {
    openMenu(target, choices.map((action) => ({ action, ...ADD_ITEMS[action] })), { onChoose });
}
