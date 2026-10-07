import { util } from '@joint/plus';
import Node from './Node';
import { Attribute } from '../const';
import Theme, { nodeLabelAttributes, pinAttributes, pinNameAttributes, portBodyAttributes, symbolLineAttributes } from '../theme';
import { config } from '../../system/configs/system';

import type { dia } from '@joint/plus';
import type { NodeAttributes } from './Node';
import type { InspectorConfig } from '../types';
import type { PortDirection, PortSide } from '../../registry/types';

/**
 * The geometry of a port (pin) of an HDL node.
 */
export interface HdlPort {
    id: string;
    direction: PortDirection;
    side: PortSide;
    /** Width of the port in bits */
    width: number;
    /** Position of the pin end (relative to the node) */
    x: number;
    y: number;
    /** Length of the pin line drawn from the pin end towards the symbol body */
    length?: number;
    /** Name displayed next to the pin (inside the symbol) */
    name?: string;
    /** Draw an inverting bubble at the symbol body */
    inverted?: boolean;
    /** Draw a clock triangle (edge-triggered input) */
    clock?: boolean;
}

export interface HdlNodeAttributes extends NodeAttributes {
    [Attribute.Name]?: string;
}

const PORT_LENGTH = 10;
const LABEL_MARGIN = 4;
const LABEL_HEIGHT = 12;
const LABEL_FONT_SIZE = 10;
const BUBBLE_RADIUS = 3;
const CLOCK_SIZE = 5;

const portMarkup = util.svg/* xml*/`
    <path @selector="pin"/>
    <circle @selector="bubble"/>
    <path @selector="clock"/>
    <text @selector="pinName"/>
    <circle @selector="portBody" class="port-body"/>
`;

const portGroup = {
    position: {
        name: 'absolute'
    },
    size: {
        // The pin end is the exact connection point
        width: 0,
        height: 0
    },
    attrs: {
        pin: pinAttributes,
        bubble: {
            ...symbolLineAttributes,
            fill: Theme.SymbolFillColor,
            r: BUBBLE_RADIUS,
        },
        clock: symbolLineAttributes,
        pinName: pinNameAttributes,
        portBody: portBodyAttributes,
    },
    markup: portMarkup
};

/**
 * Base class for all HDL nodes. It renders the ports (pins) from the
 * port definitions returned by `getPortDefinitions()`.
 */
export default abstract class HdlNode<A extends HdlNodeAttributes = HdlNodeAttributes> extends Node<A> {

    /**
     * Attributes which change the appearance of the node.
     */
    static updateAttributes: string[] = [
        Attribute.Name,
        Attribute.Width,
        Attribute.Value,
        Attribute.CellType,
        Attribute.Parameters,
        Attribute.CellPorts,
        Attribute.Ranges,
    ];

