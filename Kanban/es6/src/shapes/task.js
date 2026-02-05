import { dia } from '@joint/plus';

export class Task extends dia.Element {
    constructor() {
        super(...arguments);
        
        this.markup = [{
                tagName: 'rect',
                selector: 'body'
            }, {
                tagName: 'rect',
                selector: 'header'
            }, {
                tagName: 'text',
                selector: 'headerText'
            }, {
                tagName: 'text',
                selector: 'bodyText'
            }];
    }
    defaults() {
        return Object.assign(Object.assign({}, super.defaults), { type: 'kanban.Task', attrs: {
                body: {
                    fill: '#FFF',
                    height: 'calc(h)',
                    width: 'calc(w)',
                    strokeWidth: 1,
                    rx: 4,
                    ry: 4,
                    stroke: '#DDDDDD',
                },
                header: {
                    fill: 'transparent',
                    stroke: 'none',
                    height: 40,
                    width: 'calc(w)'
                },
                headerText: {
                    cursor: 'text',
                    x: 20,
                    y: 20,
                    fontWeight: 'Bold',
                    fontFamily: 'Helvetica',
                    textVerticalAnchor: 'top',
                    textAnchor: 'start',
                    fontSize: 17,
                    fill: '#333',
                    textWrap: {
                        maxLineCount: 1,
                        ellipsis: true,
                        width: -40
                    }
                },
                bodyText: {
                    cursor: 'text',
                    x: 20,
                    y: 55,
                    textVerticalAnchor: 'top',
                    textAnchor: 'start',
                    fontWeight: 'Normal',
                    fontFamily: 'Helvetica',
                    lineHeight: '1.5em',
                    textWrap: {
                        width: -40,
                        ellipsis: true,
                        height: -55
                    },
                    fontSize: 16,
                    fill: '#666',
                }
            }, z: 2 });
    }
    
    static isTask(cell) {
        return cell.get('type') === 'kanban.Task';
    }
}
