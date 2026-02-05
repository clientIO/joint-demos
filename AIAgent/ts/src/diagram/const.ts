import { Attribute as SystemAttribute } from '../system/diagram/const';

/**
 * The ID of the start node.
 */
export const START_NODE_ID = 'start';

/**
 * Node attribute names
 */
export const Attribute = {

    // Re-export system attributes
    ...SystemAttribute,

    /**
     * Can a shape be selected?
     */
    Selectable: 'selectable',
    /**
     * Does the shape have a context menu?
     */
    ContextMenu: 'contextMenu',
    /**
     * Is the shape removable?
     */
    Removable: 'removable',
    /**
     * Trigger key attribute name.
     */
    TriggerKey: 'triggerKey',
    /**
     * Action key attribute name.
     */
    ActionKey: 'actionKey',
    /**
     * Markdown content attribute name.
     */
    Markdown: 'markdown',
    /**
     * Label attribute name.
     */
    Label: 'label',
    /**
     * Size attribute name (JointJS built-in).
     */
    Size: 'size',
    /**
     * Agent/Condition prompt attribute name.
     */
    NodePrompt: 'prompt',
    /**
     * Edge prompt attribute name.
     */
    EdgePrompt: 'prompt',
    /**
     * Agent skills attribute name.
     */
    Skills: 'skills',
    /**
     * Agent conditions attribute name.
     */
    Conditions: 'conditions',

} as const;
