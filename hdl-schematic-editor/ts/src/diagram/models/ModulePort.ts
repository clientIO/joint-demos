import { util } from '@joint/plus';
import HdlNode, { alignToGrid, measureText } from './HdlNode';
import { Attribute, NodeTypes } from '../const';
import Theme, { symbolTextAttributes } from '../theme';

import type { HdlNodeAttributes, HdlPort } from './HdlNode';
import type { InspectorConfig } from '../types';

const markup = util.svg/* xml*/`
    <rect @selector="background"/>
    <path @selector="body" class="node-body"/>
    <text @selector="name"/>
    <text @selector="label"/>
`;

const HEIGHT = 20;
const PIN_LENGTH = 10;
const ARROW = 8;
const PADDING = 6;

/**
 * A port of the module (KiCad hierarchical label style).
 */
abstract class ModulePort extends HdlNode {

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<HdlNodeAttributes> {
        return util.defaultsDeep({
            [Attribute.Width]: 1,
            size: { width: 60, height: HEIGHT },
            attrs: {
                body: {
                    fill: Theme.PaperColor,
                    stroke: Theme.ModulePortColor,
                    strokeWidth: Theme.SymbolStrokeWidth,
                    strokeLinejoin: 'round',
                },
                name: {
                    ...symbolTextAttributes,
                    fill: Theme.ModulePortColor,
                    textAnchor: 'start',
                    y: HEIGHT / 2,
                }
            }
        }, super.defaults());
    }

    getWidth(): number {
        return Math.max(1, Number(this.get(Attribute.Width)) || 1);
    }

    getText(): string {
        const width = this.getWidth();
        const name = this.getName() || '?';
        return width > 1 ? `${name}[${width - 1}:0]` : name;
    }

    getBodyWidth(): number {
        // The whole shape (including the pin) is as wide as whole grid cells,
        // so the pin end of an input is on the grid
        return alignToGrid(measureText(this.getText()) + PADDING * 2 + ARROW + PIN_LENGTH) - PIN_LENGTH;
    }

    getInspectorConfig(): InspectorConfig {
        const config = super.getInspectorConfig();
        return {
            ...config,
            inputs: {
                [Attribute.Name]: {
                    type: 'text',
                    label: 'Name',
                    group: 'general',
                },
                [Attribute.Width]: {
                    type: 'number',
                    label: 'Width',
                    group: 'general',
                    min: 1,
                    max: 256,
                }
            }
        };
    }
}

/**
 * An input port of the module.
 */
export class Input extends ModulePort {

    static type = NodeTypes.Input;

    defaults(): Partial<HdlNodeAttributes> {
        return util.defaultsDeep({
            type: NodeTypes.Input,
            [Attribute.SourceOnly]: true,
        }, super.defaults());
    }

    protected updateSymbol() {
        const bodyWidth = this.getBodyWidth();
        const width = bodyWidth + PIN_LENGTH;
        this.resize(width, HEIGHT);
        this.attr({
            body: {
                d: `M 0 0 H ${bodyWidth - ARROW} L ${bodyWidth} ${HEIGHT / 2} L ${bodyWidth - ARROW} ${HEIGHT} H 0 Z`
            },
            name: {
                x: PADDING,
                text: this.getText()
            }
        });
    }

    getPortDefinitions(): HdlPort[] {
        const { width } = this.size();
        return [{ id: 'Y', direction: 'out', side: 'EAST', width: this.getWidth(), x: width, y: HEIGHT / 2, length: PIN_LENGTH }];
    }

    getInspectorConfig(): InspectorConfig {
        return {
            ...super.getInspectorConfig(),
            headerText: 'Input port',
            headerHint: 'Module input',
            headerSymbol: 'IN',
        };
    }
}

/**
 * An output port of the module.
 */
export class Output extends ModulePort {

    static type = NodeTypes.Output;

    defaults(): Partial<HdlNodeAttributes> {
        return util.defaultsDeep({
            type: NodeTypes.Output,
            // Outputs are placed in the last layer
            [Attribute.PartitionIndex]: 2000,
        }, super.defaults());
    }

    protected updateSymbol() {
        const bodyWidth = this.getBodyWidth();
        const width = bodyWidth + PIN_LENGTH;
        this.resize(width, HEIGHT);
        this.attr({
            body: {
                d: `M ${PIN_LENGTH} 0 H ${width - ARROW} L ${width} ${HEIGHT / 2} L ${width - ARROW} ${HEIGHT} H ${PIN_LENGTH} Z`
            },
            name: {
                x: PIN_LENGTH + PADDING,
                text: this.getText()
            }
        });
    }

    getPortDefinitions(): HdlPort[] {
        return [{ id: 'A', direction: 'in', side: 'WEST', width: this.getWidth(), x: 0, y: HEIGHT / 2, length: PIN_LENGTH }];
    }

    getInspectorConfig(): InspectorConfig {
        return {
            ...super.getInspectorConfig(),
            headerText: 'Output port',
            headerHint: 'Module output',
            headerSymbol: 'OUT',
        };
    }
}
