import { util } from '@joint/plus';
import HdlCell from './HdlCell';
import { NodeTypes } from '../const';
import { symbolBodyAttributes } from '../theme';

import type { HdlPort } from './HdlNode';
import type { HdlCellAttributes } from './HdlCell';

const markup = util.svg/* xml*/`
    <rect @selector="background"/>
    <path @selector="body" class="node-body"/>
    <text @selector="label"/>
`;

const WIDTH = 40;
const HEIGHT = 60;
const PIN_LENGTH = 10;

/**
 * A 2-to-1 multiplexer drawn as a trapezoid. The select input is at the bottom.
 */
export default class Mux extends HdlCell {

    static type = NodeTypes.Mux;

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<HdlCellAttributes> {
        return util.defaultsDeep({
            type: NodeTypes.Mux,
            size: { width: WIDTH, height: HEIGHT },
            attrs: {
                body: {
                    ...symbolBodyAttributes,
                    d: `M ${PIN_LENGTH} 0 L ${WIDTH - PIN_LENGTH} 10 L ${WIDTH - PIN_LENGTH} ${HEIGHT - 10} L ${PIN_LENGTH} ${HEIGHT} Z`
                },
            }
        }, super.defaults());
    }

    protected updateSymbol() {
        // The symbol does not depend on the parameters
    }

    getPortDefinitions(): HdlPort[] {
        const inputs = this.getSidePorts('WEST');
        const selects = this.getSidePorts('SOUTH');
        const outputs = this.getSidePorts('EAST');
        return [
            // Pin names show which input is selected by S = 0 and S = 1
            ...inputs.map((port, index) => this.createPort(port, 0, index === 0 ? 20 : 40, { name: `${index}` })),
            // The bottom edge of the trapezoid is at y = 55 in the middle
            ...selects.map(port => this.createPort(port, WIDTH / 2, HEIGHT, { length: 5 })),
            ...outputs.map(port => this.createPort(port, WIDTH, HEIGHT / 2)),
        ];
    }
}
