import { dia, ui, shapes, V } from '@joint/plus';
import './styles.css';

const paperWidth = 500;
const paperHeight = 750;

const colors = {
    red: '#ed2637',
    white: '#dde6e9',
    gray: '#cad8e3',
    darkgray: '#888888'
};

const graph = new dia.Graph({}, { cellNamespace: shapes });

// Initiate the paper and the paper scroller

const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: paperWidth,
    height: paperHeight,
    gridSize: 10,
    drawGrid: true,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: colors.white },
    defaultConnectionPoint: { name: 'boundary' }
});

var paperScroller = new ui.PaperScroller({
    paper: paper,
    autoResizePaper: true,
    scrollWhileDragging: true,
    cursor: 'grab'
});

document.getElementById('paper-container').append(paperScroller.render().el);

paperScroller.center();

// Initiate panning when the user grabs the blank area of the paper.
paper.on('blank:pointerdown', paperScroller.startPanning);

// Center content on double click.
paper.on(
    'blank:pointerdblclick',
    paperScroller.centerContent.bind(paperScroller)
);

// Center element on double click.
paper.on('element:pointerdblclick', function(elementView) {
    paperScroller.centerElement(elementView.model);
});

// Initiate the stencil

const stencil = new ui.Stencil({
    paper: paperScroller,
    usePaperGrid: true,
    width: 100,
    height: '100%',
    paperOptions: () => {
        return {
            model: new dia.Graph({}, { cellNamespace: shapes }),
            cellViewNamespace: shapes,
            background: { color: colors.gray }
        };
    },
    layout: {
        columns: 1,
        rowHeight: 'compact',
        rowGap: 10,
        columnWidth: 100,
        marginY: 10,
        // reset defaults
        resizeToFit: false,
        dx: 0,
        dy: 0
    }
});

stencil.render();
document.getElementById('stencil-container').appendChild(stencil.el);

const templates = {
    rectangle: {
        type: 'standard.Rectangle',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                stroke: colors.red
            },
            label: {
                fontFamily: 'sans-serif',
                text: 'Lorem ipsum dolor sit',
                textWrap: {
                    width: 'calc(w - 10)',
                    height: 'calc(h - 10)',
                    ellipsis: true
                }
            }
        }
    },
    ellipse: {
        type: 'standard.Ellipse',
        size: { width: 80, height: 60 },
        attrs: {
            body: {
                stroke: colors.red
            },
            label: {
                fontFamily: 'sans-serif',
                text: 'Lorem ipsum elit',
                textWrap: {
                    width: 'calc(w - 20)',
                    height: 'calc(h - 10)',
                    ellipsis: true
                }
            }
        }
    }
};

stencil.load([templates.rectangle, templates.ellipse]);

// Initiate the sample flowchart

const cells = [];

