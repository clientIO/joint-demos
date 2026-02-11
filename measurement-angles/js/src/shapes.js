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
