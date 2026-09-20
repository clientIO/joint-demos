import type { dia } from '@joint/plus';
import { ElementModel, HTMLHost, selectElementData, useCell, useCellId } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { useEditor } from '../editor-context';
import { TipButton } from '../components/tooltip';
import { MoreButton, PlusIcon } from './buttons';
import { DECISION_ICON, DECISION_LABEL, ELEMENT_Z, NODE_SIZE } from './constants';
import { KindIcon } from './kind-icon';
import { useAddBelow } from './use-add-below';

export const DECISION_TYPE = 'Decision';

/** The React-facing state of a decision: its label, and whether it has options - then its pill carries the button that adds another. */
export interface DecisionData {
    label: string;
    hasOptions: boolean;
}

/** A decision: a node of the tree that branches out - without a merge, unlike a fork. A filled pill with a diamond. */
export class DecisionModel extends ElementModel {

    defaults() {
        return { ...super.defaults(), type: DECISION_TYPE, z: ELEMENT_Z, size: NODE_SIZE };
    }

    static create(label: string = DECISION_LABEL, hasOptions: boolean = false): DecisionModel {
        const data: DecisionData = { label, hasOptions };
        return new DecisionModel({ data });
    }

    static isDecision(cell: dia.Cell): cell is DecisionModel {
        return cell instanceof DecisionModel;
    }
}

/**
 * A decision: a filled pill with a diamond and, once it has an option, the
 * button at its right end that adds another; without one, it is a leaf with
 * the usual add button below.
 */
export function Decision(): ReactNode {
    const { label, hasOptions } = useCell(selectElementData<DecisionData>);
    const id = useCellId();
    const editor = useEditor();
    const add = useAddBelow(id);
    return (
        <HTMLHost className="pill decision filled">
            <KindIcon d={DECISION_ICON} />
            <span className="text"><span className="label">{label}</span></span>
            {hasOptions && !add.hidden ? (
                <TipButton tip={editor.moved ? 'Move here' : 'Add an option'} className="pill-add" onClick={add.onClick}>
                    <PlusIcon />
                </TipButton>
            ) : null}
            <MoreButton filled />
        </HTMLHost>
    );
}
