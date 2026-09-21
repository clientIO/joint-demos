import { selectCellType, useCell } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { ADD_BUTTON_TYPE, AddButton } from './add-button';
import { DECISION_TYPE, Decision } from './decision';
import { GROUP_START_TYPE, GroupStart } from './group';
import { STEP_TYPE, Step } from './step';
import { END_TYPE, START_TYPE, Terminal } from './terminals';

/**
 * What React renders for an element: the component picked by the type of its
 * model. The end of a group and a group itself are not React elements and
 * never get here.
 */
export function ElementContent(): ReactNode {
    const type: string = useCell(selectCellType);
    switch (type) {
        case STEP_TYPE: return <Step />;
        case DECISION_TYPE: return <Decision />;
        case GROUP_START_TYPE: return <GroupStart />;
        case START_TYPE: return <Terminal kind="start" />;
        case END_TYPE: return <Terminal kind="end" />;
        case ADD_BUTTON_TYPE: return <AddButton />;
        default: return null;
    }
}
