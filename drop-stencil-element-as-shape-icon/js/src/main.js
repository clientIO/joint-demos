import { dia, ui, util, shapes, highlighters, elementTools } from '@joint/plus';
import './styles.css';

const graph = new dia.Graph({}, { cellNamespace: shapes });

const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 20,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: '#F3F7F6' }
});
document.getElementById('paper-container').appendChild(paper.el);

// Set mesh grid on paper when paper is attached so the dimensions are known.
paper.setGrid('mesh');

// Create Record & Images stencils

const stencil = new ui.Stencil({
    paper,
    usePaperGrid: true,
    width: 140,
    paperOptions: () => {
        return {
            model: new dia.Graph({}, { cellNamespace: shapes }),
            cellViewNamespace: shapes,
            background: {
                color: '#FCFCFC'
            }
        };
    },
    layout: {
        columns: 1,
        rowHeight: 'compact',
        rowGap: 10,
        columnWidth: 140,
        marginY: 10,
        // reset defaults
        resizeToFit: false,
        dx: 0,
        dy: 0
    }
});

stencil.render();
document.getElementById('stencil-container').appendChild(stencil.el);

const stencilImages = new ui.Stencil({
    paper,
    usePaperGrid: true,
    width: 160,
    paperOptions: () => {
        return {
            model: new dia.Graph({}, { cellNamespace: shapes }),
            cellViewNamespace: shapes,
            background: {
                color: '#FCFCFC'
            }
        };
    },
    layout: {
        columns: 3,
        rowHeight: 'compact',
        rowGap: 10,
        columnWidth: 50,
        marginY: 10,
        // reset defaults
        resizeToFit: false,
        dx: 0,
        dy: 0
    }
});

stencilImages.render();
document.getElementById('images-container').appendChild(stencilImages.el);

// Fetch data and populate the stencil

fetch('https://picsum.photos/v2/list?limit=100')
    .then((response) => response.json())
    .then((data) => {
        const images = data.map((image, index) => {
            return {
                type: 'standard.BorderedImage',
                size: { width: 40, height: 40 },
                author: image.author,
                attrs: {
                    image: {
                        href: `https://picsum.photos/id/${image.id}/40/40`
                    }
                }
            };
        });
        stencilImages.load(images);
        stencilImages.fitPaperToContent(stencil.getPaper());
    });

stencil.load([
    {
        type: 'standard.HeaderedRecord',
        size: { width: 120, height: 240 },
        itemHeight: 50,
        itemOffset: 0,
        itemIcon: { width: 40, height: 40, padding: 5 },
        items: [[]],
        padding: { top: 30, left: 0, right: 15 },
        scrollTop: 0,
        itemOverflow: true,
        attrs: {
            body: {
                strokeWidth: 1,
                stroke: '#ccc',
                fill: '#fff'
            },
            header: {
                strokeWidth: 1,
                stroke: '#333',
                fill: '#333'
            },
            headerLabel: {
                text: 'Image Collection',
                fontFamily: 'sans-serif',
                fontSize: 12,
                fill: '#fff'
            },
            itemLabels: {
                fontFamily: 'sans-serif',
                fontSize: 10
            }
        }
    }
]);

// Insert an image into a Record shape

let outline = null;

stencilImages.on('element:drag', (cloneView, evt, bbox) => {
    if (outline) {
        outline.remove();
        outline = null;
    }
    const [el] = graph.findModelsInArea(bbox);
    if (el) {
        cloneView.el.classList.remove('invalid-drop');
        outline = highlighters.stroke.add(el.findView(paper), 'body', 'outline', {
            padding: 6,
            attrs: {
                stroke: '#4666E5',
                'stroke-width': 3,
                'stroke-linecap': 'butt',
                'stroke-linejoin': 'miter'
            }
        });
    } else {
        cloneView.el.classList.add('invalid-drop');
    }
});

stencilImages.on('element:dragend', (cloneView, evt, bbox) => {
    const [el] = graph.findModelsInArea(bbox);
    stencilImages.cancelDrag({ dropAnimation: !el });
    if (el) {
        const { model } = cloneView;
        el.addItemAtIndex(0, Infinity, {
            id: util.uuid(),
            label: model.get('author'),
            icon: model.attr('image/href')
        });
        if (!el.isEveryItemInView()) {
            el.setScrollTop(Number.MAX_VALUE);
        }
        if (outline) {
            outline.remove();
            outline = null;
        }
    }
});

// Add Record scrollbars

graph.on('add', (el) => {
    if (el.get('type') === 'standard.HeaderedRecord') {
        el.findView(paper).addTools(
            new dia.ToolsView({
                tools: [new elementTools.RecordScrollbar({ rightAlign: true })]
            })
        );
    }
});

paper.on('element:mousewheel', (elementView, evt, x, y, delta) => {
    evt.preventDefault();
    const el = elementView.model;
    if (el.get('type') === 'standard.HeaderedRecord') {
        if (!el.isEveryItemInView()) {
            el.setScrollTop(el.getScrollTop() + delta * 10);
        }
    }
});
