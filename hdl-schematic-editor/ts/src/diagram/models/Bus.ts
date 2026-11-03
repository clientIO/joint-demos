import { util } from '@joint/plus';
import HdlNode from './HdlNode';
import { Attribute, NodeTypes } from '../const';
import Theme from '../theme';
import { rangeToPortId } from '../../yosys/import';

import type { HdlNodeAttributes, HdlPort } from './HdlNode';
import type { BitRange, InspectorConfig } from '../types';

const markup = util.svg/* xml*/`
    <rect @selector="background"/>
    <rect @selector="body" class="node-body"/>
    <text @selector="label"/>
`;

const WIDTH = 40;
const BAR_WIDTH = 4;
const STEP = 20;
const SHORT_PIN = 8;

interface BusAttributes extends HdlNodeAttributes {
    [Attribute.Ranges]?: BitRange[];
    [Attribute.Width]?: number;
}

/**
 * Base class for the nodes manipulating bits of buses.
 */
abstract class Bus extends HdlNode<BusAttributes> {

    preinitialize(): void {
        this.markup = markup;
    }

    defaults(): Partial<BusAttributes> {
        return util.defaultsDeep({
            [Attribute.Ranges]: [],
            [Attribute.ContextMenu]: null,
            size: { width: WIDTH, height: STEP },
            attrs: {
                body: {
                    width: BAR_WIDTH,
                    fill: Theme.BusColor,
                    stroke: 'none',
                },
            }
        }, super.defaults());
    }

    getRanges(): BitRange[] {
        return this.get(Attribute.Ranges) || [];
    }

    protected getHeight(): number {
        return Math.max(1, this.getRanges().length) * STEP;
    }

    getRangeLabel([lo, hi]: BitRange): string {
        return lo === hi ? `[${lo}]` : `[${hi}:${lo}]`;
    }
}

/**
 * Selects bit ranges of a bus.
 */
export class Split extends Bus {

    static type = NodeTypes.Split;

    defaults(): Partial<BusAttributes> {
        return util.defaultsDeep({
            type: NodeTypes.Split,
        }, super.defaults());
    }

    protected updateSymbol() {
        const height = this.getHeight();
        this.resize(WIDTH, height);
        this.attr(['body'], { x: SHORT_PIN, height });
    }

    getPortDefinitions(): HdlPort[] {
        const height = this.size().height;
        const width = Math.max(1, Number(this.get(Attribute.Width)) || 1);
        return [
            { id: 'A', direction: 'in', side: 'WEST', width, x: 0, y: height / 2, length: SHORT_PIN },
            ...this.getRanges().map((range, index) => ({
                id: rangeToPortId(range),
                direction: 'out' as const,
                side: 'EAST' as const,
                width: range[1] - range[0] + 1,
                x: WIDTH,
                y: STEP / 2 + index * STEP,
                length: WIDTH - SHORT_PIN - BAR_WIDTH,
                name: this.getRangeLabel(range)
            }))
        ];
    }

    protected createPortItem(port: HdlPort) {
        const item = super.createPortItem(port);
        if (port.direction === 'out') {
            // Display the range above the pin line
            Object.assign(item.attrs!.pinName as object, { x: -port.length! + 2, y: -6, textAnchor: 'start' });
        }
        return item;
    }

    getInspectorConfig(): InspectorConfig {
        return {
            ...super.getInspectorConfig(),
            headerText: 'Split',
            headerHint: 'Selects bit ranges of a bus',
            headerSymbol: '[:]',
        };
    }
}

/**
 * Concatenates bit ranges into a bus.
 */
export class Join extends Bus {

    static type = NodeTypes.Join;

    defaults(): Partial<BusAttributes> {
        return util.defaultsDeep({
            type: NodeTypes.Join,
        }, super.defaults());
    }

    protected updateSymbol() {
        const height = this.getHeight();
        this.resize(WIDTH, height);
        this.attr(['body'], { x: WIDTH - SHORT_PIN - BAR_WIDTH, height });
    }

    getPortDefinitions(): HdlPort[] {
        const height = this.size().height;
        const ranges = this.getRanges();
        const width = ranges.reduce((sum, [lo, hi]) => sum + hi - lo + 1, 0);
        return [
            ...ranges.map((range, index) => ({
                id: rangeToPortId(range),
                direction: 'in' as const,
                side: 'WEST' as const,
                width: range[1] - range[0] + 1,
                x: 0,
                y: STEP / 2 + index * STEP,
                length: WIDTH - SHORT_PIN - BAR_WIDTH,
                name: this.getRangeLabel(range)
            })),
            { id: 'Y', direction: 'out', side: 'EAST', width: Math.max(1, width), x: WIDTH, y: height / 2, length: SHORT_PIN },
        ];
    }

    protected createPortItem(port: HdlPort) {
        const item = super.createPortItem(port);
        if (port.direction === 'in') {
            // Display the range above the pin line
            Object.assign(item.attrs!.pinName as object, { x: 2, y: -6, textAnchor: 'start' });
        }
        return item;
    }

    getInspectorConfig(): InspectorConfig {
        return {
            ...super.getInspectorConfig(),
            headerText: 'Join',
            headerHint: 'Concatenates bit ranges into a bus',
            headerSymbol: '{,}',
        };
    }
}
