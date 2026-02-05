import { shapes } from '@joint/plus';

const color = '#F93943';

export class Link extends shapes.standard.Link {
    constructor() {
        super(...arguments);
        
        this.markup = [
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
    
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: 'teamOrder.Link', attrs: {
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
            } });
    }
}
