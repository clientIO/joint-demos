import type { dia } from '@joint/plus';
import { ElementModel, HTMLHost, useCellId } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { useEditor } from '../editor-context';
import { MoreButton } from './buttons';
import { ELEMENT_Z, TERMINAL_SIZE } from './constants';

export const START_TYPE = 'Start';
export const END_TYPE = 'End';

/** The start of the diagram, its root: a white circle with a dark outline. */
export class StartModel extends ElementModel {

    defaults() {
        return { ...super.defaults(), type: START_TYPE, z: ELEMENT_Z, size: TERMINAL_SIZE };
    }

    static create(): StartModel {
        return new StartModel();
    }

    static isStart(cell: dia.Cell): cell is StartModel {
        return cell instanceof StartModel;
    }
}

/** An end of the diagram: a dark circle, a leaf nothing can follow. */
export class EndModel extends ElementModel {

    defaults() {
        return { ...super.defaults(), type: END_TYPE, z: ELEMENT_Z, size: TERMINAL_SIZE };
    }

    static create(): EndModel {
        return new EndModel();
    }

    static isEnd(cell: dia.Cell): cell is EndModel {
        return cell instanceof EndModel;
    }
}

/** The start of the diagram, a white circle with a dark outline, or one of its ends, a dark one: their label inside. */
export function Terminal({ kind }: { kind: 'start' | 'end' }): ReactNode {
    const id = useCellId();
    const editor = useEditor();
    return (
        <HTMLHost className={`terminal ${kind}${editor.selectedId === id ? ' selected' : ''}`}>
            <span className="label">{kind === 'start' ? 'Start' : 'End'}</span>
            <MoreButton />
        </HTMLHost>
    );
}
