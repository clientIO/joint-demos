import { shapes as defaultCellNamespace } from '@joint/plus';
import { systemModelNamespace } from '../system/diagram/namespaces';
import { Trigger, Condition, Action, Note, Agent, Edge, Button, ButtonLine, Placeholder } from './models';
import { AgentView } from './views';

/**
 * Models for the application shapes
 */
export const applicationModelNamespace = {
    [Trigger.type]: Trigger,
    [Note.type]: Note,
    [Agent.type]: Agent,
    [Condition.type]: Condition,
    [Action.type]: Action,
};

/**
 * Views for the application shapes
 */
export const applicationViewNamespace = {
    [AgentView.type]: AgentView,
};

/**
 * Add any system shape model overrides here if needed in the future
 */
export const systemModelOverrides = {
    [Button.type]: Button,
    [ButtonLine.type]: ButtonLine,
    [Edge.type]: Edge,
    [Placeholder.type]: Placeholder,
};

/**
 * Cell namespace to be used with JointJS graph and paper
 */
export const cellNamespace = {
    ...defaultCellNamespace, // JointJS default shapes
    ...systemModelNamespace, // System shapes like Placeholder, ButtonLink
    ...systemModelOverrides,
    ...applicationModelNamespace,
    ...applicationViewNamespace,
};
