import { dia } from '@joint/plus';
import { LABEL_OFFSET } from '../app';

const BORDER_RADIUS = 5;

export class Member extends dia.Element {
    constructor() {
        super(...arguments);
        
        this.markup = [
            {
                tagName: 'rect',
                selector: 'body'
            },
            {
                tagName: 'text',
                selector: 'name'
            },
            {
                tagName: 'rect',
                selector: 'labelBg'
            },
            {
                tagName: 'text',
                selector: 'label'
            }
        ];
    }
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: 'teamOrder.Member', attrs: {
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: '#ededed',
                    strokeWidth: 0,
                    rx: BORDER_RADIUS,
                    pointerEvents: 'all'
                },
                name: {
                    fontFamily: 'sans-serif',
                    textVerticalAnchor: 'middle',
                    textAnchor: 'left',
                    fill: '#22242A',
                    y: 'calc(0.5 * h)',
                    x: LABEL_OFFSET,
                    pointerEvents: 'none'
                },
                labelBg: {
                    width: 'calc(h)',
                    height: 'calc(h)',
                    x: 'calc(w - calc(h))',
                    rx: BORDER_RADIUS,
                    pointerEvents: 'none'
                },
                label: {
                    fontFamily: 'sans-serif',
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    fill: '#FFFFFF',
                    y: 'calc(0.5 * h)',
                    x: 'calc(w - calc(0.5 * h))',
                    pointerEvents: 'none'
                }
            } });
    }
}
