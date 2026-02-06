import { util } from '@joint/plus';
import DiagramNode from './DiagramNode';
import Theme, { iconAttributes, nodeLabelAttributes, nodeTypeLabelAttributes } from '../theme';
import { Attribute } from '../const';

import type { dia } from '@joint/plus';
import type { DiagramNodeAttributes } from './DiagramNode';
import type { InspectorConfig } from '../../types';
import type { ControlDefinition, Data } from '../../registry/types';
import type { Configurable, OutlineNode } from '../types';

const markup = util.svg/* xml*/`
    <rect @selector="outline" class="node-outline"/>
    <rect @selector="body" class="node-body"/>
    <image @selector="icon" class="node-icon"/>
    <image @selector="warningIcon" class="node-icon"/>
    <text @selector="typeLabel" class="node-label"/>
    <text @selector="label" class="node-label"/>
`;

const TYPE = 'control';

interface ControlAttributes extends DiagramNodeAttributes {
    [Attribute.ControlKey]: string | null;
}

export interface ControlConfiguration {
    control: ControlDefinition;
}

export default class Control extends DiagramNode<ControlAttributes> implements OutlineNode, Configurable<ControlConfiguration> {

    static type = TYPE;

    static minHeight = 100;

    dataDefinition: Data = {};

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<ControlAttributes> {
        const attributes: ControlAttributes = {
            // App-specific attributes
            [Attribute.ContextMenu]: { x: 'calc(w/2 - 12)', y: 0 },
            [Attribute.Outline]: true,
            [Attribute.Configurable]: true,
            // Shape-specific attributes
            [Attribute.ControlKey]: null,
            [Attribute.InboundPorts]: [{
                id: 'input',
            }],
            // JointJS attributes
            z: 1,
            type: TYPE,
            size: { width: 60, height: Control.minHeight },
            attrs: {
                root: {
                    cursor: 'pointer',
                    width: 'calc(w)',
                    height: 'calc(h)',
                    dataConfigured: 'false'
                },
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: Theme.ControlBackgroundColor,
                    stroke: Theme.ControlBorderColor,
                    strokeWidth: Theme.ControlBorderWidth,
                    rx: 30,
                    ry: 30
                },
                outline: {
                    x: -5,
                    y: -5,
                    strokeWidth: 0,
                    fill: Theme.ControlOutlineColor,
                    opacity: 0.5,
                    width: 'calc(w+10)',
                    height: 'calc(h+10)',
                    rx: 35,
                    ry: 35,
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

    getDefaultOutlineAttributes(): object {
        return {
            x: -5,
            y: -5,
            width: 'calc(w+10)',
            height: 'calc(h+10)',
            rx: 35,
            ry: 35,
        };
    }

    getHoverOutlineAttributes(): object {
        return {
            x: -9,
            y: -9,
            width: 'calc(w+18)',
            height: 'calc(h+18)',
            rx: 39,
            ry: 39,
        };
    }

    getSelectedOutlineAttributes(): object {
        return {
            x: -30,
            y: -30,
            width: 'calc(w+60)',
            height: 'calc(h+60)',
            rx: 60,
            ry: 60,
        };
    }

    updateBody() {
        const maxPortsCount = Math.max(this.getInboundPorts().length, this.getOutboundPorts().length);
        const height = Math.max(Control.minHeight, maxPortsCount * 40 + 20);

        this.resize(this.size().width, height);
    }

    override getLabelsRelativeRects(): dia.BBox[] {
        const labelsData = super.getLabelsRelativeRects();
        const height = this.size().height;
        labelsData.push({
            x: -20,
            y: height + 15,
            width: 100,
            height: 25
        });
        labelsData.push({
            x: -30,
            y: height + 40,
            width: 120,
            height: 50
        });
        return labelsData;
    }

    isConfigured(): boolean {
        return this.getConfigurationKey() != null;
    }

    getConfigurationKey(): string | null {
        return this.get(Attribute.ControlKey) || null;
    }

    setConfigurationKey(controlKey: string, options?: dia.Cell.Options) {
        this.set(Attribute.ControlKey, controlKey, options);
    }

    getDefaultLabel() {
        return `${this.attr('typeLabel/text')}`;
    }

    unsetConfiguration() {
        this.set(Attribute.OutboundPorts, []);
        this.set(Attribute.InboundPorts, [{
            id: 'input',
        }]);

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
                text: 'Select Control',
                x: 'calc(w/2 + 10)',
            }
        });
    }

    updateConfiguration(configuration: ControlConfiguration) {
        const { name = '', data = {}, icon, outboundPorts, inboundPorts } = configuration.control;

        this.set(Attribute.OutboundPorts, outboundPorts || []);
        this.set(Attribute.InboundPorts, inboundPorts || [{
            id: 'input',
        }]);
        this.updateInboundPorts();
        this.updateOutboundPorts();
        this.updateBody();

        this.attr({
            root: {
                dataConfigured: 'true'
            },
            icon: {
                href: `assets/icons/controls/${icon}`
            },
            label: {
                text: this.getLabel() ?? name
            },
            warningIcon: {
                display: 'none'
            },
            typeLabel: {
                text: name,
                x: 'calc(w/2)',
            }
        });

        this.dataDefinition = data;
    }

    getInputType(dataEntryType: string): string {
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

    getInspectorConfig(): InspectorConfig {
        const dataKeys = Object.keys(this.dataDefinition);

        if (!this.isConfigured()) {
            // Nothing to edit yet
            return {
                headerText: 'Control',
                headerIcon: this.attr('icon/href'),
                headerHint: 'Select control type',
                inputs: {},
                groups: {}
            };
        }

        const dataInputs: { [key: string]: unknown } = {};
        if (this.isConfigured() && dataKeys.length) {
            dataKeys.forEach((key) => {
                const dataEntry = this.dataDefinition[key];
                dataInputs[key] = {
                    label: /* html */`${dataEntry.name}
                        <div class="field-hint-container">
                            <img class="field-hint-icon" src="assets/icons/hint.svg">
                            <div class="field-hint">${dataEntry.description}</div>
                        </div>
                    `,
                    type: this.getInputType(dataEntry.type),
                    group: 'data'
                };
            });
        }

        const config: InspectorConfig = {
            headerText: `${this.getDefaultLabel()}`,
            headerIcon: this.attr('icon/href'),
            headerHint: 'Configure automation rules',
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
