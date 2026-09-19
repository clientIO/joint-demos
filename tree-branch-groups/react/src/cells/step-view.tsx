import { HTMLHost, selectElementData, useCell, useCellId } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { useEditor } from '../editor-context';
import { NODE_ICON } from '../shapes';
import type { StepData } from '../shapes';
import { MoreButton } from './buttons';
import { KindIcon } from './kind-icon';

/**
 * A step: a pill with the card icon, its label and, below it, the command
 * it runs, as code. Its size is what this renders: `HTMLHost` measures the
 * content and sizes the element to it, the stylesheet keeps the pill at
 * least the size of a node.
 */
export function StepView(): ReactNode {
    const { label, run } = useCell(selectElementData<StepData>);
    const id = useCellId();
    const editor = useEditor();
    return (
        <HTMLHost className={`pill step${editor.selectedId === id ? ' selected' : ''}`}>
            <KindIcon d={NODE_ICON} />
            <span className="text">
                <span className="label">{label}</span>
                {run ? <code className="run">{run}</code> : null}
            </span>
            <MoreButton />
        </HTMLHost>
    );
}
