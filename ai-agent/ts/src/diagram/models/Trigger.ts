import { util } from '@joint/plus';
import { Attribute } from '../const';
import Theme, { nodeLabelAttributes, typeLabelAttributes } from '../theme';
import LabeledNode from './LabeledNode';

import type { dia } from '@joint/plus';
import type { LabeledNodeAttributes } from './LabeledNode';
import type { TriggerDefinition, TriggerProviderDefinition } from '../../registry/types';
import type { InspectorConfig } from '../../types';

const markup = util.svg/* xml*/`
    <path @selector="body" class="node-body trigger-body"/>
    <image @selector="icon" class="node-icon trigger-icon"/>
    <text @selector="typeLabel" class="node-label trigger-type-label"/>
    <text @selector="label" class="node-label trigger-label"/>
`;

const TYPE = 'trigger';

interface TriggerAttributes extends LabeledNodeAttributes {
    [Attribute.TriggerKey]: string | null;
}

export default class Trigger extends LabeledNode<TriggerAttributes> {

    static override type = TYPE;

    static override growthLimit = 1;

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<TriggerAttributes> {
        const attributes: TriggerAttributes = {
            // App-specific attributes
            [Attribute.Removable]: false,
            [Attribute.SourceOnly]: true,
            [Attribute.ContextMenu]: {
                x: `calc(w - ${Theme.NodeToolSize + Theme.NodeToolSpacing})`,
                y: 16
            },
            // Shape-specific attributes
            [Attribute.TriggerKey]: null,
            // JointJS attributes
            z: 1,
            type: TYPE,
            size: {
                width: Theme.NodeWidth,
                height: Theme.TriggerHeight
            },
            attrs: {
                root: {
                    cursor: 'pointer'
                },
                body: {
                    fill: Theme.TriggerBackgroundColor,
                    stroke: Theme.TriggerBorderColor,
                    strokeWidth: Theme.TriggerBorderWidth,
                    d: `M 0 0
                        ${ getTopBorderSvg(Theme.NodeWidth) }
                        L calc(w) calc(h-10) a 10 10 0 0 1 -10 10 L 10 calc(h) a 10 10 0 0 1 -10 -10 Z`
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
                    x: Theme.NodeIconSize + Theme.NodeSpacing * 2,
                    y: (Theme.TriggerHeight - Theme.NodeLabelSpacing) / 2,
                    textWrap: {
                        width: Theme.NodeWidth - (Theme.NodeIconSize + Theme.NodeSpacing * 3 + Theme.NodeToolSize + Theme.NodeToolSpacing),
                        maxLineCount: 1,
                        ellipsis: true
                    },
                },
                label: {
                    ...nodeLabelAttributes,
                    x: Theme.NodeIconSize + Theme.NodeSpacing * 2,
                    y: (Theme.TriggerHeight + Theme.NodeLabelSpacing) / 2,
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

    isConfigured(): boolean {
        return this.getTriggerKey() != null;
    }

    getTriggerKey(): string | null {
        return this.get(Attribute.TriggerKey) || null;
    }

    setTriggerKey(triggerKey: string, options?: dia.Cell.Options) {
        this.set(Attribute.TriggerKey, triggerKey, options);
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
                text: 'Select Trigger',
                textVerticalAnchor: 'middle',
                y: Theme.TriggerHeight / 2,
            }
        });
    }

    updateProvider(provider: TriggerProviderDefinition, trigger: TriggerDefinition) {
        const { icon } = provider;
        const { name = '' } = trigger;

        this.attr({
            icon: {
                href: `assets/icons/providers/${icon}`
            },
            label: {
                text: this.getLabel() ?? name
            },
            typeLabel: {
                ...typeLabelAttributes,
                text: name,
                y: (Theme.TriggerHeight - Theme.NodeLabelSpacing) / 2
            }
        });
    }

    getInspectorConfig(): InspectorConfig {

        if (!this.isConfigured()) {
            // Nothing to edit yet
            return {
                headerText: 'Trigger',
                headerIcon: this.attr('icon/href'),
                inputs: {},
                groups: {}
            };
        }

        return {
            ...super.getInspectorConfig(),
            headerText: `Trigger: ${this.getDefaultLabel()}`,
            headerIcon: this.attr('icon/href')
        };
    }
}

function getTopBorderSvg(width: number): string {
    const dh = 5;
    const dw = 13;
    const n = width / dw;

    let topBorderSvg = '';
    for (let i = 1; i <= n; i++) {
        topBorderSvg += `L ${ dw * i } ${ i % 2 ? dh : 0 } `;
    }
    if (Math.floor(n) * dw < width) {
        topBorderSvg += `L ${ width } 0 `;
    }

    return topBorderSvg;
}
