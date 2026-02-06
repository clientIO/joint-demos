import { util } from '@joint/plus';
import { Attribute } from '../const';
import Theme, { iconAttributes, nodeLabelAttributes, nodeTypeLabelAttributes } from '../theme';
import DiagramNode from './DiagramNode';

const markup = util.svg /* xml*/ `
    <rect @selector="outline" class="node-outline"/>
    <rect @selector="body" class="node-body"/>
    <image @selector="icon" class="node-icon"/>
    <image @selector="warningIcon" class="node-icon"/>
    <text @selector="typeLabel" class="node-label"/>
    <text @selector="label" class="node-label"/>
    <image @selector="marker" class="node-icon"/>
`;

const TYPE = 'trigger';

export default class Trigger extends DiagramNode {
    static type = TYPE;
    
    static growthLimit = 1;
    
    configuration = null;
    
    preinitialize() {
        this.markup = markup;
    }
    
    defaults() {
        const attributes = {
            // Layout-specific attributes
            [Attribute.PartitionIndex]: 0,
            // App-specific attributes
            [Attribute.SourceOnly]: true,
            [Attribute.ContextMenu]: { x: 'calc(w/2-12)', y: 0 },
            [Attribute.Outline]: true,
            [Attribute.Configurable]: true,
            // Shape-specific attributes
            [Attribute.TriggerKey]: null,
            [Attribute.OutboundPorts]: [{
                    id: 'output',
                }],
            // JointJS attributes
            z: 1,
            type: TYPE,
            size: {
                width: 80,
                height: 80
            },
            attrs: {
                root: {
                    cursor: 'pointer',
                    dataConfigured: 'false'
                },
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: Theme.NodeBackgroundColor,
                    stroke: Theme.NodeBorderColor,
                    strokeWidth: Theme.NodeBorderWidth,
                    rx: 10,
                    ry: 10,
                },
                outline: {
                    x: -5,
                    y: -5,
                    strokeWidth: 0,
                    fill: Theme.NodeOutlineColor,
                    opacity: 0.5,
                    width: 'calc(w+10)',
                    height: 'calc(h+10)',
                    rx: 15,
                    ry: 15,
                    style: {
                        transition: 'all 0.3s ease'
                    }
                },
                warningIcon: {
                    x: 'calc(w/2 - 50)',
                    y: 'calc(h+12)',
                    width: 16,
                    height: 16,
                    href: 'assets/icons/warning.svg',
                    display: 'none'
                },
                icon: {
                    ...iconAttributes,
                    x: `calc(w/2 - ${Theme.IconSize / 2})`,
                    y: `calc(h/2 - ${Theme.IconSize / 2})`,
                    href: 'assets/icons/not-configured.svg'
                },
                typeLabel: {
                    ...nodeTypeLabelAttributes,
                    x: 'calc(w/2)',
                    y: 'calc(h+15)',
                    textWrap: {
                        width: 150,
                        maxLineCount: 1,
                        ellipsis: true
                    },
                },
                label: {
                    ...nodeLabelAttributes,
                    x: 'calc(w/2)',
                    y: 'calc(h+30)',
                    textWrap: {
                        width: 200,
                        maxLineCount: 2,
                        ellipsis: true
                    },
                },
                marker: {
                    x: -40,
                    y: 'calc(h/2-7)',
                    width: 15,
                    height: 15,
                    fill: Theme.TriggerMarkerColor,
                    href: 'assets/icons/trigger-marker.svg',
                    pointerEvents: 'none',
                },
            }
        };
        
        return util.defaultsDeep(attributes, super.defaults());
    }
    
    getDefaultOutlineAttributes() {
        return {
            x: -5,
            y: -5,
            width: 'calc(w+10)',
            height: 'calc(h+10)',
        };
    }
    
    getHoverOutlineAttributes() {
        return {
            x: -9,
            y: -9,
            width: 'calc(w+18)',
            height: 'calc(h+18)',
        };
    }
    
    getSelectedOutlineAttributes() {
        return {
            x: -30,
            y: -30,
            width: 'calc(w+60)',
            height: 'calc(h+60)',
        };
    }
    
    getLabelsRelativeRects() {
        const labelsData = super.getLabelsRelativeRects();
        labelsData.push({
            x: -35,
            y: 95,
            width: 150,
            height: 25
        });
        labelsData.push({
            x: -35,
            y: 120,
            width: 150,
            height: 50
        });
        return labelsData;
    }
    
    isConfigured() {
        return this.getConfigurationKey() != null;
    }
    
    getConfigurationKey() {
        return this.get(Attribute.TriggerKey) || null;
    }
    
    setConfigurationKey(triggerKey, options) {
        this.set(Attribute.TriggerKey, triggerKey, options);
    }
    
    getDefaultLabel() {
        return `${this.attr('typeLabel/text')}`;
    }
    
    unsetConfiguration() {
        this.configuration = null;
        
        this.attr({
            root: {
                dataConfigured: 'false'
            },
            icon: {
                href: 'assets/icons/not-configured.svg'
            },
            label: {
                text: ''
            },
            warningIcon: {
                display: 'unset'
            },
            typeLabel: {
                text: 'Select Trigger',
                x: 'calc(w/2 + 10)',
            }
        });
    }
    
    updateConfiguration(configuration) {
        this.configuration = configuration;
        
        const { icon, name: appName } = configuration.provider;
        const { name: triggerName = '' } = configuration.trigger;
        
        this.attr({
            root: {
                dataConfigured: 'true'
            },
            icon: {
                href: `assets/icons/providers/${icon}`
            },
            label: {
                text: this.getLabel() ?? triggerName
            },
            warningIcon: {
                display: 'none'
            },
            typeLabel: {
                text: appName,
                x: 'calc(w/2)',
            }
        });
    }
    
    getInspectorConfig() {
        
        if (!this.isConfigured()) {
            // Nothing to edit yet
            return {
                headerText: 'Trigger',
                headerIcon: this.attr('icon/href'),
                headerHint: 'Select trigger',
                inputs: {},
                groups: {}
            };
        }
        
        return {
            ...super.getInspectorConfig(),
            headerText: `${this.configuration?.trigger.name}`,
            headerIcon: this.attr('icon/href'),
            headerHint: `${this.configuration?.provider.name}`,
        };
    }
}
