import { Attribute as SystemAttribute } from '../system/diagram/const';

/**
 * The ID of the start node.
 */
export const START_NODE_ID = 'start';

/**
 * The name of the layout batch.
 */
export const LAYOUT_BATCH_NAME = 'layout';

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
     * Branch condition attribute name.
     */
    NodeCondition: 'condition',
    /**
     * Edge condition attribute name.
     */
    EdgeCondition: 'condition',
    /**
     * Trigger criteria attribute name.
     */
    Criteria: 'criteria',
    /**
     * Delay duration attribute name.
     */
    Duration: 'duration',

} as const;
