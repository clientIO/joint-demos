import { HTMLHost, useCellId, useGraph } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { PlusIcon } from './buttons';
import { TipButton } from '../tooltip';
import { useAddBelow } from './use-add-below';

/**
 * The add button below a leaf: a square plus. A click opens the add menu
 * for the leaf - or, while a move is on, drops the moved subtree below it.
 */
export function AddButtonView(): ReactNode {
    const id = useCellId();
    const { graph } = useGraph();
    const [parent] = graph.getNeighbors(graph.getCell(id) as import('@joint/plus').dia.Element, { inbound: true });
    const add = useAddBelow(parent ? String(parent.id) : '');
    return (
        <HTMLHost className="add-button-host">
            <TipButton tip={add.title} className="square-button" onClick={add.onClick}>
                <PlusIcon />
            </TipButton>
        </HTMLHost>
    );
}
