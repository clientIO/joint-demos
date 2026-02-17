export const TreeData = [{
    id: 'process0',
    name: 'Process 1',
    cells: [{
        id: 'r3',
        type: 'standard.Rectangle',
        position: { x: 200, y: 80 },
        size: { width: 100, height: 60 },
        attrs: {
            body: {
                rx: 20,
                ry: 20,
            },
            label: {
                text: 'Start'
            }
        }
    }, {
        id: 'p2',
        type: 'standard.Path',
        position: { x: 200, y: 230 },
        size: { width: 100, height: 60 },
        attrs: {
            body: {
                d: 'M 20 0 H calc(w) L calc(w-20) calc(h) H 0 Z'
            },
            label: {
                text: 'Input'
            }
        }
    }, {
        id: 'p1',
        type: 'standard.Path',
        position: { x: 200, y: 400 },
        size: { width: 100, height: 100 },
        attrs: {
            body: {
                d: 'M 0 calc(0.5 * h) calc(0.5 * w) 0 calc(w) calc(0.5 * h) calc(0.5 * w) calc(h) Z'
            },
            label: {
                text: 'Decision'
            }
        }
    }, {
        id: 'r4',
        type: 'standard.Rectangle',
        position: { x: 200, y: 600 },
        size: { width: 100, height: 60 },
        attrs: {
            label: {
                text: 'Process'
            }
        }
    }, {
        id: 'e1',
        type: 'standard.Ellipse',
        position: { x: 220, y: 750 },
        size: { width: 60, height: 60 },
        attrs: {
            label: {
                text: 'End'
            }
        }
    }, {
        id: 'l1',
        type: 'standard.Link',
        source: { id: 'r3' },
        target: { id: 'p2' }
    }, {
        id: 'l2',
        type: 'standard.Link',
        source: { id: 'p2' },
        target: { id: 'p1' }
    }, {
        id: 'l3',
        type: 'standard.Link',
        source: { id: 'p1' },
        target: { id: 'r4' },
        labels: [{ attrs: { text: { text: 'Yes' } } }]
    }, {
        id: 'l4',
        type: 'standard.Link',
        source: { id: 'p1' },
        target: { id: 'p2' },
        vertices: [{ x: 400, y: 450 }, { x: 400, y: 260 }],
        labels: [{ attrs: { text: { text: 'No' } } }]
    }, {
        id: 'l5',
        type: 'standard.Link',
        source: { id: 'r4' },
        target: { id: 'e1' }
    }]
}, {
    id: 'process1',
    name: 'Process 2',
    cells: [{
        id: 'r1',
        type: 'standard.Rectangle',
        position: { x: 100, y: 100 },
        size: { width: 100, height: 100 },
        attrs: {
            label: {
                text: 'Source'
            }
        }
    }, {
        id: 'r2',
        type: 'standard.Rectangle',
        position: { x: 300, y: 100 },
        size: { width: 100, height: 100 },
        attrs: {
            label: {
                text: 'Target'
            }
        }
    }, {
        id: 'l6',
        type: 'standard.Link',
        source: { id: 'r1', anchor: { name: 'center', args: { dy: -10 } } },
        target: { id: 'r2', anchor: { name: 'center', args: { dy: -10 } } },
    }, {
        id: 'l7',
        type: 'standard.Link',
        source: { id: 'r1', anchor: { name: 'center', args: { dy: 10 } } },
        target: { id: 'r2', anchor: { name: 'center', args: { dy: 10 } } }
    }],
}];
