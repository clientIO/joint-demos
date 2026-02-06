import {
    dia,
    ui,
    shapes as defaultShapes,
    format,
    mvc,
    linkTools,
    elementTools,
    V,
    g
} from '@joint/plus';
import './styles.scss';

const backgroundColor = '#ffffff';

// Shapes

class Comment extends dia.Element {
    defaults() {
        return {
            ...super.defaults,
            type: 'Comment',
            size: {
                width: 120,
                height: 160
            },
            attrs: {
                root: {
                    cursor: 'move'
                },
                body: {
                    fill: '#faf293',
                    stroke: '#333333',
                    strokeWidth: 2,
                    strokeLinejoin: 'round',
                    d: 'M 20 0 H calc(w) V calc(h) H 0 L 0 20 L 20 0 20 20 0 20 Z'
                },
                label: {
                    text: '',
                    fontSize: 14,
                    fontFamily: 'sans-serif',
                    fill: '#333333',
                    textVerticalAnchor: 'middle',
                    textAnchor: 'middle',
                    textWrap: {
                        width: 'calc(w-10)',
                        height: 'calc(h-20)',
                        ellipsis: true
                    },
                    x: 'calc(0.5*w)',
                    y: 'calc(0.5*h)'
                }
            }
        };
    }

    preinitialize() {
        this.markup = [
            {
                tagName: 'path',
                selector: 'body'
            },
            {
                tagName: 'text',
                selector: 'label'
            }
        ];
    }
}

class CommentLink extends defaultShapes.standard.Link {
    defaults() {
        return {
            ...super.defaults,
            type: 'CommentLink',
            z: -1,
            attrs: {
                ...super.defaults.attrs,
                line: {
                    ...super.defaults.attrs.line,
                    stroke: '#333333',
                    strokeWidth: 2,
                    strokeDasharray: '10,5',
                    targetMarker: null
                }
            }
        };
    }
}

const shapes = { ...defaultShapes, Comment, CommentLink };

// Tools

const ResizeTool = elementTools.Control.extend({
    children: [
        {
            tagName: 'g',
            selector: 'handle',
            children: [
                {
                    tagName: 'circle',
                    attributes: {
                        cursor: 'pointer',
                        'stroke-width': 2,
                        stroke: backgroundColor,
                        fill: '#33334F',
                        r: 8
                    }
                },
                {
                    tagName: 'path',
                    selector: 'icon',
                    attributes: {
                        d: 'M -3 -3 3 3 M 3 -2 3 3 -2 3',
                        stroke: '#ffffff',
                        'stroke-width': 2,
                        fill: 'none'
                    }
                }
            ]
        },
        {
            tagName: 'rect',
            selector: 'extras',
            attributes: {
                'pointer-events': 'none',
                fill: 'none',
                stroke: '#33334F',
                'stroke-dasharray': '2,4',
                rx: 5,
                ry: 5
            }
        }
    ],
    getPosition: function(view) {
        const model = view.model;
        const { width, height } = model.size();
        return { x: width, y: height };
    },
    setPosition: function(view, coordinates) {
        const model = view.model;
        model.resize(Math.max(coordinates.x, 50), Math.max(coordinates.y, 50));
    }
});

const RemoveTool = elementTools.Remove.extend({
    children: [
        {
            tagName: 'circle',
            selector: 'button',
            attributes: {
                r: 8,
                fill: '#33334F',
                stroke: backgroundColor,
                'stroke-width': 2,
                cursor: 'pointer'
            }
        },
        {
            tagName: 'path',
            selector: 'icon',
            attributes: {
                d: 'M -3 -3 3 3 M -3 3 3 -3',
                fill: 'none',
                stroke: '#FFFFFF',
                'stroke-width': 2,
                'pointer-events': 'none'
            }
        }
    ]
});

// Paper

let showComments = true;
let textEditing = false;

const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
    model: graph,
    cellViewNamespace: shapes,
    async: true,
    sorting: dia.Paper.sorting.APPROX,
    defaultConnectionPoint: { name: 'boundary' },
    background: { color: backgroundColor },
    clickThreshold: 10,
    preventDefaultBlankAction: false,
    interactive: (cellView) => {
        if (cellView.model.get('type') === 'Comment') {
            return true;
        }
        return false;
    },
    viewport: (view) => {
        if (!view.model) return true;
        const type = view.model.get('type');
        if (type === 'Comment' || type === 'CommentLink') {
            return showComments;
        }
        return true;
    }
});

const scroller = new ui.PaperScroller({
    paper,
    autoResizePaper: true,
    baseWidth: 100,
    baseHeight: 100,
    padding: 100,
    contentOptions: {
        useModelGeometry: true,
        padding: 100,
        allowNewOrigin: 'any'
    }
});

