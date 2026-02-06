import { dia, ui, shapes as defaultShapes } from '@joint/plus';
import './styles.scss';

class LinkElement extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'LinkElement',
            attrs: {
                root: {
                    cursor: 'move'
                },
                body: {
                    width: 'calc(w)',
                    height: 'calc(h)',
                    fill: 'white',
                    stroke: '#333333',
                    strokeWidth: 2
                },
                label: {
                    text: 'Links',
                    fontSize: 13,
                    fontFamily: 'sans-serif',
                    fill: '#333333',
                    x: 'calc(0.5*w)',
                    y: 'calc(0.5*h)',
                    textAnchor: 'middle',
                    textVerticalAnchor: 'middle',
                    textWrap: {
                        ellipsis: true,
                        width: -10,
                        height: -20
                    }
                }
            },
            size: {
                width: 80,
                height: 80
            }
        };
    }

    preinitialize() {
        this.markup = [
            {
                tagName: 'rect',
                selector: 'body'
            },
            {
                tagName: 'text',
                selector: 'label'
            }
        ];
    }
}

const shapes = { ...defaultShapes, LinkElement };

// Paper

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    width: '100%',
    height: '100%',
    gridSize: 20,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    background: { color: '#F3F7F6' },
    restrictTranslate: true,
    clickThreshold: 10
});
document.getElementById('paper-container').appendChild(paper.el);

// Set mesh grid on paper when paper is attached so the dimensions are known.
paper.setGrid('mesh');

// Stencil

const stencil = new ui.Stencil({
    paper,
    usePaperGrid: true,
    width: 100,
    height: '100%',
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

stencil.load([
    {
        type: 'LinkElement'
    }
]);

// Selection

const selection = new ui.Selection({
    paper,
    useModelGeometry: true,
    theme: 'material',
    boxContent: false
});

selection.removeHandle('resize');
selection.removeHandle('rotate');
selection.removeHandle('remove');

paper.on('element:pointerclick', function(elementView) {
    selection.collection.reset([elementView.model]);
});

paper.on('blank:pointerclick', function() {
    selection.collection.reset([]);
});

stencil.on('element:drop', function(elementView) {
    const element = elementView.model;
    selection.collection.reset([element]);
});

selection.collection.on('reset', function() {
    openInspector();
});

// Inspector

let _inspector = null;

function openInspector() {
    const container = document.getElementById('inspector-container');

    if (_inspector) {
        _inspector.remove();
        _inspector = null;
    }

    const cells = selection.collection.models;
    if (cells.length !== 1) return;

    const [cell] = cells;
    const type = cell.get('type');

    const inputs = {
        LinkElement: {
            'attrs/label/text': {
                label: 'Text',
                type: 'content-editable'
            },
            links: {
                type: 'list',
                label: 'List of links',
                item: {
                    type: 'object',
                    properties: {
                        url: {
                            type: 'text',
                            label: 'URL',
                            index: 1
                        },
                        name: {
                            type: 'text',
                            label: 'Link',
                            index: 2
                        }
                    }
                }
            }
        }
    };

    const inspector = new ui.Inspector({
        cell,
        theme: 'material',
        inputs: inputs[type]
    });

    container.append(inspector.el);
    inspector.render();

    _inspector = inspector;
}

// Example

const te1 = new LinkElement({
    position: { x: 100, y: 100 },
    attrs: {
        label: {
            text: 'Products'
        }
    },
    links: [
        {
            name: 'JointJS',
            url: 'https://www.jointjs.com'
        },
        {
            name: 'AppMixer',
            url: 'https://www.appmixer.com'
        }
    ]
});

graph.addCells([te1]);

selection.collection.reset([te1]);

// Command Manager

const history = new dia.CommandManager({
    graph
});

history.on('stack:undo stack:redo', function() {
    selection.collection.reset(
        selection.collection.filter((cell) => graph.getCell(cell))
    );
});

// Toolbar

const toolbar = new ui.Toolbar({
    autoToggle: true,
    tools: ['undo', 'redo'],
    references: {
        commandManager: history
    }
});

document.getElementById('toolbar-container').appendChild(toolbar.render().el);

new ui.Tooltip({
    theme: 'material',
    rootTarget: paper.el,
    target: '[data-tooltip]',
    direction: 'auto',
    padding: 20,
    animation: true
});

function setupLinks(paper) {
    const { model: graph } = paper;

    const LinkHighlighter = dia.HighlighterView.extend({
        MOUNTABLE: true,
        tagName: 'g',
        attributes: {
            event: 'element:links:click',
            cursor: 'pointer',
            'data-tooltip': 'Click to open links'
        },
        children: [
            {
                tagName: 'circle',
                attributes: {
                    r: 10,
                    fill: '#0057FF',
                    stroke: '#333',
                    'stroke-width': 2
                }
            },
            {
                tagName: 'text',
                textContent: '→',
                attributes: {
                    x: 0,
                    y: '.3em',
                    fill: '#ffffff',
                    'font-size': 15,
                    'font-family': 'monospace',
                    'text-anchor': 'middle'
                }
            }
        ],
        highlight: function(cellView) {
            const { width, height } = cellView.model.size();
            this.renderChildren();
            this.el.setAttribute(
                'transform',
                `translate(${width - 20},${height - 5})`
            );
        }
    });

    function toggleLinkHighlighter(el) {
        if (el.isLink()) return;
        const { links = [] } = el.attributes;
        const highlighter = LinkHighlighter.get(el.findView(paper), 'links');
        if (links.length === 0) {
            if (highlighter) highlighter.remove();
        } else {
            if (highlighter) return;
            LinkHighlighter.add(el.findView(paper), 'root', 'links');
        }
    }

    graph.on('add change:links', function(el) {
        toggleLinkHighlighter(el);
    });

    graph.on('reset', function(el) {
        graph.getElements().forEach((el) => toggleLinkHighlighter(el));
    });

    graph.getElements().forEach((el) => toggleLinkHighlighter(el));

    paper.on('element:links:click', function(elementView, evt) {
        evt.stopPropagation();
        const { links = [] } = elementView.model.attributes;
        const tools = links
            .filter((link) => link.url)
            .map((link) => {
                return {
                    action: link.url,
                    content: link.name || link.url
                };
            });
        if (tools.length === 0) return;
        const contextMenu = new ui.ContextToolbar({
            target: evt.target,
            vertical: true,
            tools
        });
        contextMenu.render();
        contextMenu.on('all', function(url, evt) {
            if (url === 'close') return;
            evt.stopPropagation();
            contextMenu.remove();
            window.open(url.slice('action:'.length), '_blank');
        });
    });
}

setupLinks(paper);
