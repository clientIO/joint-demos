import { dia, util } from '@joint/plus';

import { ADD_BUTTON_SIZE, COLORS, DROP_POINT_SIZE, ELEMENT_Z, PLUS_ICON } from './constants';

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
        // The ring that pulses behind the button while the button is a drop point (see the stylesheet); hidden otherwise.
        this.markup = util.svg/* xml */`
            <rect @selector="pulse" class="pulse"/>
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
                pulse: {
                    display: 'none',
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 3,
                    ry: 3
                },
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 3,
                    ry: 3,
                    fill: COLORS.button.fill,
                    stroke: COLORS.button.outline,
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

    /**
     * Makes the button a drop point, or a plain button again: a drop point is
     * drawn larger around the center of the element - whose own size, what the
     * layout goes by, stays - with the ring that pulses behind it.
     */
    setDropPoint(active: boolean): void {
        const { width, height } = ADD_BUTTON_SIZE;
        const size = active ? DROP_POINT_SIZE : width;
        const box = { x: (width - size) / 2, y: (height - size) / 2, width: size, height: size };
        this.attr({
            pulse: { ...box, display: active ? null : 'none' },
            body: box,
            icon: { transform: `translate(calc(w / 2), calc(h / 2)) scale(${size / width})` }
        });
    }

    static isAddButton(cell: dia.Cell): cell is AddButtonModel {
        return cell instanceof AddButtonModel;
    }
}
