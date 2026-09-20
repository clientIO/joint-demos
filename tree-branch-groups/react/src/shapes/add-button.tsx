import type { dia } from '@joint/plus';
import { ElementModel, HTMLHost, useCellId, useGraph } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { TipButton } from '../components/tooltip';
import { PlusIcon } from './buttons';
import { ADD_BUTTON_SIZE, ELEMENT_Z } from './constants';
import { useAddBelow } from './use-add-below';

export const ADD_BUTTON_TYPE = 'AddButton';

/**
 * The add button below a leaf of the tree: an element of the graph, linked
 * from the leaf, so that the tree layout places it like a child. A click on
 * it opens the add menu for the leaf. Every element without a successor has
 * one - a step, or a group nothing follows; it goes away as soon as the
 * element gets a child. The buttons are derived by the build (see `data/build.ts`).
 */
export class AddButtonModel extends ElementModel {

    defaults() {
        return { ...super.defaults(), type: ADD_BUTTON_TYPE, z: ELEMENT_Z, size: ADD_BUTTON_SIZE };
    }

    static isAddButton(cell: dia.Cell): cell is AddButtonModel {
        return cell instanceof AddButtonModel;
    }
}

/**
 * The add button below a leaf: a square plus. A click opens the add menu
 * for the leaf - or, while a move is on, drops the moved subtree below it.
 */
export function AddButton(): ReactNode {
    const id = useCellId();
    const { graph } = useGraph();
    const [parent] = graph.getNeighbors(graph.getCell(id) as dia.Element, { inbound: true });
    const add = useAddBelow(parent ? parent.id : null);
    return (
        <HTMLHost className="add-button-host">
            <TipButton tip={add.title} className="square-button" onClick={add.onClick}>
                <PlusIcon />
            </TipButton>
        </HTMLHost>
    );
}
