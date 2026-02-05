import { util } from '@joint/plus';
import Node from './Node';
import { Attribute } from '../const';
import { inPortBodyAttributes, outPortBodyAttributes, outPortIconAttributes, portLabelAttributes } from '../theme';
import { config } from '../../system/configs/system';

const portLabelMarkup = util.svg /* xml*/ `
    <text @selector="label" class="label-text"/>
`;

const inPortMarkup = util.svg /* xml*/ `
    <circle @selector="portBody"/>
`;

const outPortMarkup = util.svg /* xml*/ `
    <circle @selector="portBody"/>
    <text @selector="icon"/>
`;

/**
 * Base class for diagram nodes with inbound and outbound ports.
 */
export default class DiagramNode extends Node {
    
    /**
     * Definition of inbound port group.
     * @see https://docs.jointjs.com/api/dia/Element/#ports
     * @tutorial https://docs.jointjs.com/learn/features/ports/
     */
    static portsIn = {
        position: {
            name: 'left'
        },
        size: {
            width: 16,
            height: 16
        },
        attrs: {
            portBody: inPortBodyAttributes
        },
        label: {
            position: {
                name: 'outside',
                args: {
                    x: -8,
                    y: 16,
                    attrs: {
                        label: {
                            ...portLabelAttributes,
                            textAnchor: 'end',
                        }
                    }
                }
            },
            markup: portLabelMarkup
        },
        markup: inPortMarkup
    };
    
    /**
     * Definition of outbound port group.
     * @see https://docs.jointjs.com/api/dia/Element/#ports
     * @tutorial https://docs.jointjs.com/learn/features/ports/
     */
    static portsOut = {
        position: {
            name: 'right'
        },
        size: {
            width: 20,
            height: 20
        },
        attrs: {
            portBody: outPortBodyAttributes,
            icon: outPortIconAttributes
        },
        label: {
            position: {
                name: 'outside',
                args: {
                    x: 14, y: 10,
                    attrs: {
                        label: portLabelAttributes
                    }
                }
            },
            markup: portLabelMarkup
        },
        markup: outPortMarkup
    };
    
    defaults() {
        return {
            ...super.defaults(),
            [Attribute.InboundPorts]: [],
            [Attribute.OutboundPorts]: [],
            ports: {
                items: [],
                groups: {
                    [config.inboundPortGroupName]: DiagramNode.portsIn,
                    [config.outboundPortGroupName]: DiagramNode.portsOut
                }
            },
            attrs: {
                root: {
                    magnet: false
                }
            }
        };
    }
    
    /**
     * Initializes the diagram node.
     */
    initialize(attributes, options) {
        super.initialize(attributes, options);
        
        this.updateLabel();
        this.updateInboundPorts();
        this.updateOutboundPorts();
        
        this.on(`change:${Attribute.Label}`, () => this.updateLabel());
    }
    
    /**
     * Updates the label of the diagram node. It assumes that all descendants have text SVG element with 'label' selector.
     */
    updateLabel() {
        // If no label is set or the label is an empty string,
        // display the default label.
        this.attr(['label', 'text'], this.getLabel() || this.getDefaultLabel());
    }
    
    /**
     * Updates the inbound ports of the diagram node.
     */
    updateInboundPorts() {
        const inboundPorts = this.getInboundPorts();
        
        this.getGroupPorts(config.inboundPortGroupName).forEach(port => {
            this.removePort(port);
        });
        
        this.addPorts(inboundPorts.map((port, index) => ({
            id: port.id || `inbound-port-${index}`,
            group: config.inboundPortGroupName,
            attrs: {
                label: {
                    text: port.label || ''
                }
            }
        })));
    }
    
    /**
     * Updates the outbound ports of the diagram node.
     */
    updateOutboundPorts() {
        const outboundPorts = this.getOutboundPorts();
        
        this.getGroupPorts(config.outboundPortGroupName).forEach(port => {
            this.removePort(port);
        });
        
        this.addPorts(outboundPorts.map((port, index) => ({
            id: port.id || `outbound-port-${index}`,
            group: config.outboundPortGroupName,
            attrs: {
                label: {
                    text: port.label || ''
                }
            }
        })));
    }
    
    getLabel() {
        return this.get(Attribute.Label) ?? null;
    }
    
    getDefaultLabel() {
        return '';
    }
    
    setLabel(label, options) {
        if (label == null) {
            this.unset(Attribute.Label, options);
        }
        else {
            this.set(Attribute.Label, label, options);
        }
    }
    
    getInboundPorts() {
        return this.get(Attribute.InboundPorts) || [];
    }
    
    getOutboundPorts() {
        return this.get(Attribute.OutboundPorts) || [];
    }
    
    /**
     * Returns the inspector configuration for the diagram node. It has name input by default for all diagram nodes.
     */
    getInspectorConfig() {
        return {
            ...super.getInspectorConfig(),
            groups: {
                general: {
                    label: 'General',
                    index: 1
                }
            },
            inputs: {
                [Attribute.Label]: {
                    type: 'text',
                    label: 'Name',
                    group: 'general',
                    attrs: {
                        input: {
                            placeholder: this.getDefaultLabel(),
                        }
                    }
                }
            }
        };
    }
}
