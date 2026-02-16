import { shapes, util } from '@joint/plus';
import { portLayoutNamespace } from './port-layouts';

/**
 * The base grid step used across the diagram. All layout dimensions
 * (port offsets, port spacing, element sizes) are multiples of this value.
 * This guarantees that port centers always land on grid intersections
 * when elements snap to the grid.
 */
export const GRID_SIZE = 10;

/** Radius of the port circle in pixels. */
export const PORT_RADIUS = 7;

const LABEL_FONT_SIZE = 15;
const LABEL_MARGIN = 8;

/** Vertical distance between consecutive port centers (N * GRID_SIZE). */
const PORT_SPACING = 3 * GRID_SIZE;

/**
 * Y-offset of the first port center from the element's top edge (N * GRID_SIZE).
 * Leaves room for the label above.
 */
const PORT_START_Y = 4 * GRID_SIZE;

const portCircleAttrs = {
    cursor: 'crosshair',
    fill: '#4D64DD',
    stroke: '#F4F7F6',
    r: 'calc(s / 2)',
};

export class Node extends shapes.standard.Rectangle {
    static PORT_RADIUS = PORT_RADIUS;

    constructor(attributes?: any, options?: any) {
        super(attributes, { ...options, portLayoutNamespace });
    }

    /**
     * Calculates the element height based on the number of ports.
     * The result is always a multiple of {@link GRID_SIZE}:
     * `PORT_START_Y + max(leftPorts, rightPorts) * PORT_SPACING`.
     */
    static getHeight(leftPorts: number, rightPorts: number): number {
        const maxPorts = Math.max(leftPorts, rightPorts, 1);
        return PORT_START_Y + maxPorts * PORT_SPACING;
    }

    override defaults() {
        return util.defaultsDeep({
            type: 'Node',
            z: 2,
            attrs: {
                root: {
                    highlighterSelector: 'body',
                    magnetSelector: 'body',
                },
                body: {
                    fill: '#f0f4ff',
                    stroke: '#4665E5',
                    strokeWidth: 1,
                    rx: 6,
                    ry: 6,
                },
                label: {
                    textAnchor: 'middle',
                    fontSize: LABEL_FONT_SIZE,
                    fontFamily: 'sans-serif',
                    fontWeight: 600,
                    fill: '#333',
                    y: LABEL_MARGIN,
                    textVerticalAnchor: 'top'
                },
            },
            ports: {
                groups: {
                    left: {
                        size: {
                            width: PORT_RADIUS * 2,
                            height: PORT_RADIUS * 2,
                        },
                        position: {
                            name: 'vertical',
                            args: {
                                x: 0,
                                y: PORT_START_Y,
                                dy: PORT_SPACING,
                            },
                        },
                        attrs: {
                            circle: {
                                ...portCircleAttrs,
                                magnet: 'passive',
                            },
                        },
                        label: {
                            position: {
                                name: 'inside',
                            },
                            markup: [{
                                tagName: 'text',
                                selector: 'label',
                            }],
                            attrs: {
                                label: {
                                    fontSize: 11,
                                    fill: '#333',
                                },
                            },
                        },
                    },
                    right: {
                        size: {
                            width: PORT_RADIUS * 2,
                            height: PORT_RADIUS * 2,
                        },
                        position: {
                            name: 'vertical',
                            args: {
                                x: 'w',
                                y: PORT_START_Y,
                                dy: PORT_SPACING,
                            },
                        },
                        attrs: {
                            circle: {
                                ...portCircleAttrs,
                                magnet: 'active',
                            },
                        },
                        label: {
                            position: {
                                name: 'inside',
                            },
                            markup: [{
                                tagName: 'text',
                                selector: 'label',
                            }],
                            attrs: {
                                label: {
                                    fontSize: 11,
                                    fill: '#333',
                                },
                            },
                        },
                    },
                },
            },
        }, super.defaults);
    }
}
