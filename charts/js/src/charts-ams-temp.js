import { dia, shapes } from '@joint/plus';

const graph = new dia.Graph({}, { cellNamespace: shapes });
new dia.Paper({
    el: document.getElementById('paper-ams-temp'),
    width: 800,
    height: 400,
    model: graph,
    cellViewNamespace: shapes
});

const chart = new shapes.chart.Plot({
    position: { x: 80, y: 80 },
    size: { width: 650, height: 250 },
    series: [
        {
            name: 'avg-high',
            label: 'Average High Temp (°C)',
            interpolate: 'bezier',
            data: [{ x: 1, y: 7 }, { x: 2, y: 6 }, { x: 3, y: 10 }, { x: 4, y: 11 }, { x: 5, y: 16 }, { x: 6, y: 17 }, { x: 7, y: 20 }, { x: 8, y: 20 }, { x: 9, y: 17 }, { x: 10, y: 14 }, { x: 11, y: 9 }, { x: 12, y: 7 }],
            hideFillBoundaries: true
        },
        {
            name: 'avg-low',
            label: 'Average Low Temp (°C)',
            interpolate: 'bezier',
            data: [{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 6 }, { x: 4, y: 7 }, { x: 5, y: 11 }, { x: 6, y: 11 }, { x: 7, y: 12 }, { x: 8, y: 12 }, { x: 9, y: 10 }, { x: 10, y: 9 }, { x: 11, y: 6 }, { x: 12, y: 1 }],
            hideFillBoundaries: true
        }
    ],
    axis: {
        'x-axis': {
            tickFormat: function(tick) {
                return ({
                    '1': 'Jan',
                    '2': 'Feb',
                    '3': 'Mar',
                    '4': 'Apr',
                    '5': 'May',
                    '6': 'Jun',
                    '7': 'Jul',
                    '8': 'Aug',
                    '9': 'Sep',
                    '10': 'Oct',
                    '11': 'Nov',
                    '12': 'Dec'
                })[tick];
            }
        },
        'y-axis': {
            ticks: 5
        }
    },
    padding: { top: 30, bottom: 50, left: 60, right: 120 },
    attrs: {
        '.caption': {
            text: 'Average High/Low Temperature for Amsterdam, Netherlands', fill: '#6A9E04', 'font-weight': 'bold', 'ref-y': -50, ref: '.background', 'ref-x': .5
        },
        '.data .avg-high path': {
            stroke: '#FF8533', 'stroke-width': 2
        },
        '.data .avg-low path': {
            stroke: '#4572A7', 'stroke-width': 2
        },
        '.x-axis text': {
            transform: 'translate(-10, 15) rotate(-90)'
        },
        '.avg-high .point circle': {
            r: 3, fill: 'white', opacity: 1, stroke: '#FF8533'
        },
        '.avg-low .point circle': {
            r: 3, fill: 'white', opacity: 1, stroke: '#4572A7'
        },
        '.point text': {
            fill: 'black', display: 'inline', transform: 'translate(0, -15)'
        }
    }
});

chart.legendPosition('nw');
graph.addCell(chart);
