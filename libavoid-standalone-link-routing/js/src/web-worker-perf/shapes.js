import { dia, shapes } from '@joint/core';

const PORT_RADIUS = 7;
const MAIN_COLOR = '#4D64DD';
const DARK_COLOR = '#322A49';
const BORDER_COLOR = '#D4D4D4';
const LIGHT_COLOR = '#FFFFFF';
const MUTED_COLOR = '#655E77';

const inPortAttrs = {
    portBody: {
        fill: MAIN_COLOR,
        stroke: LIGHT_COLOR,
        strokeWidth: 2,
        magnet: 'passive',
        r: PORT_RADIUS
    }
};

const outPortAttrs = {
    portBody: {
        fill: MAIN_COLOR,
        stroke: LIGHT_COLOR,
        strokeWidth: 2,
        magnet: 'active',
        r: PORT_RADIUS,
        cursor: 'crosshair'
    }
};

const portMarkup = [{ tagName: 'circle', selector: 'portBody' }];

export const Message = dia.Element.define(
    'app.Message',
    {
        size: { width: 344, height: 80 },
        attrs: {
            root: {
                highlighterSelector: 'body',
                magnetSelector: 'body'
            },
            body: {
                width: 'calc(w)',
                height: 'calc(h)',
                fill: LIGHT_COLOR,
                stroke: BORDER_COLOR,
                strokeWidth: 1,
                rx: 4,
                ry: 4
            },
            icon: {
                width: 24,
                height: 24,
                x: 16,
                y: 'calc(0.5 * h - 12)',
                preserveAspectRatio: 'xMidYMid meet',
                xlinkHref:
                    'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iYmxhY2siIHdpZHRoPSIxOHB4IiBoZWlnaHQ9IjE4cHgiPjxwYXRoIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMjEgMy4wMUgzYy0xLjEgMC0yIC45LTIgMlY5aDJWNC45OWgxOHYxNC4wM0gzVjE1SDF2NC4wMWMwIDEuMS45IDEuOTggMiAxLjk4aDE4YzEuMSAwIDItLjg4IDItMS45OHYtMTRjMC0xLjExLS45LTItMi0yek0xMSAxNmw0LTQtNC00djNIMXYyaDEwdjN6Ii8+PC9zdmc+'
            },
            label: {
                x: 54,
                y: 'calc(0.5 * h)',
                textVerticalAnchor: 'middle',
                textAnchor: 'start',
                fill: DARK_COLOR,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontWeight: 600,
                fontSize: 15,
                textWrap: {
                    width: -70,
                    maxLineCount: 1,
                    ellipsis: true
                },
                text: 'Message'
            }
        },
        ports: {
            groups: {
                in: {
                    position: 'top',
                    attrs: inPortAttrs,
                    markup: portMarkup
                },
                out: {
                    position: 'bottom',
                    attrs: outPortAttrs,
                    markup: portMarkup
                }
            },
            items: []
        }
    },
    {
        markup: [
            { tagName: 'rect', selector: 'body' },
            { tagName: 'image', selector: 'icon' },
            { tagName: 'text', selector: 'label' }
        ]
    }
);

export const FlowchartStart = dia.Element.define(
    'app.FlowchartStart',
    {
        size: { width: 48, height: 48 },
        attrs: {
            root: {
                highlighterSelector: 'body',
                magnetSelector: 'body'
            },
            body: {
                cx: 'calc(0.5 * w)',
                cy: 'calc(0.5 * h)',
                r: 'calc(0.5 * w)',
                fill: MAIN_COLOR,
                stroke: 'none'
            },
            label: {
                x: 'calc(0.5 * w)',
                y: -10,
                textAnchor: 'middle',
                textVerticalAnchor: 'bottom',
                fill: MUTED_COLOR,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: 13,
                fontWeight: 500,
                text: 'Start'
            }
        },
        ports: {
            groups: {
                out: {
                    position: 'bottom',
                    attrs: {
                        portBody: {
                            fill: DARK_COLOR,
                            stroke: LIGHT_COLOR,
                            strokeWidth: 2,
                            magnet: 'active',
                            r: PORT_RADIUS,
                            cursor: 'crosshair'
                        }
                    },
                    markup: portMarkup
                }
            },
            items: []
        }
    },
    {
        markup: [
            { tagName: 'circle', selector: 'body' },
            { tagName: 'text', selector: 'label' }
        ]
    }
);

export const Link = shapes.standard.Link.define(
    'app.Link',
    {
        z: 1,
        attrs: {
            line: {
                stroke: DARK_COLOR,
                strokeWidth: 1.5,
                targetMarker: { d: 'M 6 3 0 0 6 -3 Z', fill: DARK_COLOR, stroke: DARK_COLOR }
            }
        },
        defaultLabel: {
            markup: [
                { tagName: 'rect', selector: 'labelBody' },
                { tagName: 'text', selector: 'labelText' }
            ],
            attrs: {
                labelText: {
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    fontSize: 12,
                    fill: DARK_COLOR,
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    pointerEvents: 'none'
                },
                labelBody: {
                    ref: 'labelText',
                    fill: '#F3F7F6',
                    stroke: '#F3F7F6',
                    strokeWidth: 2,
                    x: 'calc(x - 4)',
                    y: 'calc(y - 2)',
                    width: 'calc(w + 8)',
                    height: 'calc(h + 4)',
                    rx: 3,
                    ry: 3
                }
            }
        }
    }
);

export const cellNamespace = {
    ...shapes,
    app: {
        Message,
        FlowchartStart,
        Link
    }
};
