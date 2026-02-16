import { shapes, util } from '@joint/plus';

export class Edge extends shapes.standard.Link {
    override defaults() {
        return util.defaultsDeep({
            type: 'Edge',
            z: 2,
            attrs: {
                line: {
                    stroke: '#464454',
                    strokeWidth: 1,
                    targetMarker: { d: 'M 5 2.5 0 0 5 -2.5 Z' },
                },
            },
            router: {
                name: 'rightAngle',
            }
        }, super.defaults);
    }
}
