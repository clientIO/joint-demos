/*
    The shapes of the diagram: one module per kind, each with its model - an
    `ElementModel` or `LinkModel` of `@joint/react` whose `data` is what
    React renders, or a plain element that is never rendered - and the
    component that renders it. The constants they share are in `constants.ts`.
*/

export * from './constants';
export { ADD_BUTTON_TYPE, AddButtonModel } from './add-button';
export { DECISION_TYPE, DecisionModel } from './decision';
export type { DecisionData } from './decision';
export { ElementContent } from './element-content';
export { GROUP_END_TYPE, GROUP_START_TYPE, GROUP_TYPE, GroupEndModel, GroupModel, GroupStartModel, isGate } from './group';
export type { Gate, GroupStartData } from './group';
export { LINK_TYPE, LinkContent, LinkModel } from './link';
export type { LinkData } from './link';
export { STEP_TYPE, StepModel } from './step';
export type { StepData } from './step';
export { END_TYPE, START_TYPE, EndModel, StartModel } from './terminals';

import { ADD_BUTTON_TYPE, AddButtonModel } from './add-button';
import { DECISION_TYPE, DecisionModel } from './decision';
import { GROUP_END_TYPE, GROUP_START_TYPE, GROUP_TYPE, GroupEndModel, GroupModel, GroupStartModel } from './group';
import { LINK_TYPE, LinkModel } from './link';
import { STEP_TYPE, StepModel } from './step';
import { END_TYPE, START_TYPE, EndModel, StartModel } from './terminals';

/** The models by their type, for the graph to revive a cell from its JSON - `type` is the key. */
export const cellNamespace = {
    [STEP_TYPE]: StepModel,
    [DECISION_TYPE]: DecisionModel,
    [START_TYPE]: StartModel,
    [END_TYPE]: EndModel,
    [GROUP_START_TYPE]: GroupStartModel,
    [GROUP_END_TYPE]: GroupEndModel,
    [GROUP_TYPE]: GroupModel,
    [ADD_BUTTON_TYPE]: AddButtonModel,
    [LINK_TYPE]: LinkModel
};
