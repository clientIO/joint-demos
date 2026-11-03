import { util } from '@joint/plus';
import HdlCell from './HdlCell';
import { NodeTypes } from '../const';
import { symbolBodyAttributes, symbolLineAttributes } from '../theme';

import type { HdlPort } from './HdlNode';
import type { HdlCellAttributes } from './HdlCell';

const markup = util.svg/* xml*/`
    <rect @selector="background"/>
    <path @selector="body" class="node-body"/>
    <path @selector="back"/>
    <circle @selector="bubble"/>
    <text @selector="label"/>
`;

const WIDTH = 50;
const HEIGHT = 40;

interface GateSymbol {
    /** Outline of the gate body */
    body: string;
    /** Extra line behind the body (e.g. XOR) */
    back?: string;
    /** Inverted output */
    inverted?: boolean;
    /** Length of the input pins (to reach the body) */
    inputLength: number;
}

/**
 * Distinctive-shape (IEEE Std 91) gate symbols drawn in a 50x40 box.
 * The inputs are at x=0, the output at x=50, y=20.
 */
export const gateSymbols: Record<string, GateSymbol> = {
    and: {
        body: 'M 10 5 H 25 A 15 15 0 0 1 25 35 H 10 Z',
        inputLength: 10,
    },
    nand: {
        body: 'M 10 5 H 22 A 15 15 0 0 1 22 35 H 10 Z',
        inverted: true,
        inputLength: 10,
    },
    or: {
        body: 'M 8 5 Q 30 5 40 20 Q 30 35 8 35 Q 16 20 8 5 Z',
        inputLength: 10,
    },
    nor: {
        body: 'M 8 5 Q 28 5 37 20 Q 28 35 8 35 Q 16 20 8 5 Z',
        inverted: true,
        inputLength: 10,
    },
    xor: {
        body: 'M 12 5 Q 32 5 40 20 Q 32 35 12 35 Q 20 20 12 5 Z',
        back: 'M 6 5 Q 14 20 6 35',
        inputLength: 8,
    },
    xnor: {
        body: 'M 12 5 Q 30 5 37 20 Q 30 35 12 35 Q 20 20 12 5 Z',
        back: 'M 6 5 Q 14 20 6 35',
        inverted: true,
        inputLength: 8,
    },
    not: {
        body: 'M 10 8 L 34 20 L 10 32 Z',
        inverted: true,
        inputLength: 10,
    },
};

/**
 * A logic gate.
 */
export default class Gate extends HdlCell {

    static type = NodeTypes.Gate;

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<HdlCellAttributes> {
        return util.defaultsDeep({
            type: NodeTypes.Gate,
            size: { width: WIDTH, height: HEIGHT },
            attrs: {
                body: symbolBodyAttributes,
                back: symbolLineAttributes,
                bubble: {
                    ...symbolLineAttributes,
                    r: 3,
                    cx: 40,
                    cy: HEIGHT / 2,
                },
            }
        }, super.defaults());
    }

    getSymbol(): GateSymbol {
        const definition = this.getDefinition();
        return gateSymbols[definition?.symbol || 'and'] || gateSymbols.and;
    }

    protected updateSymbol() {
        const symbol = this.getSymbol();
        this.attr({
            body: { d: symbol.body },
            back: { d: symbol.back || '', display: symbol.back ? 'block' : 'none' },
            bubble: { display: symbol.inverted ? 'block' : 'none' },
        });
    }

    getPortDefinitions(): HdlPort[] {
        const symbol = this.getSymbol();
        const inputs = this.getSidePorts('WEST');
        const outputs = this.getSidePorts('EAST');
        const inputYs = inputs.length === 1 ? [HEIGHT / 2] : [10, 30];
        return [
            ...inputs.map((port, index) => this.createPort(port, 0, inputYs[index] ?? 20, { length: symbol.inputLength })),
            ...outputs.map(port => this.createPort(port, WIDTH, HEIGHT / 2, { length: symbol.inverted ? 7 : 10 })),
        ];
    }
}
