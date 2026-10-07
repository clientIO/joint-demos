import { util } from '@joint/plus';
import HdlNode, { alignToGrid, measureText } from './HdlNode';
import { Attribute, NodeTypes } from '../const';
import { symbolBodyAttributes, symbolTextAttributes } from '../theme';

import type { HdlNodeAttributes, HdlPort } from './HdlNode';
import type { BlockPort, InspectorConfig } from '../types';

const markup = util.svg/* xml*/`
    <rect @selector="background"/>
    <rect @selector="body" class="node-body"/>
    <text @selector="header"/>
    <text @selector="label"/>
`;

const PIN_LENGTH = 10;
const HEADER_HEIGHT = 20;
const STEP = 20;
const MIN_WIDTH = 80;

interface BlockAttributes extends HdlNodeAttributes {
    [Attribute.CellType]?: string;
    [Attribute.CellPorts]?: BlockPort[];
}

/**
 * A generic box with named pins. It represents submodule instances
 * and the cells which are not (yet) defined in the registry.
 */
export default class Block extends HdlNode<BlockAttributes> {

    static type = NodeTypes.Block;

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<BlockAttributes> {
        return util.defaultsDeep({
            type: NodeTypes.Block,
            [Attribute.CellPorts]: [],
            size: { width: MIN_WIDTH, height: 60 },
            attrs: {
                body: {
                    ...symbolBodyAttributes,
                    x: PIN_LENGTH,
                    y: 0,
                },
                header: {
                    ...symbolTextAttributes,
                    x: 'calc(w/2)',
                    y: HEADER_HEIGHT / 2 + 2,
                    fontWeight: 'bold',
                }
            }
        }, super.defaults());
    }

    getCellType(): string {
        return this.get(Attribute.CellType) || '';
    }

    getCellPorts(): BlockPort[] {
        return this.get(Attribute.CellPorts) || [];
    }

    private getSidePorts() {
        const ports = this.getCellPorts();
        return {
            inputs: ports.filter(port => port.direction === 'in'),
            outputs: ports.filter(port => port.direction === 'out'),
        };
    }

    protected updateSymbol() {
        const { inputs, outputs } = this.getSidePorts();
        const maxLength = (ports: BlockPort[]) => Math.max(0, ...ports.map(port => measureText(port.id, 9)));
        // The output pins (on the right edge) are on the grid
        const bodyWidth = alignToGrid(Math.max(
            MIN_WIDTH,
            measureText(this.getCellType()) + 20,
            maxLength(inputs) + maxLength(outputs) + 30
        ));
        const bodyHeight = HEADER_HEIGHT + Math.max(1, inputs.length, outputs.length) * STEP;
        this.resize(bodyWidth + PIN_LENGTH * 2, bodyHeight);
        this.attr({
            body: { width: bodyWidth, height: bodyHeight },
            header: { text: this.getCellType() }
        });
    }

    getPortDefinitions(): HdlPort[] {
        const { width } = this.size();
        const { inputs, outputs } = this.getSidePorts();
        const y = (index: number) => HEADER_HEIGHT + STEP / 2 + index * STEP;
        return [
            ...inputs.map((port, index) => ({ ...port, side: 'WEST' as const, x: 0, y: y(index), name: port.id })),
            ...outputs.map((port, index) => ({ ...port, side: 'EAST' as const, x: width, y: y(index), name: port.id })),
        ];
    }

    override getLabelText(): string {
        const name = this.getName();
        if (!name || name.startsWith('$')) return '';
        return name;
    }

    getInspectorConfig(): InspectorConfig {
        const config = super.getInspectorConfig();
        return {
            ...config,
            headerText: this.getCellType(),
            headerHint: 'Generic cell (not editable in this version)',
            headerSymbol: 'BOX',
            inputs: {
                [Attribute.Name]: {
                    type: 'text',
                    label: 'Name',
                    group: 'general',
                }
            }
        };
    }
}
