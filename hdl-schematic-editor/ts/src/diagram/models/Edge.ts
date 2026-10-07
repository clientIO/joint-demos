import { util } from '@joint/plus';
import { Attribute } from '../const';
import Theme from '../theme';
import { SystemEdge } from '../../system/diagram/models';

import type { dia } from '@joint/plus';
import type { SystemEdgeAttributes } from '../../system/diagram/models';
import type { InspectorConfig } from '../types';

export interface EdgeAttributes extends SystemEdgeAttributes {
    [Attribute.BusWidth]?: number;
    [Attribute.WidthMismatch]?: boolean;
    [Attribute.BusLabelDistance]?: number;
    [Attribute.JunctionPoints]?: dia.Point[];
}

/** SVG markup for the edge */
const edgeMarkup = util.svg/* xml */`
    <path @selector="highlight"
        class="wire-highlight"
        stroke-linejoin="round"
        stroke-linecap="round"
        stroke="transparent"
        fill="none"
        pointer-events="none"
    />
    <path @selector="wrapper"
        stroke-linejoin="round"
        stroke-linecap="round"
        stroke="transparent"
        fill="none"
        cursor="pointer"
    />
    <path @selector="line"
        stroke-linejoin="round"
        fill="none"
        pointer-events="none"
    />
    <path @selector="junctions"
        stroke="none"
        pointer-events="none"
    />
`;

/** SVG markup for the bus slash */
const busSlashMarkup = util.svg/* xml */`
    <path @selector="slash" fill="none" stroke-width="1.5"/>
`;

/** SVG markup for the bus width (the number of bits) */
const busWidthMarkup = util.svg/* xml */`
    <text @selector="text"/>
`;

/**
 * The width of the area around the wire reacting to the pointer.
 * It's constant (the hover and selection effects are drawn by the `highlight` path),
 * so the hovered state can't change the area and make it flicker.
 */
const WRAPPER_WIDTH = 10;

/** Distance of the bus width label from the wire source */
const BUS_LABEL_DISTANCE = 18;

/** Perpendicular distance of the number of bits from the wire */
const BUS_LABEL_OFFSET = 11;

/** The shortest segment the bus width label is placed on */
const MIN_LABEL_SEGMENT_LENGTH = 16;

/** The bus width label distance meaning the label is hidden */
const HIDDEN_LABEL = -1;

export default class Edge extends SystemEdge<EdgeAttributes> {

    // The type remains the same (explicitly set it here for clarity).
    // We overriding the default engine Edge with our own Edge class.
    static override type = SystemEdge.type;

    preinitialize(): void {
        this.markup = edgeMarkup;
    }

    defaults(): Partial<EdgeAttributes> {
        const attributes: Partial<EdgeAttributes> = {
            // App-specific attributes
            [Attribute.Removable]: true,
            [Attribute.Selectable]: true,
            [Attribute.BusWidth]: 1,
            [Attribute.WidthMismatch]: false,
            [Attribute.JunctionPoints]: [],
            attrs: {
                line: {
                    connection: true,
                    stroke: Theme.WireColor,
                    strokeWidth: Theme.WireWidth,
                },
                highlight: {
                    connection: true,
                },
                wrapper: {
                    connection: true,
                    // An extra buffer around the edge for easier interaction
                    strokeWidth: WRAPPER_WIDTH,
                },
                junctions: {
                    fill: Theme.WireColor,
                }
            }
        };

        return util.defaultsDeep(attributes, super.defaults());
    }

    initialize(attributes: EdgeAttributes, options: dia.Cell.Options): void {
        super.initialize(attributes, options);
        this.updateWire();
        this.updateJunctions();
        this.on(`change:${Attribute.BusWidth} change:${Attribute.WidthMismatch} change:${Attribute.BusLabelDistance}`, () => this.updateWire());
        this.on(`change:${Attribute.JunctionPoints}`, () => this.updateJunctions());
    }

    getBusWidth(): number {
        return this.get(Attribute.BusWidth) || 1;
    }

    isBus(): boolean {
        return this.getBusWidth() > 1;
    }

    hasWidthMismatch(): boolean {
        return Boolean(this.get(Attribute.WidthMismatch));
    }

