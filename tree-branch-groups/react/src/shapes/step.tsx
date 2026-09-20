import type { dia } from '@joint/plus';
import { ElementModel, HTMLHost, selectElementData, useCell, useCellId } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { useEditor } from '../editor-context';
import { MoreButton } from './buttons';
import { ELEMENT_Z, NODE_ICON, NODE_SIZE } from './constants';
import { KindIcon } from './kind-icon';

/*
    A step of the flow: its model and its component. The model is an
    `ElementModel` of `@joint/react`: a cell whose view is a portal for the
    component, with what the component renders in `data`. It carries no
    markup and no attributes of its own; its size is measured from what the
    component renders (so are all the pills, see `HTMLHost`).
*/

/** The type of the model, the key of `ElementContent` (see `element-content.tsx`). */
export const STEP_TYPE = 'Step';

/** The React-facing state of a step: its label and, as the case may be, the command it runs. */
export interface StepData {
    label: string;
    run?: string;
}

/** A step of the flow: a pill with a label and, below it, the command it runs. */
export class StepModel extends ElementModel {

    defaults() {
        return { ...super.defaults(), type: STEP_TYPE, z: ELEMENT_Z, size: NODE_SIZE };
    }

    static create(label: string, run?: string): StepModel {
        const data: StepData = run ? { label, run } : { label };
        return new StepModel({ data });
    }

    static isStep(cell: dia.Cell): cell is StepModel {
        return cell instanceof StepModel;
    }
}

/** A piece of a command line: the program, a flag, or anything else. */
type Token = { text: string; kind: 'cmd' | 'flag' | 'plain' };

/** Splits a command line into its program, its flags and the rest, whitespace kept. No grammar: a command line is a program and its arguments. */
function tokenize(run: string): Token[] {
    let program = true;
    return run.split(/(\s+)/).map((text) => {
        if (text.trim() === '') return { text, kind: 'plain' };
        if (program) {
            program = false;
            return { text, kind: 'cmd' };
        }
        return { text, kind: text.startsWith('-') ? 'flag' : 'plain' };
    });
}

/** The command a step runs, as a line of code on a chip: the program in bold, its flags tinted. */
function RunLine({ run }: { run: string }): ReactNode {
    return (
        <code className="run">
            {tokenize(run).map((token, index) => (token.kind === 'plain' ? token.text : <span key={index} className={token.kind}>{token.text}</span>))}
        </code>
    );
}

/**
 * A step: a pill with the card icon, its label and, below it, the command
 * it runs, as code. Its size is what this renders: `HTMLHost` measures the
 * content and sizes the element to it, the stylesheet keeps the pill at
 * least the size of a node.
 */
export function Step(): ReactNode {
    const { label, run } = useCell(selectElementData<StepData>);
    const id = useCellId();
    const editor = useEditor();
    return (
        <HTMLHost className={`pill step${editor.selectedId === id ? ' selected' : ''}`}>
            <KindIcon d={NODE_ICON} />
            <span className="text">
                <span className="label">{label}</span>
                {run ? <RunLine run={run} /> : null}
            </span>
            <MoreButton />
        </HTMLHost>
    );
}