cells.push(
    new shapes.standard.Rectangle({
        id: 'start',
        position: { x: 160, y: 50 },
        size: { width: 100, height: 60 },
        attrs: {
            body: { rx: 20, ry: 20, stroke: colors.red },
            label: { fontFamily: 'sans-serif', text: 'Start' }
        }
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task1',
        position: { x: 110, y: 150 },
        size: { width: 200, height: 70 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Go ahead with\ndiagram creation'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'start' },
        target: { id: 'task1' }
    })
);

cells.push(
    new shapes.standard.Polygon({
        id: 'condition',
        position: { x: 110, y: 270 },
        size: { width: 200, height: 100 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Do you prefer paper\nin sheet form?'
            },
            body: { refPoints: '0,10 10,0 20,10 10,20', stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task1' },
        target: { id: 'condition' }
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task2',
        position: { x: 280, y: 400 },
        size: { width: 180, height: 70 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Switch to Infinite Paper\nin the toolbar'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'condition' },
        target: { id: 'task2' },
        labels: [
            {
                position: {
                    distance: 32,
                    offset: -13
                },
                attrs: {
                    text: {
                        fontFamily: 'sans-serif',
                        text: 'No'
                    },
                    rect: { fill: colors.white }
                }
            }
        ],
        vertices: [{ x: 370, y: 320 }]
    })
);

cells.push(
    new shapes.standard.Rectangle({
        id: 'task3',
        position: { x: 120, y: 520 },
        size: { width: 180, height: 70 },
        attrs: {
            label: {
                fontFamily: 'sans-serif',
                text: 'Continue designing\nyour diagram'
            },
            body: { stroke: colors.red }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task2' },
        target: { id: 'task3' },
        vertices: [{ x: 370, y: 555 }]
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'condition' },
        target: { id: 'task3' },
        labels: [
            {
                position: {
                    distance: 23,
                    offset: 24
                },
                attrs: {
                    text: {
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
        id: 'end',
        position: { x: 160, y: 640 },
        size: { width: 100, height: 60 },
        attrs: {
            body: { rx: 20, ry: 20, stroke: colors.red },
            label: { fontFamily: 'sans-serif', text: 'End' }
        }
    })
);

cells.push(
    new shapes.standard.Link({
        source: { id: 'task3' },
        target: { id: 'end' }
    })
);

graph.addCells(cells);

// Initiate the toolbar

const toolbar = new ui.Toolbar({
    tools: [
        { type: 'checkbox', name: 'infinitePaperToggle', label: 'Infinite Paper' },
        { type: 'label', text: 'Grid Style' },
        {
            type: 'selectBox',
            name: 'gridTypeSelect',
            options: [
                { value: 'dot', content: 'Dot Grid' },
                { value: 'doubleMesh', content: 'Line Grid' },
                { value: 'noGrid', content: 'No Grid' }
            ]
        }
    ]
});

function addPageBreaks(paper, options = {}) {
    const { color, width, height } = options;

    const pageBreaksVEl = V('path', {
        stroke: color,
        fill: 'none',
        'stroke-dasharray': '5,5'
    });

    paper.layers.prepend(pageBreaksVEl.node);

    let lastArea = null;

    function updatePageBreaks() {
        const area = paper.getArea();
        // Do not update if the area is the same
        if (area.equals(lastArea)) return;
        lastArea = area;
        let d = '';
        // Draw vertical lines
        // Do not draw the first and last lines
        for (let x = width; x < area.width; x += width) {
            d += `M ${area.x + x} ${area.y} v ${area.height}`;
        }
        // Draw horizontal lines
        // Do not draw the first and last lines
        for (let y = height; y < area.height; y += height) {
            d += ` M ${area.x} ${area.y + y} h ${area.width}`;
        }
        pageBreaksVEl.attr('d', d || null);
    }

    updatePageBreaks();

    paper.on('translate resize', updatePageBreaks);

    return () => {
        paper.off('translate resize', updatePageBreaks);
        pageBreaksVEl.remove();
    };
}

const pageBreaksOptions = {
    color: colors.darkgray,
    width: paperWidth,
    height: paperHeight
};

let removePageBreaks = addPageBreaks(paper, pageBreaksOptions);

toolbar.on('infinitePaperToggle:change', (borderless) => {
    const { options } = paperScroller;

    if (borderless) {
        options.borderless = true;
        options.baseWidth = 100;
        options.baseHeight = 100;

        removePageBreaks();

        document.getElementById('paper-container').classList.remove('bordered');
    } else {
        options.borderless = false;
        options.baseWidth = paperWidth;
        options.baseHeight = paperHeight;

        removePageBreaks = addPageBreaks(paper, pageBreaksOptions);

        document.getElementById('paper-container').classList.add('bordered');
    }

    paperScroller.adjustPaper();
});

class PaperGridSwitcher {
    constructor(paper) {
        this.paper = paper;
    }

    setDotGrid() {
        this.paper.setGrid('dot');
    }

    setDoubleMeshGrid() {
        this.paper.setGrid({
            name: 'doubleMesh',
            args: [{ color: '#ccc' }, { color: '#bbb', scaleFactor: 5, thickness: 2 }]
        });
    }

    setNoGrid() {
        this.paper.setGrid([]);
    }
}

const paperGridSwitcher = new PaperGridSwitcher(paper);

toolbar.on('gridTypeSelect:option:select', (option) => {
    const { value } = option;

    if (value === 'dot') {
        paperGridSwitcher.setDotGrid();
    } else if (value === 'doubleMesh') {
        paperGridSwitcher.setDoubleMeshGrid();
    } else if (value === 'noGrid') {
        paperGridSwitcher.setNoGrid();
    }
});

paperGridSwitcher.setDotGrid();

document.getElementById('toolbar-container').append(toolbar.render().el);
