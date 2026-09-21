import type { dia } from '@joint/plus';
import { ElementModel, HTMLHost, selectElementData, useCell } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { MoreButton } from './buttons';
import { ELEMENT_Z, TERMINAL_SIZE, getTriggerIcon } from './constants';

export const START_TYPE = 'Start';
export const END_TYPE = 'End';

/** The React-facing state of the start: the trigger of the flow, if it names one (`pull_request`, `push`, `schedule: 0 6 * * 1`). */
export interface StartData {
    on?: string;
}

/** The start of the diagram, its root: a white circle with a dark outline, and the trigger of the flow on a chip to its left, if it names one. */
export class StartModel extends ElementModel {

    defaults() {
        return { ...super.defaults(), type: START_TYPE, z: ELEMENT_Z, size: TERMINAL_SIZE, data: {} satisfies StartData };
    }

    static create(on?: string): StartModel {
        return new StartModel({ data: (on ? { on } : {}) satisfies StartData });
    }

    /** The trigger of the flow, if the start names one. */
    getTrigger(): string | undefined {
        return (this.get('data') as StartData).on;
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

/**
 * The trigger of the flow, on a chip at the right of the start: `On <event>`
 * with the icon of the event. A grid item in a column of no width, aligned
 * to its start, so that it hangs out of the box `HTMLHost` measures (see
 * `index.css`).
 */
function Trigger({ on }: { on: string }): ReactNode {
    return (
        <span className="trigger">
            <svg viewBox="-8 -8 16 16" width="16" height="16" aria-hidden="true">
                <path d={getTriggerIcon(on)} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="on">On</span>
            <span>{on}</span>
        </span>
    );
}

/** The start of the diagram, a white circle with a dark outline (and its trigger, if any), or one of its ends, a dark one: their label inside. */
export function Terminal({ kind }: { kind: 'start' | 'end' }): ReactNode {
    const { on } = useCell(selectElementData<StartData>);
    return (
        <HTMLHost className={`terminal ${kind}`}>
            {kind === 'start' && on ? <Trigger on={on} /> : null}
            <span className="disc">
                <span className="label">{kind === 'start' ? 'Start' : 'End'}</span>
                <MoreButton />
            </span>
        </HTMLHost>
    );
}
