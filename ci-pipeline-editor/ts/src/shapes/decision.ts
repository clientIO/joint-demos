import { dia, util } from '@joint/plus';

import { ADD_BUTTON_SELECTOR, DECISION_ICON } from './constants';
import { ADD_BUTTON_ATTRS, FILLED_PILL_ATTRS, addButtonMarkup, pillDefaults, pillMarkup, setPillLabel } from './pill';

/**
 * A decision: a node of the tree that branches out - without a merge,
 * unlike a fork. A filled pill with a diamond and, at its right end, the
 * button that adds an option (shown once it has one, see
 * `setAddButtonVisible()`; with none it is a leaf with the usual add button
 * below).
 */
export class DecisionModel extends dia.Element {

    preinitialize() {
        this.markup = [...pillMarkup, ...addButtonMarkup];
    }

    defaults() {
        return pillDefaults('tbg.Decision', {
            attrs: util.defaultsDeep({
                kindIcon: { d: DECISION_ICON },
                [ADD_BUTTON_SELECTOR]: { dataTooltip: 'Add an option' }
            }, FILLED_PILL_ATTRS, ADD_BUTTON_ATTRS)
        }, super.defaults);
    }

    static create(label: string): DecisionModel {
        const decision = new DecisionModel();
        setPillLabel(decision, label);
        return decision;
    }

    setAddButtonVisible(visible: boolean): void {
        this.attr({
            [ADD_BUTTON_SELECTOR]: { display: visible ? null : 'none' },
            addIcon: { display: visible ? null : 'none' }
        });
    }

    static isDecision(cell: dia.Cell): cell is DecisionModel {
        return cell instanceof DecisionModel;
    }
}
