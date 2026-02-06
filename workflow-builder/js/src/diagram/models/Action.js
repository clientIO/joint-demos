import { util } from '@joint/plus';
import { Attribute } from '../const';
import Theme, { iconAttributes, nodeLabelAttributes, nodeTypeLabelAttributes } from '../theme';
import DiagramNode from './DiagramNode';

const markup = util.svg /* xml*/ `
    <circle @selector="outline" class="node-outline"/>
    <rect @selector="body" class="node-body"/>
    <image @selector="icon" class="node-icon"/>
    <image @selector="warningIcon" class="node-icon"/>
    <text @selector="typeLabel" class="node-label"/>
    <text @selector="label" class="node-label"/>
`;

const TYPE = 'action';

export default class Action extends DiagramNode {
    
    static type = TYPE;
    
    static growthLimit = 1;
    
    dataDefinition = {};
    
    configuration = null;
    
    preinitialize() {
        this.markup = markup;
    }
    
    defaults() {
        const attributes = {
            // App-specific attributes
            [Attribute.ContextMenu]: { x: 'calc(w/2-12)', y: 0 },
            [Attribute.Outline]: true,
            [Attribute.Configurable]: true,
            // Shape-specific attributes
            [Attribute.ActionKey]: null,
            [Attribute.InboundPorts]: [{
                    id: 'input',
                }],
            [Attribute.OutboundPorts]: [{
                    id: 'output',
                }],
            // JointJS attributes
            type: TYPE,
            size: { width: 80, height: 80 },
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
                    rx: 40,
                    ry: 40
                },
                outline: {
                    cx: 'calc(w/2)',
                    cy: 'calc(h/2)',
                    strokeWidth: 0,
                    fill: Theme.NodeOutlineColor,
                    opacity: 0.5,
                    r: 45,
                    style: {
                        transition: 'all 0.3s ease'
                    }
                },
                icon: {
                    ...iconAttributes,
                    x: `calc(w/2 - ${Theme.IconSize / 2})`,
                    y: `calc(h/2 - ${Theme.IconSize / 2})`,
                    href: 'assets/icons/not-configured.svg'
                },
                warningIcon: {
                    x: 'calc(w/2 - 50)',
                    y: 'calc(h+12)',
                    width: 16,
                    height: 16,
                    href: 'assets/icons/warning.svg',
                    display: 'none'
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
                }
            }
        };
        
        return util.defaultsDeep(attributes, super.defaults());
    }
    
    getDefaultOutlineAttributes() {
        return {
            r: 45
        };
    }
    
    getHoverOutlineAttributes() {
        return {
            r: 49
        };
    }
    
    getSelectedOutlineAttributes() {
        return {
            r: 70
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
            y: 125,
            width: 150,
            height: 50
        });
        return labelsData;
    }
    
    getDefaultLabel() {
        return `${this.attr('typeLabel/text')}`;
    }
    
    isConfigured() {
        return this.getConfigurationKey() != null;
    }
    
    getConfigurationKey() {
        return this.get(Attribute.ActionKey) || null;
    }
    
    setConfigurationKey(actionKey, options) {
        this.set(Attribute.ActionKey, actionKey, options);
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
                text: 'Select Action',
                x: 'calc(w/2 + 10)',
            }
        });
    }
    
    updateConfiguration(configuration) {
        this.configuration = configuration;
        
        const { icon, name: appName } = configuration.provider;
        const { name: actionName = '', data = {} } = configuration.action;
        
        this.attr({
            root: {
                dataConfigured: 'true'
            },
            icon: {
                href: `assets/icons/providers/${icon}`
            },
            label: {
                text: this.getLabel() ?? actionName
            },
            warningIcon: {
                display: 'none'
            },
            typeLabel: {
                text: appName,
                x: 'calc(w/2)',
            }
        });
        
        this.dataDefinition = data;
    }
    
    getInputType(dataEntryType) {
        switch (dataEntryType) {
            case 'string':
                return 'text';
            case 'number':
                return 'number';
            case 'boolean':
                return 'toggle';
            case 'text':
                return 'content-editable';
            default:
                return 'text';
        }
    }
    
    getInspectorConfig() {
        
        const dataKeys = Object.keys(this.dataDefinition);
        
        if (!this.isConfigured() || dataKeys.length === 0) {
            // Nothing to edit yet
            return {
                headerText: 'Action',
                headerIcon: this.attr('icon/href'),
                headerHint: 'Select action',
                inputs: {},
                groups: {}
            };
        }
        
        const dataInputs = {};
        dataKeys.forEach((key) => {
            const dataEntry = this.dataDefinition[key];
            dataInputs[key] = {
                label: /* html */ `${dataEntry.name}
                    <div class="field-hint-container">
                        <img class="field-hint-icon" src="assets/icons/hint.svg">
                        <div class="field-hint">${dataEntry.description}</div>
                    </div>
                `,
                type: this.getInputType(dataEntry.type),
                group: 'data'
            };
        });
        
        const config = {
            headerText: `${this.configuration?.action.name}`,
            headerIcon: this.attr('icon/href'),
            headerHint: `${this.configuration?.provider.name}`,
            groups: {
                data: {
                    label: 'Data',
                    index: 2
                }
            },
            inputs: {
                data: dataInputs
            }
        };
        
        return util.defaultsDeep(config, super.getInspectorConfig());
    }
}
