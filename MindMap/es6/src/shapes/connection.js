import { dia } from '@joint/plus';

export class Connection extends dia.Link {
    
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: 'Connection', attrs: {
                line: {
                    connection: true,
                    stroke: '#333333',
                    strokeWidth: 2,
                    strokeLinejoin: 'round'
                }
            } });
    }
    
    preinitialize() {
        this.markup = [{
                tagName: 'path',
                selector: 'line',
                attributes: {
                    'fill': 'none',
                    'pointer-events': 'none'
                }
            }];
    }
    
    setColor(color, opt) {
        this.attr(['line', 'stroke'], color, opt);
    }
}
