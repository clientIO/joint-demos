import type { dia } from '@joint/plus';

import { canAddTerminal } from './actions';
import type { MenuItem } from './components/menu';
// The constants, not the shapes: this module is imported by the shapes themselves, and reads the constants at its top level.
import { COLORS, DECISION_ICON, GROUP_ICONS, NODE_ICON } from './shapes/constants';
import type { GroupKind } from './shapes/constants';

/*
    The add menu: what can be added where, and the items that offer it.
*/

/** What the add menu offers: a step, a decision, a group of either kind, or an end of the diagram. */
export type AddChoice = 'step' | 'decision' | GroupKind | 'end';

const ADD_ITEMS: Record<AddChoice, Omit<MenuItem, 'action'>> = {
    step: { label: 'Step', icon: NODE_ICON, color: COLORS.node.stroke },
    decision: { label: 'Decision', icon: DECISION_ICON, color: COLORS.node.stroke },
    fork: { label: 'Fork', icon: GROUP_ICONS.fork, color: COLORS.node.stroke },
    loop: { label: 'Loop', icon: GROUP_ICONS.loop, color: COLORS.node.stroke },
    end: { label: 'End', icon: NODE_ICON, color: COLORS.terminal }
};

/** The items of the add menu for `choices`. */
export function getAddItems(choices: AddChoice[]): MenuItem[] {
    return choices.map((action) => ({ action, ...ADD_ITEMS[action] }));
}

/** What can be inserted anywhere: a step, a decision, a fork, a loop. */
export const INSERT_CHOICES: AddChoice[] = ['step', 'decision', 'fork', 'loop'];

/** What can be added below `parent`: everything, and an end of the diagram outside of a group. */
export function getAddChoices(parent: dia.Element): AddChoice[] {
    return canAddTerminal(parent) ? [...INSERT_CHOICES, 'end'] : INSERT_CHOICES;
}