document.getElementById('paper-container').appendChild(scroller.el);

const listener = new mvc.Listener();
listener.listenTo(paper, {
    'blank:pointerdown': (evt) => {
        scroller.startPanning(evt);
        paper.removeTools();
    },
    'element:pointerdblclick': (elementView) => {
        const element = elementView.model;
        if (element.get('type') === 'Comment') {
            editText(element, paper);
            return;
        } else {
            const { x, y } = element.getBBox().topRight();
            editText(
                addComment(elementView, x, y, `${element.attr('label/text')} Notes`),
                paper
            );
        }
    },
    'link:pointerdblclick': (linkView, evt, x, y) => {
        const link = linkView.model;
        if (link.get('type') === 'CommentLink') {
            return;
        }
        editText(addComment(linkView, x, y), paper);
    },
    'cell:mouseenter': (cellView) => {
        if (textEditing) return;
        const cell = cellView.model;
        let commentLink;
        let comment;
        const type = cell.get('type');
        if (type === 'CommentLink') {
            commentLink = cell;
            comment = commentLink.getTargetCell();
        } else if (type === 'Comment') {
            comment = cell;
            [commentLink] = graph.getConnectedLinks(comment, { inbound: true });
        } else {
            return;
        }
        paper.removeTools();
        const commentLinkView = commentLink.findView(paper);
        commentLinkView.addTools(
            new dia.ToolsView({
                tools: [
                    new linkTools.SourceAnchor({
                        defaultAnchorAttributes: {
                            'stroke-width': 2,
                            stroke: backgroundColor,
                            fill: '#33334F',
                            r: 7
                        },
                        customAnchorAttributes: {
                            'stroke-width': 2,
                            stroke: backgroundColor,
                            fill: '#33334F',
                            r: 7
                        }
                    })
                ]
            })
        );
        const commentView = comment.findView(paper);
        commentView.addTools(
            new dia.ToolsView({
                tools: [
                    new RemoveTool({
                        x: 'calc(w)',
                        y: 0
                    }),
                    new ResizeTool()
                ]
            })
        );
    }
});

// Example

graph.fromJSON({
    cells: [
        {
            id: 'r3',
            type: 'standard.Rectangle',
            position: { x: 200, y: 80 },
            size: { width: 100, height: 60 },
            attrs: {
                body: {
                    rx: 20,
                    ry: 20,
                    fill: '#050d6c'
                },
                label: {
                    text: 'Start',
                    fill: '#ffffff'
                }
            }
        },
        {
            id: 'p2',
            type: 'standard.Path',
            position: { x: 200, y: 230 },
            size: { width: 100, height: 60 },
            attrs: {
                body: {
                    d: 'M 20 0 H calc(w) L calc(w-20) calc(h) H 0 Z',
                    fill: '#ced2df'
                },
                label: {
                    text: 'Input'
                }
            }
        },
        {
            id: 'p1',
            type: 'standard.Path',
            position: { x: 200, y: 400 },
            size: { width: 100, height: 100 },
            attrs: {
                body: {
                    d:
                        'M 0 calc(0.5 * h) calc(0.5 * w) 0 calc(w) calc(0.5 * h) calc(0.5 * w) calc(h) Z',
                    fill: '#e7e8fe'
                },
                label: {
                    text: 'Decision'
                }
            }
        },
        {
            id: 'r4',
            type: 'standard.Rectangle',
            position: { x: 200, y: 600 },
            size: { width: 100, height: 60 },
            attrs: {
                body: {
                    fill: '#717cf9'
                },
                label: {
                    text: 'Process'
                }
            }
        },
        {
            id: 'e1',
            type: 'standard.Ellipse',
            position: { x: 220, y: 750 },
            size: { width: 60, height: 60 },
            attrs: {
                body: {
                    fill: '#050d6c'
                },
                label: {
                    fill: '#ffffff',
                    text: 'End'
                }
            }
        },
        {
            id: 'l1',
            type: 'standard.Link',
            source: { id: 'r3' },
            target: { id: 'p2' }
        },
        {
            id: 'l2',
            type: 'standard.Link',
            source: { id: 'p2' },
            target: { id: 'p1' }
        },
        {
            id: 'l3',
            type: 'standard.Link',
            source: { id: 'p1' },
            target: { id: 'r4' },
            labels: [{ attrs: { text: { text: 'Yes' }}}]
        },
        {
            id: 'l4',
            type: 'standard.Link',
            source: { id: 'p1' },
            target: { id: 'p2' },
            vertices: [
                { x: 400, y: 450 },
                { x: 400, y: 260 }
            ],
            labels: [{ attrs: { text: { text: 'No' }}}]
        },
        {
            id: 'l5',
            type: 'standard.Link',
            source: { id: 'r4' },
            target: { id: 'e1' }
        }
    ]
});

