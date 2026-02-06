import { dia } from '@joint/plus';

export class Header extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'kanban.Header',
            attrs: {
                root: {
                    pointerEvents: 'none'
                },
                label: {
                    x: 'calc(0.5 * w)',
                    fontSize: 24,
                    fontFamily: 'Helvetica',
                    fontWeight: 'Normal',
                    stroke: 'none',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'top'
                },
                marker: {
                    y: 'calc(h - 10)',
                    height: 10,
                    width: 'calc(w)',
                    stroke: 'none',
                }
            },
            z: -2
        };
    }

    markup = [{
        tagName: 'text',
        selector: 'label'
    }, {
        tagName: 'rect',
        selector: 'marker'
    }];

    static isHeader(cell: dia.Cell) {
        return cell.get('type') === 'kanban.Header';
    }
}
