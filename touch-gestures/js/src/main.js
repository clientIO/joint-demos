import { dia, ui, shapes, g } from '@joint/plus';
import interact from 'interactjs';
import './styles.css';

const paperWidth = 2000;
const paperHeight = 2000;

const colors = {
    red: '#ed2637',
    white: '#dde6e9',
    gray: '#cad8e3',
    darkgray: '#888888'
};

// Initialize graph, paper and paper scroller

const graph = new dia.Graph({}, { cellNamespace: shapes });

const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: paperWidth,
    height: paperHeight,
    gridSize: 10,
    drawGrid: true,
    interactive: { linkMove: false },
    background: { color: colors.white },
    defaultConnectionPoint: { name: 'boundary' }
});

const paperScroller = new ui.PaperScroller({
    paper: paper,
    autoResizePaper: true,
    scrollWhileDragging: true,
    contentOptions: {
        allowNewOrigin: 'any',
        padding: 200
    },
    baseWidth: 200,
    baseHeight: 200
});

document.getElementById('paper-container').appendChild(paperScroller.el);
paperScroller.render().center(200, 200); // local units

// Set up JointJS interactions

paper.on('blank:pointerdown', onBlankPointerdown);
paper.on('blank:pointermove', onBlankPointermove);
paper.on('cell:pointerdown', onCellPointerdown);
paper.on('cell:pointermove', onCellPointermove);

function onBlankPointerdown(evt) {
    paperScroller.startPanning(evt);
    stopInteractionIfGestureDetected({ evt });
}

function onCellPointerdown(cellView, evt) {
    stopInteractionIfGestureDetected({ cellView, evt });
}

function onBlankPointermove(evt) {
    stopInteractionIfGestureDetected({ evt });
}

function onCellPointermove(cellView, evt) {
    stopInteractionIfGestureDetected({ cellView, evt });
}

function stopInteractionIfGestureDetected({ cellView, evt }) {
    if (
        (evt.type === 'touchstart' || evt.type === 'touchmove') &&
        evt.originalEvent.touches.length > 1
    ) {
        // The second touch of an interact.js gesture might come after a slight delay from the first touch, so we need to prevent some default JointJS interactions:
        // - Do not start element dragging:
        if (cellView) cellView.preventDefaultInteraction(evt);
        // - Stop any single-touch interactions which were started by the first touch:
        paperScroller.stopPanning(evt); // stop panning if it had already been started
        paper.pointerup(evt); // stop element dragging if it had already been started
    }
}

let initialOrigin = null;
let initialZoom = null;

interact(paperScroller.el).gesturable({
    onstart: onGestureStart,
    onmove: onGestureMove,
    onend: onGestureEnd
});

function onGestureStart(evt) {
    const { box } = evt;
    initialZoom = paperScroller.zoom();
    initialOrigin = paper.clientToLocalPoint(new g.Rect(box).center().round()); // local units
}

function onGestureMove(evt) {
    const { box, scale } = evt;
    // Scroll
    const gestureCenter = new g.Rect(box).center(); // client units
    paperScroller.positionPoint(initialOrigin, gestureCenter.x, gestureCenter.y);
    // Zoom
    const z = initialZoom * scale;
    const origin = paper.clientToLocalPoint(gestureCenter).round(); // local units
    paperScroller.zoom(z, {
        absolute: true,
        min: 0.05,
        max: 3,
        ox: origin.x,
        oy: origin.y
    });
}

function onGestureEnd() {
    initialOrigin = null;
    initialZoom = null;
}

// Initialize sample flowchart

const cells = [];

cells.push(
    new shapes.standard.Rectangle({
        id: 'start',
        position: { x: 150, y: 170 },
        size: { width: 100, height: 60 },
        attrs: {
            body: { rx: 20, ry: 20, stroke: colors.red },
            label: { fontFamily: 'sans-serif', text: 'Start' }
        }
    })
);

cells.push(
    new shapes.standard.Polygon({
        id: 'condition1',
        position: { x: 100, y: 290 },
        size: { width: 200, height: 100 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Are you viewing\nthis demo on a\nmobile device?'
            },
            body: { refPoints: '0,10 10,0 20,10 10,20', stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'start' },
        target: { id: 'condition1' }
    })
);

