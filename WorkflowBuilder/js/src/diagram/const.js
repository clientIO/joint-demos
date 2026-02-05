import { Attribute as SystemAttribute } from '../system/diagram/const';
export { LAYOUT_BATCH_NAME } from '../system/diagram/const';

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
     * Is the shape configurable?
     */
    Configurable: 'configurable',
    /**
     * Trigger key attribute name.
     */
    TriggerKey: 'triggerKey',
    /**
     * Action key attribute name.
     */
    ActionKey: 'actionKey',
    /**
     * Control key attribute name
     */
    ControlKey: 'controlKey',
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
     * Inbound ports
    */
    InboundPorts: 'inboundPorts',
    /**
     * Outbound ports
     */
    OutboundPorts: 'outboundPorts',
    /**
     * Implements outline interface
     */
    Outline: 'outline',
};
