/*
    The shapes of the diagram: one module per kind, with its model - the
    pills share their markup and attributes (`pill.ts`) - and the constants
    they share with the layout and the tools (`constants.ts`).
*/

export * from './constants';
export { AddButtonModel } from './add-button';
export { DecisionModel } from './decision';
export { GroupEndModel, GroupModel, GroupStartModel, isGate } from './group';
export type { Gate } from './group';
export { BRANCH_LABEL_OFFSET_ALONG, LinkModel } from './link';
export { StepModel } from './step';
export { EndModel, StartModel } from './terminals';

import { AddButtonModel } from './add-button';
import { DecisionModel } from './decision';
import { GroupEndModel, GroupModel, GroupStartModel } from './group';
import { LinkModel } from './link';
import { StepModel } from './step';
import { EndModel, StartModel } from './terminals';

export const cellNamespace = {
    tbg: { Step: StepModel, Decision: DecisionModel, Start: StartModel, End: EndModel, GroupStart: GroupStartModel, GroupEnd: GroupEndModel, Group: GroupModel, AddButton: AddButtonModel, Link: LinkModel }
};
