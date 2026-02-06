import { util } from '@joint/plus';
import { Attribute } from '../const';
import Theme, { nodeLabelAttributes, typeLabelAttributes } from '../theme';
import LabeledNode from './LabeledNode';

const markup = util.svg /* xml*/ `
    <rect @selector="body" class="node-body trigger-body"/>
    <image @selector="icon" class="node-icon trigger-icon"/>
    <text @selector="typeLabel" class="node-label trigger-type-label"/>
    <text @selector="label" class="node-label trigger-label"/>
`;

const TYPE = 'action';

export default class Action extends LabeledNode {
    
    static type = TYPE;
    
    static growthLimit = 1;
    
    dataDefinition = {};
    
    preinitialize() {
        this.markup = markup;
    }
    
    defaults() {
        const attributes = {
            // App-specific attributes
            [Attribute.ContextMenu]: {
                x: `calc(w - ${Theme.NodeToolSize + Theme.NodeToolSpacing})`,
                y: `calc(h/2 - ${Theme.NodeToolSize / 2})`
            },
            // Shape-specific attributes
            [Attribute.ActionKey]: null,
            // JointJS attributes
            type: TYPE,
            size: {
                width: Theme.NodeWidth,
                height: Theme.NodeHeight
            },
            attrs: {
                root: {
                    cursor: 'pointer'
                },
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: Theme.ActionBackgroundColor,
                    stroke: Theme.ActionBorderColor,
                    strokeWidth: Theme.ActionBorderWidth,
                    rx: Theme.NodeBorderRadius,
                    ry: Theme.NodeBorderRadius
                },
                icon: {
                    x: Theme.NodeSpacing,
                    y: `calc(h/2 - ${Theme.NodeIconSize / 2})`,
                    width: Theme.NodeIconSize,
                    height: Theme.NodeIconSize,
                    href: 'assets/icons/empty-trigger.svg'
                },
                typeLabel: {
                    ...typeLabelAttributes,
                    textVerticalAnchor: 'middle',
                    x: Theme.NodeIconSize + Theme.NodeSpacing * 2,
                    y: Theme.NodeHeight / 2,
                    textWrap: {
                        width: Theme.NodeWidth - (Theme.NodeIconSize + Theme.NodeSpacing * 3 + Theme.NodeToolSize + Theme.NodeToolSpacing),
                        maxLineCount: 1,
                        ellipsis: true
                    },
                },
                label: {
                    ...nodeLabelAttributes,
                    x: Theme.NodeIconSize + Theme.NodeSpacing * 2,
                    y: (Theme.NodeHeight + Theme.NodeLabelSpacing) / 2,
                    textWrap: {
                        width: Theme.NodeWidth - (Theme.NodeIconSize + Theme.NodeSpacing * 3),
                        maxLineCount: 1,
                        ellipsis: true
                    },
                }
            }
        };
        
        return util.defaultsDeep(attributes, super.defaults());
    }
    
    isConfigured() {
        return this.getActionKey() != null;
    }
    
    getActionKey() {
        return this.get(Attribute.ActionKey) || null;
    }
    
    setActionKey(actionKey, options) {
        this.set(Attribute.ActionKey, actionKey, options);
    }
    
    getDefaultLabel() {
        return `${this.attr('typeLabel/text')}`;
    }
    
    unsetProvider() {
        this.attr({
            icon: {
                href: 'assets/icons/empty-trigger.svg'
            },
            label: {
                text: ''
            },
            typeLabel: {
                text: 'Select Action',
                textVerticalAnchor: 'middle',
                y: Theme.NodeHeight / 2
            }
        });
    }
    
    updateProvider(provider, action) {
        const { icon } = provider;
        const { name = '', data = {} } = action;
        
        this.attr({
            icon: {
                href: `assets/icons/providers/${icon}`
            },
            label: {
                text: this.getLabel() ?? name
            },
            typeLabel: {
                text: name,
                textVerticalAnchor: 'bottom',
                y: (Theme.NodeHeight - Theme.NodeLabelSpacing) / 2
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
                inputs: {},
                groups: {}
            };
        }
        
        const dataInputs = {};
        dataKeys.forEach((key) => {
            const dataEntry = this.dataDefinition[key];
            dataInputs[key] = {
                label: /* html */ `${dataEntry.name}:
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
            headerText: `Action: ${this.getDefaultLabel()}`,
            headerIcon: this.attr('icon/href'),
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
