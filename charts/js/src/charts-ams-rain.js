import { dia, shapes, ui, V } from '@joint/plus';

const graph = new dia.Graph({}, { cellNamespace: shapes });
new dia.Paper({
    el: document.getElementById('paper-ams-rain'),
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
            name: 'precipitation',
            label: 'Precipitation (mm)',
            bars: { barWidth: .5 },
            data: [{ x: 1, y: 68 }, { x: 2, y: 47 }, { x: 3, y: 65 }, { x: 4, y: 52 }, { x: 5, y: 59 }, { x: 6, y: 70 }, { x: 7, y: 74 }, { x: 8, y: 69 }, { x: 9, y: 64 }, { x: 10, y: 70 }, { x: 11, y: 82 }, { x: 12, y: 85 }]
        },
        {
            name: 'avg-rain-days',
            label: 'Average Rainfall Days',
            interpolate: 'bezier',
            data: [{ x: 1, y: 12 }, { x: 2, y: 15 }, { x: 3, y: 15 }, { x: 4, y: 18 }, { x: 5, y: 16 }, { x: 6, y: 16 }, { x: 7, y: 17 }, { x: 8, y: 16 }, { x: 9, y: 16 }, { x: 10, y: 15 }, { x: 11, y: 10 }, { x: 12, y: 12 }],
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
            ticks: 5,
            tickFormat: '.0f'
        }
    },
    padding: { top: 30, bottom: 50, left: 60, right: 120 },
    attrs: {
        '.caption': {
            text: 'Average Rainfall for Amsterdam, Netherlands', fill: '#6A9E04', 'font-weight': 'bold', 'ref-y': -50, ref: '.background', 'ref-x': .5
        },
        '.data .precipitation path': {
            fill: '#4572A7', stroke: '#4572A7'
        },
        '.data .avg-rain-days path': {
            stroke: '#FF8533', 'stroke-width': 2
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
        '.precipitation .point': {
            display: 'none'
        },
        '.avg-rain-days .point circle': {
            r: 3, fill: 'white', opacity: 1, stroke: '#FF8533'
        }
    }
});

chart.legendPosition('nw');
graph.addCell(chart);

const t = new ui.Tooltip({
    className: 'tooltip small',
    rootTarget: '[model-id="' + chart.id + '"]',
    target: '.bar',
    content: function(elBar) {
        var x = parseInt(V(elBar).attr('data-x'), 10);
        var precipitation = chart.get('series')[0].data.find(function(d) { return d.x === x; });
        var avgRainDays = chart.get('series')[1].data.find(function(d) { return d.x === x; });
        return '<b>Precipitation:</b>&nbsp;' + precipitation.y + ' mm<br/>' +
            '<b>Average days of rainfall:</b>&nbsp;' + avgRainDays.y;
    },
    bottom: function(target) {
        return target;
    },
    direction: 'bottom',
    padding: 10
});

// Just prettify the tooltip a little bit and make it transit smoothly from one place to another.
// Note that this would normally be done best in CSS.
t.el.style.transition = 'left 50ms linear, top 50ms linear';
t.el.style.backgroundColor = 'white';
t.el.style.textShadow = 'none';
t.el.style.color = 'black';
