import { dia, shapes, ui } from '@joint/plus';
import { Shape, Distance, MainDistance } from './shapes.js';
import './styles.css';

const namespace = {
    ...shapes,
    app: {
        Shape,
        Distance,
        MainDistance
    }
}

const graph = new dia.Graph({}, { cellNamespace: namespace });

const paper = new dia.Paper({
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
                const target = cell.getTargetCell();
                return !target || target.angle() % 90 > 0;
            }
        }
        return true;
    }
});

const shape1 = new Shape({ position: { x: 500, y: 400 }});
const shape2 = new Shape({ position: { x: 100, y: 100 }});
const shape3 = new Shape({ position: { x: 780, y: 300 }, angle: 30 });

// Element Measurements

const distance1 = new MainDistance({ showIfRotated: true });
distance1.source(shape3, {
    anchor: { name: 'topRight', args: { dy: -50 }},
    connectionPoint: { name: 'anchor' }
});
distance1.target(shape3, {
    anchor: { name: 'topLeft', args: { dy: -50 }},
    connectionPoint: { name: 'anchor' }
});

const distance2 = new Distance();
distance2.source(shape3, {
    anchor: { name: 'topRight', args: { rotate: true }},
    connectionPoint: { name: 'anchor', args: { offset: { y: -25 }}}
});
distance2.target(shape3, {
    anchor: { name: 'topLeft', args: { rotate: true }},
    connectionPoint: { name: 'anchor', args: { offset: { y: 25 }}}
});

const distance3 = new Distance();
distance3.source(shape3, {
    anchor: { name: 'topLeft', args: { rotate: true }},
    connectionPoint: { name: 'anchor', args: { offset: { y: -25 }}}
});
distance3.target(shape3, {
    anchor: { name: 'bottomLeft', args: { rotate: true }},
    connectionPoint: { name: 'anchor', args: { offset: { y: 25 }}}
});

// Distance Between Elements

const distance4 = new Distance();
distance4.source(shape2, {
    anchor: { name: 'bottomRight' },
    connectionPoint: { name: 'anchor', args: { align: 'right', alignOffset: 30 }}
});
distance4.target(shape1, {
    anchor: { name: 'topRight' },
    connectionPoint: { name: 'anchor', args: { align: 'right', alignOffset: 30 }}
});

const distance5 = new MainDistance();
distance5.source(shape2, {
    anchor: { name: 'bottomLeft' },
    connectionPoint: { name: 'anchor', args: { align: 'bottom', alignOffset: 60 }}
});
distance5.target(shape1, {
    anchor: { name: 'bottomRight' },
    connectionPoint: { name: 'anchor', args: { align: 'bottom', alignOffset: 60 }}
});

const distance6 = new Distance();
distance6.source(shape2, {
    anchor: { name: 'bottomRight' },
    connectionPoint: { name: 'anchor', args: { align: 'bottom', alignOffset: 30 }}
});
distance6.target(shape1, {
    anchor: { name: 'bottomLeft' },
    connectionPoint: { name: 'anchor', args: { align: 'bottom', alignOffset: 30 }}
});

const distance7 = new MainDistance();
distance7.source(shape2, {
    anchor: { name: 'topRight' },
    connectionPoint: { name: 'anchor', args: { align: 'right', alignOffset: 60 }}
});
distance7.target(shape1, {
    anchor: { name: 'bottomRight' },
    connectionPoint: { name: 'anchor', args: { align: 'right', alignOffset: 60 }}
});

const distance8 = new Distance();
distance8.source(shape2, {
    anchor: { name: 'bottomLeft' },
    connectionPoint: { name: 'anchor', args: { align: 'left', alignOffset: 60 }}
});
distance8.target(shape1, {
    anchor: { name: 'topLeft' },
    connectionPoint: { name: 'anchor', args: { align: 'left', alignOffset: 60 }}
});

const distance9 = new Distance();
distance9.source(shape2, {
    anchor: { name: 'topRight' },
    connectionPoint: { name: 'anchor', args: { align: 'top', alignOffset: 60 }}
});
distance9.target(shape1, {
    anchor: { name: 'topLeft' },
    connectionPoint: { name: 'anchor', args: { align: 'top', alignOffset: 60 }}
});

const distance10 = new Distance({ z: 4 });
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

const freeTransform1 = new ui.FreeTransform({
    paper: paper,
    allowRotation: false,
    cell: shape1,
    useModelGeometry: true,
    usePaperScale: true,
    clearOnBlankPointerdown: false,
    clearAll: false,
    padding: -1
});

const freeTransform2 = new ui.FreeTransform({
    paper: paper,
    allowRotation: false,
    cell: shape2,
    useModelGeometry: true,
    usePaperScale: true,
    clearOnBlankPointerdown: false,
    clearAll: false,
    padding: -1
});

const freeTransform3 = new ui.FreeTransform({
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
