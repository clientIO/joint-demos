import { util } from '@joint/plus';
import { Attribute } from '../const';
import Theme, { nodeLabelAttributes, typeLabelAttributes, rectBodyAttributes, iconAttributes, iconBackgroundAttributes } from '../theme';
import LabeledNode from './LabeledNode';

const markup = util.svg /* xml*/ `
    <rect @selector="body" class="node-body trigger-body"/>
    <rect @selector="iconBackground"/>
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
                x: `calc(w - ${Theme.NodeToolSize + Theme.NodeHorizontalPadding})`,
                y: Theme.NodeVerticalPadding
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
                body: rectBodyAttributes,
                iconBackground: iconBackgroundAttributes,
                icon: {
                    ...iconAttributes,
                    href: 'assets/icons/empty-trigger.svg'
                },
                typeLabel: {
                    ...typeLabelAttributes,
                    textWrap: {
                        width: `calc(w - ${Theme.NodeHorizontalPadding * 2 + Theme.IconBackgroundSize + Theme.IconLabelSpacing + Theme.NodeToolSize})`,
                        maxLineCount: 1,
                        ellipsis: true
                    },
                },
                label: {
                    ...nodeLabelAttributes,
                    textWrap: {
                        width: `calc(w - ${Theme.NodeHorizontalPadding * 2 + Theme.IconBackgroundSize + Theme.IconLabelSpacing})`,
                        maxLineCount: 1,
                        ellipsis: true
                    },
                },
            }
        };
        
        return util.defaultsDeep(attributes, super.defaults());
    }
    
    /**
     * @returns True if the action has an action key, false otherwise.
     */
    isConfigured() {
        return this.getActionKey() != null;
    }
    
    /**
     * @returns The action key from the action model.
     * @see {@link Attribute.ActionKey}
     */
    getActionKey() {
        return this.get(Attribute.ActionKey) || null;
    }
    
    /**
     * Sets the action key for the action model.
     * @param actionKey - The action key to set.
     * @param options - The options to pass to the set method.
     * @see {@link Attribute.ActionKey}
     */
    setActionKey(actionKey, options) {
        this.set(Attribute.ActionKey, actionKey, options);
    }
    
    /**
     * @returns The default label for the action.
     */
    getDefaultLabel() {
        return `${this.attr('typeLabel/text')}`;
    }
    
    /**
     * Unsets the provider, which results in the action being reset to the default state.
     * Icon, label, and type label are set to the default values.
     */
    unsetProvider() {
        this.attr({
            icon: {
                href: 'assets/icons/empty-trigger.svg'
            },
            iconBackground: {
                fill: Theme.IconBackgroundColor
            },
            label: {
                text: ''
            },
            typeLabel: {
                text: 'Select Action',
                textVerticalAnchor: 'middle',
                y: 'calc(h / 2)'
            }
        });
    }
    
    /**
     * Sets the provider for the action, which results in the action being updated to the new provider.
     * Icon, label, and type label are set to the new provider's values.
     * @param provider - The definition of the provider to update.
     * @param action - The definition of the action to update.
     * @see {@link ActionProviderDefinition}
     * @see {@link ActionDefinition}
     */
    updateProvider(provider, action) {
        const { icon, iconBackground, minimapBackground } = provider;
        const { name = '', data = {} } = action;
        
        this.attr({
            icon: {
                href: `assets/icons/providers/${icon}`
            },
            iconBackground: {
                fill: iconBackground ?? Theme.IconBackgroundColor
            },
            label: {
                text: this.getLabel() ?? name
            },
            typeLabel: {
                ...typeLabelAttributes,
                text: name,
            }
        });
        
        this.dataDefinition = data;
        this.minimapBackground = minimapBackground ?? Theme.NodeMinimapBackgroundColor;
    }
    
    /**
     * @param dataEntryType - Converts the data entry type to the corresponding input type expected by the inspector.
     * @returns The type of the input for the data entry.
     */
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
    
    /**
     * @returns Dynamically built inspector config based on the current action's data definition (providers data).
     * @see {@link InspectorConfig}
     */
    getInspectorConfig() {
        
        const dataKeys = Object.keys(this.dataDefinition);
        
        if (!this.isConfigured() || dataKeys.length === 0) {
            // Nothing to edit yet
            return {
                headerText: 'Action',
                headerIcon: this.attr('icon/href'),
                headerHint: 'Select an action to configure this step',
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
            headerIconBackground: this.attr('iconBackground/fill'),
            headerHint: 'Configure what this action does',
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
