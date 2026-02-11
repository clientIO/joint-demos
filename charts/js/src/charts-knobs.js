import { dia, shapes } from '@joint/plus';

const graph = new dia.Graph({}, { cellNamespace: shapes });

new dia.Paper({
    el: document.getElementById('paper-knobs'),
    width: 500,
    height: 350,
    model: graph,
    cellViewNamespace: shapes
});

const knob1 = new shapes.chart.Knob({
    position: { x: 50, y: 50 },
    size: { width: 100, height: 100 },
    min: 0, max: 100,
    value: 80, fill: '#2c97de',
    sliceDefaults: {
        legendLabel: 'CPU\n{value:.0f}%'
    },
    attrs: {
        '.legend-slice text': { 'font-size': 18, fill: '#2c97de', style: { 'text-shadow': '0 0 1px black' }}
    }
});
graph.addCell(knob1);

const knob2 = new shapes.chart.Knob({
    position: { x: 200, y: 50 },
    size: { width: 100, height: 100 },
    min: 0, max: 100,
    pieHole: .4,
    value: 70, fill: '#1ece6d',
    serieDefaults: { startAngle: 90 },
    attrs: { '.legend-slice text': { fill: '#1ece6d', style: { 'text-shadow': '0 0 1px black' }}}
});
graph.addCell(knob2);

const knob3 = knob2.clone().translate(150);
graph.addCell(knob3);
knob3.set({ value: 99, fill: 'red', pieHole: .95 });
knob3.attr('.legend-slice text/fill', 'red');

const knob4 = knob1.clone().translate(40, 160);
graph.addCell(knob4);
knob4.set({ value: [70, 10], fill: ['#F16745', '#4CC3D9'], pieHole: .7 });
knob4.prop('sliceDefaults/legendLabel', 'Mem\n{value:.0f}%');
knob4.attr('.legend-slice text/fill', 'gray');

const knob5 = knob1.clone().translate(220, 140).resize(130, 130);
graph.addCell(knob5);
knob5.set({ value: [30, 60, 90], fill: ['#F2C500', '#4CC3D9', '#E94B35'], pieHole: .4 });
knob5.prop('sliceDefaults/legendLabel', '{value:.0f}%');
knob5.attr('.legend-slice text/fill', 'gray');
