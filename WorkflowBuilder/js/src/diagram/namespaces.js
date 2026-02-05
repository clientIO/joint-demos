import { shapes as defaultCellNamespace } from '@joint/plus';
import { systemModelNamespace } from '../system/diagram/namespaces';
import { Trigger, Control, Action, Note, Edge } from './models';

/**
 * Models for the application shapes
 */
export const applicationModelNamespace = {
    [Trigger.type]: Trigger,
    [Note.type]: Note,
    [Control.type]: Control,
    [Action.type]: Action,
};

/**
 * Add any system shape model overrides here if needed in the future
 */
export const systemModelOverrides = {
    [Edge.type]: Edge,
};

/**
 * Cell namespace to be used with JointJS graph and paper
 */
export const cellNamespace = {
    ...defaultCellNamespace, // JointJS default shapes
    ...systemModelNamespace, // System shapes like Placeholder, ButtonLink
    ...systemModelOverrides,
    ...applicationModelNamespace,
};
