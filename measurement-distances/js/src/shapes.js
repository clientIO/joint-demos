import { shapes } from '@joint/plus';

export const Shape = shapes.standard.Rectangle.define('app.Shape', {
    size: { width: 100, height: 100 },
    z: 1,
    attrs: {
        body: {
            fill: '#FFFFFF',
            strokeWidth: 1,
            stroke: '#A2A2A2',
            rx: 2,
            ry: 2
        }
    }
});

export const Distance = shapes.measurement.Distance.define('app.Distance', {
    z: 2,
    attrs: {
        distanceLabel: {
            fill: '#464554',
            distanceText: {
                fixed: 1
            }
        },
        line: {
            stroke: '#464554'
        },
        anchorLines: {
            strokeDasharray: 'none',
            stroke: '#D2D2D2'
        }
    }
});

export const MainDistance = shapes.measurement.Distance.define('app.MainDistance', {
    z: 3,
    attrs: {
        distanceLabel: {
            fill: '#4666E5',
            distanceText: {
                fixed: 1
            }
        },
        line: {
            stroke: '#4666E5'
        },
        anchorLines: {
            strokeDasharray: 'none',
            stroke: '#D2D2D2'
        }
    }
});
