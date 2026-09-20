import { selectCellType, useCell } from '@joint/react-plus';
import type { ReactNode } from 'react';

import { AddButtonView } from './add-button-view';
import { DecisionView } from './decision-view';
import { GroupStartView } from './group-start-view';
import { StepView } from './step-view';
import { TerminalView } from './terminal-view';

/**
 * Picks the component of the element being rendered by the type of its
 * model (see `shapes.ts`). The end of a group and a group itself are not
 * React elements and never get here.
 */
export function Cell(): ReactNode {
    const type: string = useCell(selectCellType);
    switch (type) {
        case 'tbg.Step': return <StepView />;
        case 'tbg.Decision': return <DecisionView />;
        case 'tbg.GroupStart': return <GroupStartView />;
        case 'tbg.Start': return <TerminalView kind="start" />;
        case 'tbg.End': return <TerminalView kind="end" />;
        case 'tbg.AddButton': return <AddButtonView />;
        default: return null;
    }
}
