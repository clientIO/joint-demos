import { util } from '@joint/plus';
import HdlCell from './HdlCell';
import { NodeTypes } from '../const';
import { symbolBodyAttributes } from '../theme';

import type { HdlPort } from './HdlNode';
import type { HdlCellAttributes } from './HdlCell';

const markup = util.svg/* xml*/`
    <rect @selector="background"/>
    <rect @selector="body" class="node-body"/>
    <text @selector="label"/>
`;

const WIDTH = 60;
const BODY_HEIGHT = 60;
const PIN_LENGTH = 10;

/**
 * Pin names displayed inside the register symbol.
 */
const pinNames: Record<string, string> = {
    D: 'D',
    EN: 'EN',
    Q: 'Q',
    ARST: 'R',
};

/**
 * Vertical positions of the west side pins (on the grid).
 */
const westPinY: Record<string, number> = {
    D: 20,
    EN: 30,
    CLK: 40,
};

/**
 * Vertical position of the output pin (on the grid).
 */
const OUTPUT_PIN_Y = 20;

/**
 * A register (flip-flop). The clock input is marked with a triangle,
 * the reset input is at the bottom.
 */
export default class Register extends HdlCell {

    static type = NodeTypes.Register;

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<HdlCellAttributes> {
        return util.defaultsDeep({
            type: NodeTypes.Register,
            size: { width: WIDTH, height: BODY_HEIGHT },
            attrs: {
                body: {
                    ...symbolBodyAttributes,
                    x: PIN_LENGTH,
                    y: 0,
                    width: WIDTH - PIN_LENGTH * 2,
                    height: BODY_HEIGHT,
                },
            }
        }, super.defaults());
    }

    protected updateSymbol() {
        const hasBottomPins = this.getSidePorts('SOUTH').length > 0;
        this.resize(WIDTH, hasBottomPins ? BODY_HEIGHT + PIN_LENGTH : BODY_HEIGHT);
    }

    getPortDefinitions(): HdlPort[] {
        const inputs = this.getSidePorts('WEST');
        const resets = this.getSidePorts('SOUTH');
        const outputs = this.getSidePorts('EAST');
        return [
            ...inputs.map((port, index) => this.createPort(port, 0, westPinY[port.id] ?? 20 + index * 10, { name: pinNames[port.id] })),
            ...resets.map(port => this.createPort(port, WIDTH / 2, BODY_HEIGHT + PIN_LENGTH, { name: pinNames[port.id] })),
            ...outputs.map(port => this.createPort(port, WIDTH, OUTPUT_PIN_Y, { name: pinNames[port.id] })),
        ];
    }
}
