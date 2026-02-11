import { setTheme } from '@joint/plus';
import { Path } from './shapes';
import { AppView } from './vector-editor';
import '../css/main.css';

setTheme('modern');

// styling
const fill = '#c6c7e2';
const stroke = '#6a6c8a';
const strokeWidth = 2;

// path examples
const p1 = new Path({
    position: { x: 300, y: 270 },
    size: { width: 110, height: 240 },
    attrs: {
        path: {
            refD: 'M285.8,83V52.7h8.3v31c0,3.2-1,5.8-3,7.7c-2,1.9-4.4,2.8-7.2,2.8c-2.9,0-5.6-1.2-8.1-3.5l3.8-6.1c1.1,1.3,2.3,1.9,3.7,1.9c0.7,0,1.3-0.3,1.8-0.9C285.5,85,285.8,84.2,285.8,83z',
            fill: fill,
            stroke: stroke,
            strokeWidth: strokeWidth,
            cursor: 'move'
        }
    }
});

const p2 = new Path({
    position: { x: 359, y: 200 },
    size: { width: 52, height: 52 },
    attrs: {
        path: {
            refD: 'M286.4,49c-0.9-0.9-1.4-2.1-1.4-3.4c0-1.4,0.5-2.5,1.4-3.4c0.9-0.9,2.1-1.4,3.4-1.4c1.4,0,2.5,0.5,3.4,1.4s1.4,2.1,1.4,3.4c0,1.4-0.5,2.5-1.4,3.4c-0.9,0.9-2.1,1.4-3.4,1.4C288.5,50.4,287.4,50,286.4,49z',
            fill: fill,
            stroke: stroke,
            strokeWidth: strokeWidth,
            cursor: 'move'
        }
    }
});

const p3 = new Path({
    position: { x: 430, y: 270 },
    size: { width: 144, height: 174 },
    attrs: {
        path: {
            refD: 'M321.5,73.2c0,2.9-1.1,5.3-3.2,7c-2.2,1.8-4.9,2.6-8.2,2.6c-2.2,0-4.5-0.4-6.9-1.2c-2.4-0.8-4.5-2-6.5-3.5l3.6-5.2c3.1,2.4,6.4,3.6,9.9,3.6c1.1,0,1.9-0.2,2.5-0.6c0.6-0.4,0.9-1,0.9-1.7c0-0.7-0.4-1.3-1.3-1.9c-0.9-0.6-2.1-1.1-3.8-1.7c-1.6-0.5-2.9-1-3.8-1.3c-0.9-0.4-1.8-0.9-3-1.6c-2.2-1.4-3.4-3.5-3.4-6.2c0-2.7,1.1-5,3.3-6.7c2.2-1.7,5.1-2.6,8.6-2.6c3.5,0,7,1.2,10.5,3.5l-3.1,5.5c-2.6-1.8-5.1-2.6-7.7-2.6c-2.6,0-3.8,0.7-3.8,2.1c0,0.8,0.4,1.4,1.2,1.8c0.8,0.4,2.2,1,4,1.5c1.9,0.6,3.2,1,4,1.4c0.8,0.3,1.7,0.8,2.8,1.5C320.5,68.2,321.5,70.3,321.5,73.2z',
            fill: fill,
            stroke: stroke,
            strokeWidth: strokeWidth,
            cursor: 'move'
        }
    }
});

window.appView = new AppView({
    pathFill: fill,
    pathStroke: stroke,
    pathStrokeWidth: strokeWidth,
    initialPaths: [p1, p2, p3]
});
