import { dia, shapes } from '@joint/plus';

export class Node extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'ast.Node',
            attrs: {
                rect: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    rx: 5,
                    ry: 5,
                    stroke: 'none',
                    cursor: 'pointer'
                },
                text: {
                    textWrap: { width: -30 },
                    pointerEvents: 'none',
                    x: 'calc(0.5 * w)',
                    y: 'calc(0.5 * h)',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    fill: 'white',
                    fontSize: 10,
                    fontFamily: '\'Helvetica Neue Light\',\'Helvetica Neue\',\'Source Sans Pro\',sans-serif',
                    letterSpacing: '1px'
                }
            },
        };
    }
    
    markup = [{
            tagName: 'rect',
            selector: 'rect'
        }, {
            tagName: 'text',
            selector: 'text',
        }];
}

export class Link extends shapes.standard.Link {
    defaults() {
        return {
            ...super.defaults,
            type: 'ast.Link',
            attrs: {
                line: {
                    connection: true,
                    fill: 'none',
                    stroke: '#666',
                    strokeWidth: 2,
                    pointerEvents: 'none',
                    targetMarker: {
                        type: 'path',
                        fill: '#666',
                        stroke: '#666',
                        d: 'M 4 -4 0 0 4 4 z'
                    }
                }
            }
        };
    }
}

export const astShapes = {
    ast: {
        Node,
        Link
    }
};
