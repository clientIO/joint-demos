import { dia, ui, graphUtils, layout, format } from '@joint/plus';
import { getChildren, getLabel, getElementColor, changePreset, editorView, highlightRange, unhighlightRange, addEventListenerToTokenList } from './helpers';
import { Node, Link, astShapes } from './shapes';
import * as esprima from 'esprima';

export const init = () => {
    const canvas = document.getElementById('canvas') as HTMLDivElement;
    const graph = new dia.Graph({}, {
        cellNamespace: astShapes
    });

    const paper = new dia.Paper({
        model: graph,
        width: 1000,
        height: 600,
        gridSize: 10,
        interactive: false,
        async: true,
        frozen: true,
        sorting: dia.Paper.sorting.APPROX,
    });

    const scroller = new ui.PaperScroller({
        paper,
        baseWidth: 1,
        baseHeight: 1,
        contentOptions: { padding: 10 },
        padding: 20,
        autoResizePaper: true
    });

    const treeLayout = new layout.TreeLayout({
        graph,
        direction: 'BR'
    });

    canvas.appendChild(scroller.el);
    scroller.render().center();
    paper.unfreeze();

    function displayTree() {
        const syntax = esprima.parseScript(editorView.state.doc.toString(), {
            loc: true,
            range: true,
            tokens: true,
            comment: true
        });

        const cells = graphUtils.constructTree(syntax, {
            children: getChildren,
            makeElement: function(node) {
                return new Node({
                    size: { width: 120, height: 30 },
                    attrs: {
                        text: { textWrap: { text: getLabel(node) }},
                        rect: { fill: getElementColor(node) }
                    },
                    node: node
                });
            },
            makeLink: function(parentElement, childElement) {
                return new Link({
                    source: { id: parentElement.id, selector: 'rect' },
                    target: { id: childElement.id, selector: 'rect' }
                });
            }
        });

        scroller.zoom(4, { absolute: true });
        graph.resetCells(cells);
        treeLayout.layout();
        scroller.transitionToRect(graph.getBBox(), { visibility: .9 });

        document.querySelector('#stats .stats-n-nodes').textContent = graph.getElements().length.toString();
        document.querySelector('#stats .stats-n-tokens').textContent = syntax.tokens.length.toString();
        document.querySelector('#stats .stats-tokens').innerHTML = '';

        syntax.tokens.forEach((token: any) => {
            const li = document.createElement('li');
            li.setAttribute('data-range', JSON.stringify(token.range));
            li.append(token.type + '(');
            const span = document.createElement('span');
            span.textContent = token.value;
            li.appendChild(span);
            li.append(')');
            document.querySelector('#stats .stats-tokens').appendChild(li);
        });

        addEventListenerToTokenList();
    }

    // HTML elements
    const showAstBtn = document.getElementById('btn-visualize');
    const clearBtn = document.getElementById('btn-clear');
    const exportSvgBtn = document.getElementById('btn-export-svg');
    const exportPngBtn = document.getElementById('btn-export-png');
    const selectPreset = document.getElementById('select-program');

    // register events
    showAstBtn.addEventListener('click', displayTree);
    clearBtn.addEventListener('click', () => {
        editorView.dispatch(
            editorView.state.update(
                {
                    changes: {
                        from: 0,
                        to: editorView.state.doc.length,
                        insert: ''
                    }
                },
            ),
        );
        displayTree();
    });

    exportSvgBtn.addEventListener('click', () => format.openAsSVG(paper, { useComputedStyles: false }));
    exportPngBtn.addEventListener('click', () => format.openAsPNG(paper, { useComputedStyles: false }));

    selectPreset.addEventListener('change', () => {
        changePreset();
        displayTree();
    });

    let subtrees: { [key: dia.Cell.ID]: dia.Cell[] } = {};

    paper.on('cell:pointerclick', function(cellView) {
        const cell = cellView.model;
        if (cell.isLink()) return;
        if (subtrees[cell.id]) {
            // expand
            graph.addCells(subtrees[cell.id]);
            delete subtrees[cell.id];
        } else {
            // collapse
            const successors = graph.getSuccessors((cell as dia.Element));
            if (successors.length > 0) {
                subtrees[cell.id] = [].concat(
                    graph.getSubgraph(successors),
                    graph.getConnectedLinks(cell, { outbound: true })
                );
                successors.forEach(function(successor) {
                    successor.remove();
                });
            }
        }
        treeLayout.layout();
    });

    paper.on({
        'blank:pointerdown': (evt) => scroller.startPanning(evt),
        'paper:pinch': (evt, ox, oy, scale) => {
            // Enable zooming
            evt.preventDefault();
            const { x } = scroller.getVisibleArea().center();
            const bbox = treeLayout.getLayoutBBox();
            if (bbox) {
                oy = Math.max(bbox.y, Math.min(oy, bbox.height + bbox.y));
            }
            scroller.zoom((scale - 1) * 1.2, { min: 0.2, max: 5, ox: x, oy });
        },
        'element:mouseenter': (elementView) => {
            const range = elementView.model.get('node').range;
            unhighlightRange();
            highlightRange(range);
        },
        'element:mouseleave': () => {
            unhighlightRange();
        }
    });

    // init
    changePreset();
    displayTree();
};
