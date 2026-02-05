/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

(function(dia, app, FreeTransform) {

    var graph = new dia.Graph;

    var paper = new dia.Paper({
        el: document.getElementById('paper'),
        width: 1000,
        height: 600,
        model: graph,
        interactive: { linkMove: false },
        async: true,
        autoFreeze: true,
        sorting: dia.Paper.sorting.APPROX,
        background: { color:  '#F3F7F6' },
        viewManagement: {
            disposeHidden: false,
        },
        cellVisibility: function(cell, isMounted, paper) {
            if (cell instanceof dia.Link) {
                const view = paper.findViewByModel(cell);
                if (view && view.el.parentNode && view.getConnectionLength() === 0) return false;
                if (cell.get('showIfRotated')) {
                    var target = cell.getTargetCell();
                    return !target || target.angle() % 90 > 0;
                }
            }
            return true;
        }
    });

    var shape1 = new app.Shape({ position: { x: 500, y: 400 }});
    var shape2 = new app.Shape({ position: { x: 100, y: 100 }});
    var shape3 = new app.Shape({ position: { x: 780, y: 300 }, angle: 30 });

    // Element Measurements

    var distance1 = new app.MainDistance({ showIfRotated: true });
    distance1.source(shape3, {
        anchor: { name: 'topRight', args: { dy: -50 }},
        connectionPoint: { name: 'anchor' }
    });
    distance1.target(shape3, {
        anchor: { name: 'topLeft', args: { dy: -50 }},
        connectionPoint: { name: 'anchor' }
    });

    var distance2 = new app.Distance();
    distance2.source(shape3, {
        anchor: { name: 'topRight', args: { rotate: true }},
        connectionPoint: { name: 'anchor', args: { offset: { y: -25 }}}
    });
    distance2.target(shape3, {
        anchor: { name: 'topLeft', args: { rotate: true }},
        connectionPoint: { name: 'anchor', args: { offset: { y: 25 }}}
    });

    var distance3 = new app.Distance();
    distance3.source(shape3, {
        anchor: { name: 'topLeft', args: { rotate: true }},
        connectionPoint: { name: 'anchor', args: { offset: { y: -25 }}}
    });
    distance3.target(shape3, {
        anchor: { name: 'bottomLeft', args: { rotate: true }},
        connectionPoint: { name: 'anchor', args: { offset: { y: 25 }}}
    });

    // Distance Between Elements

    var distance4 = new app.Distance();
    distance4.source(shape2, {
        anchor: { name: 'bottomRight' },
        connectionPoint: { name: 'anchor', args: { align: 'right', alignOffset: 30 }}
    });
    distance4.target(shape1, {
        anchor: { name: 'topRight' },
        connectionPoint: { name: 'anchor', args: { align: 'right', alignOffset: 30 }}
    });

    var distance5 = new app.MainDistance();
    distance5.source(shape2, {
        anchor: { name: 'bottomLeft' },
        connectionPoint: { name: 'anchor', args: { align: 'bottom', alignOffset: 60 }}
    });
    distance5.target(shape1, {
        anchor: { name: 'bottomRight' },
        connectionPoint: { name: 'anchor', args: { align: 'bottom', alignOffset: 60 }}
    });

    var distance6 = new app.Distance();
    distance6.source(shape2, {
        anchor: { name: 'bottomRight' },
        connectionPoint: { name: 'anchor', args: { align: 'bottom', alignOffset: 30 }}
    });
    distance6.target(shape1, {
        anchor: { name: 'bottomLeft' },
        connectionPoint: { name: 'anchor', args: { align: 'bottom', alignOffset: 30 }}
    });

    var distance7 = new app.MainDistance();
    distance7.source(shape2, {
        anchor: { name: 'topRight' },
        connectionPoint: { name: 'anchor', args: { align: 'right', alignOffset: 60 }}
    });
    distance7.target(shape1, {
        anchor: { name: 'bottomRight' },
        connectionPoint: { name: 'anchor', args: { align: 'right', alignOffset: 60 }}
    });

    var distance8 = new app.Distance();
    distance8.source(shape2, {
        anchor: { name: 'bottomLeft' },
        connectionPoint: { name: 'anchor', args: { align: 'left', alignOffset: 60 }}
    });
    distance8.target(shape1, {
        anchor: { name: 'topLeft' },
        connectionPoint: { name: 'anchor', args: { align: 'left', alignOffset: 60 }}
    });

    var distance9 = new app.Distance();
    distance9.source(shape2, {
        anchor: { name: 'topRight' },
        connectionPoint: { name: 'anchor', args: { align: 'top', alignOffset: 60 }}
    });
    distance9.target(shape1, {
        anchor: { name: 'topLeft' },
        connectionPoint: { name: 'anchor', args: { align: 'top', alignOffset: 60 }}
    });

    var distance10 = new app.Distance({ z: 4 });
    distance10.source(shape2, {
        anchor: { name: 'bottomRight' },
        connectionPoint: { name: 'anchor', args: { offset: { y: 60 }}}
    });
    distance10.target(shape1, {
        anchor: { name: 'topLeft' },
        connectionPoint: { name: 'anchor', args: { offset: { y : -60 }}}
    });

    graph.addCells([
        distance1,
        distance2,
        distance3,
        distance4,
        distance5,
        distance6,
        distance7,
        distance8,
        distance9,
        distance10,
        shape1,
        shape2,
        shape3
    ]);

    paper.unfreeze();

    // Tools

    var freeTransform1 = new FreeTransform({
        paper: paper,
        allowRotation: false,
        cell: shape1,
        useModelGeometry: true,
        usePaperScale: true,
        clearOnBlankPointerdown: false,
        clearAll: false,
        padding: -1
    });

    var freeTransform2 = new FreeTransform({
        paper: paper,
        allowRotation: false,
        cell: shape2,
        useModelGeometry: true,
        usePaperScale: true,
        clearOnBlankPointerdown: false,
        clearAll: false,
        padding: -1
    });

    var freeTransform3 = new FreeTransform({
        cell: shape3,
        paper: paper,
        rotateAngleGrid: 5,
        useModelGeometry: true,
        usePaperScale: true,
        clearOnBlankPointerdown: false,
        clearAll: false,
        padding: -1
    });

    freeTransform1.render();
    freeTransform2.render();
    freeTransform3.render();

})(
    joint.dia,
    joint.shapes.app,
    joint.ui.FreeTransform
);
