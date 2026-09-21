import { dia, util } from '@joint/plus';

import { ADD_BUTTON_SIZE, COLORS, ELEMENT_Z, PLUS_ICON } from './constants';

/**
 * The add button below a leaf of the tree: an element of the graph, linked
 * from the leaf, so that the tree layout places it like a child. A click on
 * it opens the add menu for the leaf. Every element without a successor has
 * one - a plain node, or a group nothing follows (its button hangs from its
 * `end`); it goes away as soon as the element gets a real child. The buttons
 * are derived by the build (see `data/build.ts`).
 */
export class AddButtonModel extends dia.Element {

    preinitialize() {
        this.markup = util.svg/* xml */`
            <rect @selector="body"/>
            <path @selector="icon"/>
        `;
    }

    defaults() {
        return util.defaultsDeep({
            type: 'tbg.AddButton',
            z: ELEMENT_Z,
            size: ADD_BUTTON_SIZE,
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 3,
                    ry: 3,
                    fill: COLORS.button.fill,
                    stroke: COLORS.button.text,
                    strokeWidth: 1.5,
                    cursor: 'pointer',
                    dataTooltip: 'Add below'
                },
                icon: {
                    d: PLUS_ICON,
                    transform: 'translate(calc(w / 2), calc(h / 2))',
                    stroke: COLORS.button.text,
                    strokeWidth: 2,
                    fill: 'none',
                    pointerEvents: 'none'
                }
            }
        }, super.defaults);
    }

    static isAddButton(cell: dia.Cell): cell is AddButtonModel {
        return cell instanceof AddButtonModel;
    }
}
