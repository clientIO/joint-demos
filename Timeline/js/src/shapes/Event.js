import { dia, util } from '@joint/core';
import { TOP_COLOR, BOTTOM_COLOR, TOP_TEXT_COLOR, BOTTOM_TEXT_COLOR } from '../config';

const PADDING = 24;

const DATE_PADDING = 6;
const DATE_MARKER_RADIUS = 6;
const DATE_WIDTH = 112;
const DATE_HEIGHT = 24;

const TOP_MARKER_COLOR = '#3C5B8559';
const BOTTOM_MARKER_COLOR = '#0D7E544D';

export class Event extends dia.Element {
    defaults() {
        return util.defaultsDeep({
            type: 'timeline.Event',
            size: { width: 224, height: 228 },
            attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 20,
                    ry: 20,
                    fill: '#FAFAFA',
                    cursor: 'grab'
                },
                bodyText: {
                    textVerticalAnchor: 'top',
                    fontFamily: 'Nunito Sans',
                    fontWeight: 'bold',
                    fontSize: 15.5,
                    letterSpacing: '0',
                    lineHeight: '1.25em',
                    fill: '#656565',
                    x: PADDING,
                    y: PADDING,
                    textWrap: {
                        width: -2 * PADDING,
                        maxLineCount: 7,
                        ellipsis: true
                    },
                    cursor: 'text',
                    event: 'edit',
                },
                dateBody: {
                    stroke: '#D2E2F9',
                    strokeWidth: 0.5,
                    fill: '#DCE9FE',
                    width: DATE_WIDTH,
                    height: DATE_HEIGHT,
                    rx: 6,
                    ry: 6,
                    x: PADDING,
                    y: `calc(h - ${PADDING + DATE_HEIGHT})`,
                    cursor: 'text',
                    event: 'edit',
                },
                dateMarker: {
                    ref: 'dateBody',
                    cx: `calc(x + ${DATE_MARKER_RADIUS + DATE_PADDING})`,
                    cy: 'calc(h / 2 + calc(y))',
                    fill: TOP_MARKER_COLOR,
                    rx: DATE_MARKER_RADIUS,
                    ry: DATE_MARKER_RADIUS,
                    pointerEvents: 'none'
                },
                dateText: {
                    ref: 'dateBody',
                    textAnchor: 'start',
                    textVerticalAnchor: 'middle',
                    fontFamily: 'Nunito Sans',
                    fontSize: 12,
                    fontWeight: 'bold',
                    fill: '#3C5B85',
                    x: `calc(x + ${DATE_PADDING + DATE_MARKER_RADIUS * 2 + DATE_PADDING})`,
                    y: 'calc(h / 2 + calc(y))',
                    pointerEvents: 'none'
                }
            }
        }, super.defaults);
    }
    
    preinitialize(attributes, options) {
        super.preinitialize(attributes, options);
        
        this.markup = util.svg /* xml */ `
            <rect @selector="body" />
            <text @selector="bodyText" />
            <rect @selector="dateBody" />
            <ellipse @selector="dateMarker" />
            <text @selector="dateText" />
        `;
    }
    
    initialize() {
        
        super.initialize(...arguments);
        
        this.on('change:direction', () => this.updateDatePosition());
    }
    
    updateDatePosition() {
        
        const direction = this.get('direction');
        const isTop = direction === 'T';
        const dateColor = isTop ? TOP_COLOR : BOTTOM_COLOR;
        const dateMarkerColor = isTop ? TOP_MARKER_COLOR : BOTTOM_MARKER_COLOR;
        const dateTextColor = isTop ? TOP_TEXT_COLOR : BOTTOM_TEXT_COLOR;
        
        this.attr({
            dateBody: {
                fill: dateColor
            },
            dateMarker: {
                fill: dateMarkerColor
            },
            dateText: {
                fill: dateTextColor
            }
        });
    }
    
    isConnectionValid(_type) {
        return false;
    }
    
    getEditableFields() {
        return [
            { property: 'label', inputType: 'textarea', attrPath: 'bodyText/text' },
            { property: 'date', inputType: 'text', attrPath: 'dateText/text' }
        ];
    }
    
    static create(id, date, label, direction) {
        
        return new Event({
            id,
            direction,
            attrs: {
                bodyText: {
                    text: label
                },
                dateText: {
                    text: date
                }
            }
        });
    }
}
