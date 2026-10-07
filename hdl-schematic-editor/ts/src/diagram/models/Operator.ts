import { util } from '@joint/plus';
import HdlCell from './HdlCell';
import { NodeTypes } from '../const';
import { symbolBodyAttributes, symbolTextAttributes } from '../theme';

import type { HdlPort } from './HdlNode';
import type { HdlCellAttributes } from './HdlCell';

const markup = util.svg/* xml*/`
    <rect @selector="background"/>
    <circle @selector="body" class="node-body"/>
    <text @selector="symbol"/>
    <text @selector="label"/>
`;

const SIZE = 40;
const RADIUS = 13;

/**
 * An arithmetic or comparison operator, drawn as a circle with the operator symbol.
 */
export default class Operator extends HdlCell {

    static type = NodeTypes.Operator;

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<HdlCellAttributes> {
        return util.defaultsDeep({
            type: NodeTypes.Operator,
            size: { width: SIZE, height: SIZE },
            attrs: {
                body: {
                    ...symbolBodyAttributes,
                    cx: SIZE / 2,
                    cy: SIZE / 2,
                    r: RADIUS,
                },
                symbol: {
                    ...symbolTextAttributes,
                    x: SIZE / 2,
                    y: SIZE / 2,
                    fontSize: 15,
                    fontWeight: 'bold',
                }
            }
        }, super.defaults());
    }

    protected updateSymbol() {
        this.attr(['symbol', 'text'], this.getDefinition()?.symbol || '?');
    }

    getPortDefinitions(): HdlPort[] {
        // Length of the pin to reach the circle at y = 10 (and y = 30)
        const inputLength = Math.round(SIZE / 2 - Math.sqrt(RADIUS * RADIUS - 100));
        const inputs = this.getSidePorts('WEST');
        const outputs = this.getSidePorts('EAST');
        return [
            ...inputs.map((port, index) => this.createPort(port, 0, index === 0 ? 10 : 30, { length: inputLength })),
            ...outputs.map(port => this.createPort(port, SIZE, SIZE / 2, { length: SIZE / 2 - RADIUS })),
        ];
    }
}
