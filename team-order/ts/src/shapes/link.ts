import { shapes } from '@joint/plus';

const color = '#F93943';

export class Link extends shapes.standard.Link {

    defaults() {
        return {
            ...super.defaults,
            type: 'teamOrder.Link',
            attrs: {
                line: {
                    connection: true,
                    stroke: color,
                    strokeLinejoin: 'round',
                    strokeDasharray: '10,2',
                    strokeWidth: 2,
                    targetMarker: {
                        d: 'M 0 0 7 5 7 -5'
                    }
                },
            },
        };
    }

    markup = [
        {
            tagName: 'path',
            selector: 'line',
            attributes: {
                'fill': 'none',
                'pointer-events': 'none'
            }
        }
    ];
}
