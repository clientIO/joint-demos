import { dia, util } from '@joint/core';

const DATE_BODY_WIDTH = 15;
const MARKER_RADIUS = 4.5;

export class StencilPlaceholder extends dia.Element {
    
    defaults() {
        return util.defaultsDeep({
            type: 'timeline.StencilPlaceholder',
            size: { width: 1, height: 1 },
            attrs: {
                body: {
                    rx: 8,
                    ry: 8,
                    width: 'calc(w)',
                    height: 'calc(h)',
                },
                text: {
                    ref: 'body',
                    fontSize: 16,
                    fontFamily: 'Nunito Sans',
                    fontWeight: 'bold',
                    textVerticalAnchor: 'middle',
                    y: 'calc(h/2)'
                }
            }
        }, super.defaults);
    }
    
    preinitialize(attributes, options) {
        super.preinitialize(attributes, options);
        
        this.markup = util.svg /* xml */ `
            <rect @selector="body" />
            <text @selector="text" />
            <rect @selector="dateBody" />
            <circle @selector="dateMarker" />
        `;
    }
    
    static create(type) {
        
        let attrs = {};
        
        const isCategory = type === 'Category';
        
        if (isCategory) {
            attrs = {
                body: {
                    fill: '#DCE9FE',
                },
                text: {
                    text: type,
                    textAnchor: 'middle',
                    fill: '#3B5FAA',
                    x: 'calc(w/2)',
                }
            };
        }
        else {
            attrs = {
                body: {
                    stroke: '#C7C7C7',
                    fill: 'transparent',
                    strokeWidth: 0.5
                },
                text: {
                    text: type,
                    fill: '#656565',
                    textAnchor: 'start',
                    x: 31,
                },
                dateBody: {
                    width: DATE_BODY_WIDTH,
                    height: 13,
                    x: 10,
                    y: `calc(h / 2 - ${DATE_BODY_WIDTH / 2})`,
                    stroke: '#D2E2F9',
                    strokeWidth: 0.5,
                    fill: '#DCE9FE',
                    rx: 3,
                    ry: 3,
                    filter: {
                        name: 'dropShadow',
                        args: {
                            dx: 0,
                            dy: 1,
                            blur: 4,
                            color: '#130E5242'
                        }
                    },
                },
                dateMarker: {
                    ref: 'dateBody',
                    cx: 'calc(w / 2 + calc(x))',
                    cy: 'calc(h / 2 + calc(y))',
                    fill: '#3C5B8559',
                    r: MARKER_RADIUS,
                }
            };
        }
        
        const width = isCategory ? 88 : 84;
        
        const placeholder = new StencilPlaceholder({
            id: `placeholder-${type.toLowerCase()}`,
            dropType: `timeline.${type}`,
            size: { width, height: 38 },
            attrs
        });
        return placeholder;
    }
}