cells.push(
    new shapes.standard.Polygon({
        id: 'condition2',
        position: { x: 100, y: 450 },
        size: { width: 200, height: 100 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'What do you want to do?'
            },
            body: { refPoints: '0,10 10,0 20,10 10,20', stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'condition1' },
        target: { id: 'condition2' },
        labels: [
            {
                position: {
                    distance: 10,
                    offset: -5
                },
                attrs: {
                    text: {
                        textAnchor: 'left',
                        fontFamily: 'sans-serif',
                        text: 'Yes'
                    },
                    rect: { fill: colors.white }
                }
            }
        ]
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task1',
        position: { x: 100, y: 610 },
        size: { width: 200, height: 80 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Place two fingers\non the screen'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'condition2' },
        target: { id: 'task1' },
        labels: [
            {
                position: {
                    distance: 10,
                    offset: -5
                },
                attrs: {
                    text: {
                        textAnchor: 'start',
                        fontFamily: 'sans-serif',
                        text: 'Pan diagram'
                    },
                    rect: { fill: colors.white }
                }
            }
        ]
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task2',
        position: { x: 100, y: 750 },
        size: { width: 200, height: 80 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Move your fingers\non the screen'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task1' },
        target: { id: 'task2' }
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task3',
        position: { x: 100, y: 890 },
        size: { width: 200, height: 80 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Lift your fingers\nfrom the screen'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task2' },
        target: { id: 'task3' }
    })
);

cells.push(
    new shapes.standard.Polygon({
        id: 'condition3',
        position: { x: 100, y: 1030 },
        size: { width: 200, height: 100 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Do you want to do\nsomething else?'
            },
            body: { refPoints: '0,10 10,0 20,10 10,20', stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task3' },
        target: { id: 'condition3' }
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'end',
        position: { x: 150, y: 1190 },
        size: { width: 100, height: 60 },
        attrs: {
            body: { rx: 20, ry: 20, stroke: colors.red },
            label: { fontFamily: 'sans-serif', text: 'End' }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'condition3' },
        target: { id: 'end' },
        labels: [
            {
                position: {
                    distance: 10,
                    offset: -5
                },
                attrs: {
                    text: {
                        textAnchor: 'start',
                        fontFamily: 'sans-serif',
                        text: 'No'
                    },
                    rect: { fill: colors.white }
                }
            }
        ]
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'condition3' },
        target: { id: 'condition2' },
        labels: [
            {
                position: {
                    distance: 0,
                    offset: 15
                },
                attrs: {
                    text: {
                        textAnchor: 'end',
                        fontFamily: 'sans-serif',
                        text: 'Yes'
                    },
                    rect: { fill: colors.white }
                }
            }
        ],
        vertices: [
            { x: 70, y: 1080 },
            { x: 70, y: 500 }
        ]
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task21',
        position: { x: 360, y: 610 },
        size: { width: 200, height: 80 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Place two fingers\non the screen'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'condition2' },
        target: { id: 'task21' },
        labels: [
            {
                position: {
                    distance: -50,
                    offset: -5
                },
                attrs: {
                    text: {
                        textAnchor: 'start',
                        fontFamily: 'sans-serif',
                        text: 'Zoom diagram'
                    },
                    rect: { fill: colors.white }
                }
            }
        ],
        vertices: [{ x: 460, y: 500 }]
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task22',
        position: { x: 360, y: 750 },
        size: { width: 200, height: 80 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Pinch your fingers\non the screen'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task21' },
        target: { id: 'task22' }
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task23',
        position: { x: 360, y: 890 },
        size: { width: 200, height: 80 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Lift your fingers\nfrom the screen'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task22' },
        target: { id: 'task23' }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task23' },
        target: { id: 'condition3' },
        vertices: [
            { x: 460, y: 1000 },
            { x: 200, y: 1000 }
        ]
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task31',
        position: { x: 620, y: 610 },
        size: { width: 200, height: 80 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Place one finger\non an element\non the screen'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'condition2' },
        target: { id: 'task31' },
        labels: [
            {
                position: {
                    distance: -50,
                    offset: -5
                },
                attrs: {
                    text: {
                        textAnchor: 'start',
                        fontFamily: 'sans-serif',
                        text: 'Move an element'
                    },
                    rect: { fill: colors.white }
                }
            }
        ],
        vertices: [{ x: 720, y: 500 }]
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task32',
        position: { x: 620, y: 750 },
        size: { width: 200, height: 80 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Drag the element\non the screen'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task31' },
        target: { id: 'task32' }
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task33',
        position: { x: 620, y: 890 },
        size: { width: 200, height: 80 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Lift your finger\nfrom the screen'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task32' },
        target: { id: 'task33' }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task33' },
        target: { id: 'condition3' },
        vertices: [
            { x: 720, y: 1000 },
            { x: 200, y: 1000 }
        ]
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task41',
        position: { x: 880, y: 610 },
        size: { width: 200, height: 80 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Place one finger\non a blank area\nof the screen'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'condition2' },
        target: { id: 'task41' },
        labels: [
            {
                position: {
                    distance: -45,
                    offset: -5
                },
                attrs: {
                    text: {
                        textAnchor: 'start',
                        fontFamily: 'sans-serif',
                        text: 'Pan diagram\n(alternative)'
                    },
                    rect: { fill: colors.white }
                }
            }
        ],
        vertices: [{ x: 980, y: 500 }]
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task42',
        position: { x: 880, y: 750 },
        size: { width: 200, height: 80 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Move your finger\non the screen'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task41' },
        target: { id: 'task42' }
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task43',
        position: { x: 880, y: 890 },
        size: { width: 200, height: 80 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Lift your finger\nfrom the screen'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task42' },
        target: { id: 'task43' }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task43' },
        target: { id: 'condition3' },
        vertices: [
            { x: 980, y: 1000 },
            { x: 200, y: 1000 }
        ]
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task51',
        position: { x: 1140, y: 460 },
        size: { width: 200, height: 80 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Default set of JointJS\ninteractions applies'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'condition1' },
        target: { id: 'task51' },
        labels: [
            {
                position: {
                    distance: 0,
                    offset: -15
                },
                attrs: {
                    text: {
                        textAnchor: 'start',
                        fontFamily: 'sans-serif',
                        text: 'No'
                    },
                    rect: { fill: colors.white }
                }
            }
        ],
        vertices: [{ x: 1240, y: 340 }]
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task51' },
        target: { id: 'end' },
        vertices: [
            { x: 1240, y: 1160 },
            { x: 200, y: 1160 }
        ]
    })
);

graph.addCells(cells);
