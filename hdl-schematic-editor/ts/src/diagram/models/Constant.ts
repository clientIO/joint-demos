import { util } from '@joint/plus';
import HdlNode, { alignToGrid, measureText } from './HdlNode';
import { Attribute, NodeTypes } from '../const';
import Theme, { symbolTextAttributes } from '../theme';

import type { HdlNodeAttributes, HdlPort } from './HdlNode';
import type { InspectorConfig } from '../types';

const markup = util.svg/* xml*/`
    <rect @selector="background"/>
    <rect @selector="body" class="node-body"/>
    <text @selector="value"/>
    <text @selector="label"/>
`;

const HEIGHT = 20;
const PIN_LENGTH = 10;
const PADDING = 5;

/**
 * A constant value driving a port, displayed as a Verilog literal (e.g. 4'b1010 or 8'h0f).
 */
export default class Constant extends HdlNode {

    static type = NodeTypes.Constant;

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<HdlNodeAttributes> {
        return util.defaultsDeep({
            type: NodeTypes.Constant,
            [Attribute.Value]: '0',
            size: { width: 40, height: HEIGHT },
            attrs: {
                body: {
                    height: HEIGHT,
                    rx: 3,
                    ry: 3,
                    fill: Theme.PaperColor,
                    stroke: Theme.ConstantColor,
                    strokeWidth: Theme.SymbolStrokeWidth,
                },
                value: {
                    ...symbolTextAttributes,
                    fill: Theme.ConstantColor,
                    y: HEIGHT / 2,
                }
            }
        }, super.defaults());
    }

    getValue(): string {
        const value = `${this.get(Attribute.Value) ?? ''}`;
        return /^[01xz]+$/.test(value) ? value : '0';
    }

    /**
     * Get the Verilog literal of the value.
     */
    getLiteral(): string {
        const value = this.getValue();
        const width = value.length;
        if (width >= 4 && /^[01]+$/.test(value)) {
            const hex = parseInt(value, 2).toString(16).padStart(Math.ceil(width / 4), '0');
            return `${width}'h${hex}`;
        }
        return `${width}'b${value}`;
    }

    protected updateSymbol() {
        const text = this.getLiteral();
        // The pin end is on the grid
        const bodyWidth = alignToGrid(measureText(text) + PADDING * 2 + PIN_LENGTH) - PIN_LENGTH;
        this.resize(bodyWidth + PIN_LENGTH, HEIGHT);
        this.attr({
            body: { width: bodyWidth },
            value: { x: bodyWidth / 2, text }
        });
    }

    getPortDefinitions(): HdlPort[] {
        const { width } = this.size();
        return [{ id: 'Y', direction: 'out', side: 'EAST', width: this.getValue().length, x: width, y: HEIGHT / 2, length: PIN_LENGTH }];
    }

    getInspectorConfig(): InspectorConfig {
        const config = super.getInspectorConfig();
        return {
            ...config,
            headerText: 'Constant',
            headerHint: this.getLiteral(),
            headerSymbol: 'K',
            inputs: {
                [Attribute.Value]: {
                    type: 'text',
                    label: 'Value (binary, MSB first)',
                    group: 'general',
                }
            }
        };
    }
}
