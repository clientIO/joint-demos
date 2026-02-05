import { shapes, util } from '@joint/plus';

const color = '#F93943';

export class Dependency extends shapes.standard.Link {

    defaults() {
        return util.defaultsDeep({
            z: 3,
            type: 'kanban.Dependency',
            attrs: util.defaultsDeep({
                line: {
                    stroke: color,
                    strokeDasharray: '5,5',
                    targetMarker: {
                        d: 'M 0 0 7 5 7 -5'
                    }
                }
            }),
            labels: [{
                position: 0.3,
                attrs: {
                    text: {
                        fontSize: 8,
                        fontFamily: 'sans-serif',
                        text: 'depends on',
                        fill: 'white'
                    },
                    rect: {
                        fill: color,
                        stroke: color,
                        strokeWidth: 5,
                        rx: 1,
                        ry: 1
                    }
                }
            }]
        }, super.defaults);
    }
}