scroller.centerContent({ useModelGeometry: true });

// Toolbar

const toolbar = new ui.Toolbar({
    theme: 'modern',
    tools: [
        {
            type: 'button',
            text: 'Export to PNG',
            name: 'png'
        },
        {
            type: 'button',
            name: 'comments'
        }
    ]
});

document.getElementById('toolbar-container').appendChild(toolbar.render().el);

// PNG
toolbar.on('png:pointerclick', () => {
    paper.hideTools();
    format.toPNG(
        paper,
        (dataUri) => {
            const lightbox = new ui.Lightbox({
                image: dataUri,
                downloadable: true,
                fileName: 'Rappid'
            });
            lightbox.open();
            if (showComments) {
                paper.showTools();
            }
        },
        {
            padding: 20,
            useComputedStyles: false,
            backgroundColor,
            size: '2x'
        }
    );
});

toolbar.on('comments:pointerclick', () => toggleComments());

toggleComments(true);

const startElement = graph.getCell('r3');

addComment(
    startElement.findView(paper),
    0,
    150,
    'This is a comment on the Start element.'
);

scroller.positionElement(startElement, 'top', { padding: 80 });

function toggleComments(showCommentsExplicit = !showComments) {
    const commentsButton = toolbar.getWidgetByName('comments');
    if (showCommentsExplicit) {
        commentsButton.el.textContent = 'Hide Comments';
        paper.showTools();
        showComments = true;
    } else {
        commentsButton.el.textContent = 'Show Comments';
        paper.hideTools();
        showComments = false;
    }
}

function editText(element, paper) {
    textEditing = true;
    paper.hideTools();
    const bbox = element.getBBox();
    const textarea = document.createElement('textarea');

    // Position & Size
    textarea.style.position = 'absolute';
    textarea.style.boxSizing = 'border-box';
    textarea.style.width = bbox.width + 'px';
    textarea.style.height = bbox.height + 'px';
    textarea.style.transform = V.matrixToTransformString(
        paper.matrix().translate(bbox.x, bbox.y)
    );
    textarea.style.transformOrigin = '0 0';
    textarea.placeholder = 'Add comment';

    // Content
    const textPath = 'label/text';
    textarea.value = element.attr(textPath);

    // Styling
    textarea.style.fontSize = element.attr('label/fontSize') + 'px';
    textarea.style.fontFamily = element.attr('label/fontFamily');
    textarea.style.color = element.attr('label/fill');
    textarea.style.background = element.attr('body/fill');
    textarea.style.textAlign = 'center';
    textarea.style.resize = 'none';
    textarea.style.padding = '5px 10px';
    textarea.style.clipPath =
        'polygon(20px 0%, 100% 0%, 100% 100%, 0% 100%, 0% 20px, 20px 0%)';

    paper.el.appendChild(textarea);
    textarea.focus();
    // Select all text
    textarea.setSelectionRange(0, textarea.value.length);

    textarea.addEventListener('blur', function() {
        element.attr(textPath, textarea.value);
        textarea.remove();
        paper.showTools();
        textEditing = false;
    });

    textarea.addEventListener('keyup', (evt) => {
        if (evt.key === 'Enter' && !evt.shiftKey) {
            const index = textarea.selectionEnd;
            textarea.value =
                textarea.value.slice(0, index - 1) + textarea.value.slice(index);
            textarea.blur();
        }
        if (evt.key === 'Escape') {
            textarea.value = element.attr(textPath);
            textarea.blur();
        }
    });
}

function addComment(cellView, x, y, text = '') {
    const cell = cellView.model;
    const source = { id: cell.id };
    if (cell.isLink()) {
        const lengthAtPoint = cellView.getClosestPointLength(new g.Point(x, y));
        source.anchor = {
            name: 'connectionLength',
            args: {
                length: lengthAtPoint
            }
        };
    }
    const comment = new Comment({
        position: { x: x + 20, y: y - 20 },
        attrs: {
            label: {
                text
            }
        }
    });
    const commentLink = new CommentLink({
        source,
        target: { id: comment.id },
        attrs: {
            line: {
                stroke: '#333333',
                strokeWidth: 2,
                strokeDasharray: '10,5',
                targetMarker: null
            }
        }
    });
    graph.addCells([comment, commentLink]);
    toggleComments(true);
    return comment;
}
