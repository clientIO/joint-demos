import { shapes as defaultCellNamespace } from '@joint/plus';
import { systemModelNamespace } from '../system/diagram/namespaces';
import { Trigger, Branch, Action, Note, Edge, Delay, Button, ButtonLine, Placeholder } from './models';
import { TriggerView, AnimatedElementView, AnimatedLinkView } from './views';

/**
 * Models for the application shapes
 */
export const applicationModelNamespace = {
    [Branch.type]: Branch,
    [Action.type]: Action,
    [Trigger.type]: Trigger,
    [Delay.type]: Delay,
    [Note.type]: Note,
};

/**
 * Views for the application shapes
 */
export const applicationViewNamespace = {
    [`${Branch.type}View`]: AnimatedElementView,
    [`${Action.type}View`]: AnimatedElementView,
    [`${Delay.type}View`]: AnimatedElementView,
    [`${Note.type}View`]: AnimatedElementView,
    [`${Trigger.type}View`]: TriggerView,
};

/**
 * Add any system shape model overrides here if needed in the future
 */
export const systemModelOverrides = {
    [Edge.type]: Edge,
    [ButtonLine.type]: ButtonLine,
    [Button.type]: Button,
    [Placeholder.type]: Placeholder,
};

export const systemViewNamespaceOverrides = {
    [`${Edge.type}View`]: AnimatedLinkView,
};

/**
 * Cell namespace to be used with JointJS graph and paper
 */
export const cellNamespace = {
    ...defaultCellNamespace, // JointJS default shapes
    ...systemModelNamespace, // System shapes like Placeholder, ButtonLink
    ...systemModelOverrides,
    ...systemViewNamespaceOverrides,
    ...applicationModelNamespace,
    ...applicationViewNamespace,
};
