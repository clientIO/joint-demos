/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

(function() {

    var graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes });

    new joint.dia.Paper({
        el: document.getElementById('paper-pie-visits'),
        width: 400,
        height: 200,
        model: graph,
        cellViewNamespace: joint.shapes
    });

    var chart = new joint.shapes.chart.Pie({
        position: { x: 120, y: 30 },
        size: { width: 150, height: 150 },
        series: [ { data: [
            { value: 40, label: 'Organic', fill: {
                type: 'linearGradient', stops: [ { offset: '0%', color: '#b4f200' }, { offset: '80%', color: '#759d00' } ],
                attrs: { x1: '0%', y1: '0%', x2: '0%', y2: '100%' }
            }},
            { value: 20, label: 'Email', fill: {
                type: 'linearGradient', stops: [ { offset: '0%', color: '#E67E22' }, { offset: '80%', color: '#D35400' } ],
                attrs: { x1: '0%', y1: '0%', x2: '0%', y2: '100%' }
            }},
            { value: 20, label: 'Social', fill: {
                type: 'linearGradient', stops: [ { offset: '0%', color: '#ff3019' }, { offset: '80%', color: '#cf0404' } ],
                attrs: { x1: '0%', y1: '0%', x2: '0%', y2: '100%' }
            }},
            { value: 20, label: 'Referral', fill: {
                type: 'linearGradient', stops: [ { offset: '0%', color: '#b2e1ff' }, { offset: '80%', color: '#66b6fc' } ],
                attrs: { x1: '0%', y1: '0%', x2: '0%', y2: '100%' }

            }}
        ] }],
        attrs: {
            '.data': {
                filter: {
                    name: 'dropShadow',
                    attrs: {
                        filterUnits: 'objectBoundingBox',
                        x: -1,
                        y: -1,
                        width: 3,
                        height: 3,
                    },
                    args: {
                        blur: 3,
                        color: 'black'
                    }
                }
            },
            '.slice-inner-label': { style: { 'text-shadow': '0 0 1px black' }, 'font-weight': 'bold' }
        }
    });

    graph.addCell(chart);

})();
