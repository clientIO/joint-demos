import { HTMLHost, selectElementData, useCell, useCellId } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { useEditor } from '../editor-context';
import { DECISION_ICON } from '../shapes';
import type { DecisionData } from '../shapes';
import { MoreButton, PlusIcon } from './buttons';
import { useAddBelow } from './use-add-below';
import { KindIcon } from './kind-icon';
import { TipButton } from '../tooltip';

/**
 * A decision: a filled pill with a diamond and, once it has an option, the
 * button at its right end that adds another; without one, it is a leaf with
 * the usual add button below.
 */
export function DecisionView(): ReactNode {
    const { label, hasOptions } = useCell(selectElementData<DecisionData>);
    const id = useCellId();
    const editor = useEditor();
    const add = useAddBelow(String(id));
    return (
        <HTMLHost className={`pill decision filled${editor.selectedId === id ? ' selected' : ''}`}>
            <KindIcon d={DECISION_ICON} />
            <span className="text"><span className="label">{label}</span></span>
            {hasOptions && !add.hidden ? (
                <TipButton tip={editor.moved ? 'Move here' : 'Add an option'} className="pill-add" onClick={add.onClick}>
                    <PlusIcon />
                </TipButton>
            ) : null}
            <MoreButton />
        </HTMLHost>
    );
}
