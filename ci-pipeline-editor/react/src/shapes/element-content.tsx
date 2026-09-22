import { selectCellType, useCell } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { useCellMark } from '../editor-context';
import { ADD_BUTTON_TYPE, AddButton } from './add-button';
import { DECISION_TYPE, Decision } from './decision';
import { GROUP_START_TYPE, GroupStart } from './group';
import { SelectionFrame } from './selection-frame';
import { STEP_TYPE, Step } from './step';
import { END_TYPE, START_TYPE, Terminal } from './terminals';

/** The component of an element, picked by the type of its model, with the frame of the selection under it for the elements that can be selected. */
function ElementByType({ type }: { type: string }): ReactNode {
    switch (type) {
        case STEP_TYPE: return <><SelectionFrame shape="box" /><Step /></>;
        case DECISION_TYPE: return <><SelectionFrame shape="round" /><Decision /></>;
        case GROUP_START_TYPE: return <><SelectionFrame shape="round" /><GroupStart /></>;
        case START_TYPE: return <><SelectionFrame shape="round" /><Terminal kind="start" /></>;
        case END_TYPE: return <><SelectionFrame shape="round" /><Terminal kind="end" /></>;
        case ADD_BUTTON_TYPE: return <AddButton />;
        default: return null;
    }
}

/**
 * What React renders for an element: its component, in a group that wears
 * the element's mark as a class - a preview, a move in progress - for the
 * stylesheet to paint (see `useCellMark()`). The end of a group and a
 * group itself are not React elements and never get here.
 */
export function ElementContent(): ReactNode {
    const type: string = useCell(selectCellType);
    const mark = useCellMark();
    return <g className={mark ?? ''}><ElementByType type={type} /></g>;
}
