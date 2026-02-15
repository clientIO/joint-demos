import { shapes, util } from '@joint/core';

export const PORT_RADIUS = 7;

const LABEL_FONT_SIZE = 13;
const LABEL_MARGIN = 5;
const PORT_START_Y = LABEL_FONT_SIZE + LABEL_MARGIN * 2;
const PORT_SPACING = PORT_RADIUS * 2 + 10;

const portCircleAttrs = {
    cursor: 'crosshair',
    fill: '#4D64DD',
    stroke: '#F4F7F6',
    r: PORT_RADIUS,
};

export class Node extends shapes.standard.Rectangle {
    static PORT_RADIUS = PORT_RADIUS;

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
                        position: {
                            name: 'line',
                            args: {
                                start: { x: 0, y: PORT_START_Y },
                                end: { x: 0, y: 'calc(h)' },
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
                        position: {
                            name: 'line',
                            args: {
                                start: { x: 'calc(w)', y: PORT_START_Y },
                                end: { x: 'calc(w)', y: 'calc(h)' },
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