    /**
     * Set the width of the wire and whether it connects ports of different widths.
     */
    setBusWidth(width: number, mismatch: boolean) {
        this.set({
            [Attribute.BusWidth]: width,
            [Attribute.WidthMismatch]: mismatch
        });
    }

    /**
     * Find a place for the bus width label along the wire defined by the given points
     * (or hide the label if no points are given, e.g. when another wire of the net shows it).
     * The label is placed on the first segment, close to the source but away from the bend.
     * If the first segment is too short, the label is placed on the longest segment.
     */
    updateBusLabelPosition(points: dia.Point[] | null) {
        if (!points) {
            this.set(Attribute.BusLabelDistance, HIDDEN_LABEL);
            return;
        }
        const segments: Array<{ start: number, length: number }> = [];
        let start = 0;
        for (let i = 1; i < points.length; i++) {
            const length = Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
            segments.push({ start, length });
            start += length;
        }
        const [first] = segments;
        let segment = first;
        if (first && first.length < MIN_LABEL_SEGMENT_LENGTH) {
            segment = segments.reduce((max, segment) => segment.length > max.length ? segment : max, first);
        }
        const distance = segment
            ? segment.start + Math.min(BUS_LABEL_DISTANCE, segment.length / 2)
            : BUS_LABEL_DISTANCE;
        this.set(Attribute.BusLabelDistance, Math.round(distance));
    }

    protected updateWire() {
        const isBus = this.isBus();
        const mismatch = this.hasWidthMismatch();
        const labelDistance = this.get(Attribute.BusLabelDistance) ?? BUS_LABEL_DISTANCE;
        const showLabel = isBus && labelDistance !== HIDDEN_LABEL;
        const color = mismatch ? Theme.ErrorColor : (isBus ? Theme.BusColor : Theme.WireColor);
        this.attr({
            root: {
                // Used to style the wire kind in CSS (e.g. in the navigator)
                dataBus: isBus ? 'true' : 'false',
                dataMismatch: mismatch ? 'true' : 'false',
            },
            line: {
                stroke: color,
                strokeWidth: isBus ? Theme.BusWidth : Theme.WireWidth,
                strokeDasharray: mismatch ? '6 3' : null,
            },
            wrapper: {
                dataTooltip: mismatch ? 'The connected ports have different widths' : null,
            },
            junctions: {
                fill: color
            }
        });
        this.labels(showLabel ? [{
            // The slash crossing the wire
            markup: busSlashMarkup,
            position: {
                distance: labelDistance,
                // Do not rotate the label with the wire
                args: { keepGradient: false }
            },
            attrs: {
                slash: {
                    d: 'M -4 5 L 4 -5',
                    stroke: color,
                }
            }
        }, {
            // The number of bits next to the slash, moved away from the wire
            // perpendicularly (above a horizontal wire, beside a vertical one)
            markup: busWidthMarkup,
            position: {
                distance: labelDistance,
                offset: -BUS_LABEL_OFFSET,
                args: { keepGradient: false }
            },
            attrs: {
                text: {
                    text: `${this.getBusWidth()}`,
                    fill: color,
                    fontFamily: Theme.FontFamily,
                    fontSize: 9,
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                }
            }
        }] : []);
        // The junction size depends on the wire width
        this.updateJunctions();
    }

    protected updateJunctions() {
        const points: dia.Point[] = this.get(Attribute.JunctionPoints) || [];
        const r = this.isBus() ? Theme.BusJunctionRadius : Theme.JunctionRadius;
        // Circles drawn as two arcs
        const d = points.map(({ x, y }) => `M ${x - r} ${y} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`).join(' ');
        this.attr(['junctions', 'd'], d || 'M 0 0');
        this.attr(['junctions', 'display'], d ? 'block' : 'none');
    }

    getInspectorConfig(): InspectorConfig {
        const width = this.getBusWidth();
        return {
            headerText: width > 1 ? 'Bus' : 'Wire',
            headerHint: width > 1 ? `${width} bits` : '1 bit',
            headerSymbol: width > 1 ? `/${width}` : '—',
            groups: {},
            inputs: {}
        };
    }
}
