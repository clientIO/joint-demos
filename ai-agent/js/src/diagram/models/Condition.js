import { util } from '@joint/plus';
import LabeledNode from './LabeledNode';
import Theme, { nodeLabelAttributes } from '../theme';
import { Attribute } from '../const';

const markup = util.svg /* xml*/ `
    <path @selector="body" class="node-body condition-body"/>
    <image @selector="icon" class="node-icon condition-icon"/>
    <text @selector="label" class="node-label condition-label"/>
`;

const TYPE = 'condition';
const ICON = 'assets/icons/condition.svg';

export default class Condition extends LabeledNode {
    
    static type = TYPE;
    
    static growthLimit = Infinity;
    
    preinitialize() {
        this.markup = markup;
    }
    
    defaults() {
        return util.defaultsDeep({
            // App-specific attributes
            [Attribute.ContextMenu]: {
                x: `calc(w - ${Theme.NodeToolSize + Theme.NodeToolSpacing})`,
                y: `calc(h/2 - ${Theme.NodeToolSize / 2})`
            },
            // Shape-specific attributes
            conditions: [],
            // JointJS attributes
            z: 1,
            type: TYPE,
            size: {
                width: Theme.ConditionWidth,
                height: Theme.ConditionHeight
            },
            attrs: {
                root: {
                    cursor: 'pointer'
                },
                body: {
                    fill: Theme.ConditionBackgroundColor,
                    stroke: Theme.ConditionBorderColor,
                    strokeWidth: Theme.ConditionBorderWidth,
                    d: 'M2.61702 26.9226C1.00304 24.1951 1.00304 20.8049 2.61703 18.0773L10.2003 5.26191C11.7635 2.62028 14.6049 1 17.6744 1H159.326C162.395 1 165.237 2.62028 166.8 5.26191L174.383 18.0773C175.997 20.8049 175.997 24.1951 174.383 26.9227L166.8 39.7381C165.237 42.3797 162.395 44 159.326 44H17.6744C14.6049 44 11.7635 42.3797 10.2003 39.7381L2.61702 26.9226Z'
                },
                icon: {
                    x: 15,
                    y: 12,
                    width: 20,
                    height: 20,
                    href: ICON
                },
                label: {
                    ...nodeLabelAttributes,
                    textAnchor: 'middle',
                    x: 'calc(w/2)',
                    y: 16,
                    textWrap: {
                        width: 100,
                        height: 20,
                        ellipsis: true
                    },
                }
            }
        }, super.defaults());
    }
    
    getInspectorConfig() {
        const config = {
            headerText: 'Condition',
            headerIcon: 'assets/icons/condition-header.svg',
            groups: {
                condition: {
                    label: 'Condition',
                    index: 2
                }
            },
            inputs: {
                to: {
                    type: 'list',
                    label: /* html */ `Conditions:
                    <div class="field-hint-container">
                        <img class="field-hint-icon" src="assets/icons/hint.svg">
                        <div class="field-hint">Describe possible execution paths based on the Condition evaluation.</div>
                    </div>`,
                    addButtonLabel: '+ Add path',
                    group: 'condition',
                    item: {
                        [Attribute.EdgePrompt]: {
                            type: 'content-editable',
                            label: 'Path',
                            defaultValue: ''
                        },
                        id: {
                            type: 'text',
                            defaultValue: () => util.uuid()
                        }
                    }
                }
            }
        };
        
        return util.defaultsDeep(config, super.getInspectorConfig());
    }
}