    override defaults(): Partial<A> {
        return {
            ...super.defaults(),
            // The menu button sits on the top-right corner, touching the node (so the pointer
            // can move from the node to the button directly) without covering any pin
            [Attribute.ContextMenu]: { x: `calc(w - ${Theme.NodeToolSize / 2})`, y: -Theme.NodeToolSize },
            ports: {
                items: [],
                groups: {
                    [config.inboundPortGroupName]: portGroup,
                    [config.outboundPortGroupName]: portGroup
                }
            },
            attrs: {
                root: {
                    magnet: false,
                    cursor: 'pointer',
                },
                // An invisible area covering the whole node, so the node stays
                // hovered (and clickable) between the parts of the symbol
                background: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: 'transparent',
                    stroke: 'none',
                },
                label: {
                    ...nodeLabelAttributes,
                    fontSize: LABEL_FONT_SIZE,
                    x: 'calc(w/2)',
                }
            }
        };
    }

    override initialize(attributes: A, options: dia.Cell.Options): void {
        super.initialize(attributes, options);
        this.update();
        this.on('change', this.onChange);
    }

    protected onChange(_model: this, options: dia.Cell.Options) {
        if (options.layout) return;
        const changed = Object.keys(this.changedAttributes() || {});
        const updateAttributes = (this.constructor as typeof HdlNode).updateAttributes;
        if (changed.some(attribute => updateAttributes.includes(attribute))) {
            this.update();
        }
    }

    /**
     * Update the symbol, the size and the ports of the node.
     */
    update() {
        this.updateSymbol();
        this.updatePorts();
        this.updateLabel();
    }

    /**
     * Update the shape specific attributes (symbol, size).
     */
    protected abstract updateSymbol(): void;

    /**
     * The ports of the node with their geometry.
     */
    abstract getPortDefinitions(): HdlPort[];

    getName(): string {
        return this.get(Attribute.Name) || '';
    }

    /**
     * Text displayed below the node.
     */
    getLabelText(): string {
        return '';
    }

    /**
     * The label is displayed above the node if there are pins at the bottom.
     */
    isLabelAbove(): boolean {
        return this.getPortDefinitions().some(port => port.side === 'SOUTH');
    }

    updateLabel() {
        const above = this.isLabelAbove();
        this.attr(['label'], {
            text: this.getLabelText(),
            y: above ? -LABEL_MARGIN : `calc(h+${LABEL_MARGIN})`,
            textVerticalAnchor: above ? 'bottom' : 'top'
        });
    }

    override getLabelsRelativeRects(): dia.BBox[] {
        const text = this.getLabelText();
        if (!text) return [];
        const { width, height } = this.size();
        const textWidth = measureText(text, LABEL_FONT_SIZE);
        return [{
            x: (width - textWidth) / 2,
            y: this.isLabelAbove() ? -LABEL_HEIGHT - LABEL_MARGIN : height + LABEL_MARGIN,
            width: textWidth,
            height: LABEL_HEIGHT
        }];
    }

    updatePorts() {
        const items = this.getPortDefinitions().map(port => this.createPortItem(port));
        this.prop(['ports', 'items'], items, { rewrite: true });
    }

    protected createPortItem(port: HdlPort): dia.Element.Port {
        const { id, direction, side, x, y, inverted = false, clock = false, name = '' } = port;
        const length = port.length ?? PORT_LENGTH;
        // Direction from the pin end towards the symbol body
        const [dx, dy] = side === 'WEST' ? [1, 0] : side === 'EAST' ? [-1, 0] : [0, -1];
        const pinLength = inverted ? length - BUBBLE_RADIUS * 2 : length;

        const pinName: Record<string, unknown> = { text: name };
        const nameOffset = 4 + (clock ? CLOCK_SIZE + 4 : 0);
        switch (side) {
            case 'WEST':
                Object.assign(pinName, { x: length + nameOffset, y: 0, textAnchor: 'start' });
                break;
            case 'EAST':
                Object.assign(pinName, { x: -length - nameOffset, y: 0, textAnchor: 'end' });
                break;
            case 'SOUTH':
                Object.assign(pinName, { x: 0, y: -length - 7, textAnchor: 'middle' });
                break;
        }

        return {
            id,
            group: direction === 'in' ? config.inboundPortGroupName : config.outboundPortGroupName,
            args: { x, y },
            attrs: {
                pin: {
                    d: `M 0 0 L ${dx * pinLength} ${dy * pinLength}`,
                    strokeWidth: port.width > 1 ? Theme.SymbolStrokeWidth * 2 : Theme.SymbolStrokeWidth,
                },
                bubble: {
                    display: inverted ? 'block' : 'none',
                    cx: dx * (length - BUBBLE_RADIUS),
                    cy: dy * (length - BUBBLE_RADIUS),
                },
                clock: {
                    display: clock ? 'block' : 'none',
                    // A triangle inside the symbol body
                    d: side === 'WEST'
                        ? `M ${length} ${-CLOCK_SIZE} L ${length + CLOCK_SIZE + 2} 0 L ${length} ${CLOCK_SIZE}`
                        : ''
                },
                pinName,
                portBody: {
                    // Used by the tooltip
                    dataTooltip: port.width > 1 ? `${id} [${port.width - 1}:0]` : id,
                    dataTooltipPosition: side === 'WEST' ? 'right' : side === 'EAST' ? 'left' : 'top'
                }
            }
        };
    }

    /**
     * Get the width in bits of the given port.
     */
    getPortWidth(portId: string): number {
        const port = this.getPortDefinitions().find(port => port.id === portId);
        return port ? port.width : 1;
    }

    /**
     * Get the port the user most likely wants to connect to (or from).
     */
    getPrimaryPortId(direction: PortDirection): string | null {
        const port = this.getPortDefinitions().find(port => port.direction === direction && port.side !== 'SOUTH');
        return port ? port.id : null;
    }

    getInspectorConfig(): InspectorConfig {
        return {
            ...super.getInspectorConfig(),
            groups: {
                general: {
                    label: 'General',
                    index: 1
                }
            },
            inputs: {}
        };
    }
}

/**
 * Distribute the given number of ports evenly along a side of the given length.
 * The positions are aligned to the grid.
 */
export function distribute(count: number, length: number, grid = 10): number[] {
    const positions: number[] = [];
    const step = length / (count + 1);
    for (let i = 1; i <= count; i++) {
        positions.push(Math.round(step * i / grid) * grid);
    }
    return positions;
}

/**
 * Round the length up to whole grid cells, so the pins placed at the edges
 * of a shape (positioned on the grid) are on the grid too.
 */
export function alignToGrid(length: number): number {
    return Math.ceil(length / Theme.GridSize) * Theme.GridSize;
}

/**
 * Estimate the width of a text rendered with the diagram font.
 */
export function measureText(text: string, fontSize = Theme.FontSize): number {
    return Math.ceil(text.length * Theme.CharWidth * fontSize / Theme.FontSize);
}
