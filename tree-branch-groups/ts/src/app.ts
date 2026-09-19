import { dia, ui } from '@joint/plus';

import { addBelow, addChild, deleteElement, ensureAddButtons, insertGroup, insertOnLink } from './actions';
import { gateAnchor } from './gate-anchor';
import { isCellVisible, runLayout } from './layout';
import { COLORS, Node, cellNamespace } from './shapes';
import { addHoverTools, addTooltips, placeLinkTools } from './tools';
import type { ToolActions } from './tools';

const PAPER_PADDING = 40;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 3;

export function init(): void {

    const graph = new dia.Graph({}, { cellNamespace });

    const paper = new dia.Paper({
        model: graph,
        cellViewNamespace: cellNamespace,
        gridSize: 1,
        // The buttons on the edges of the pills reach outside the paper when a pill sits at its edge.
        overflow: true,
        clickThreshold: 10,
        // The layout owns the positions.
        interactive: false,
        background: { color: COLORS.background },
        // The links meet a group where its gates are. Both ends are computed
        // from the models: a group has no view.
        defaultAnchor: gateAnchor,
        defaultConnectionPoint: { name: 'bbox', args: { useModelGeometry: true }},
        defaultConnector: { name: 'straight', args: { cornerType: 'cubic' }},
        sorting: dia.Paper.sorting.APPROX,
        viewManagement: {
            lazyInitialize: true,
            disposeHidden: true
        },
        cellVisibility: (cell) => isCellVisible(cell)
    });

    // The paper lives in a scroller: it grows with the content, and the
    // content is panned and zoomed - by dragging the blank area, with a
    // trackpad (two fingers pan, a pinch zooms) or with the mouse wheel.
    const scroller = new ui.PaperScroller({
        paper,
        autoResizePaper: true,
        padding: PAPER_PADDING,
        cursor: 'grab',
        scrollWhileDragging: false
    });
    document.getElementById('paper')!.appendChild(scroller.el);
    scroller.render();

    paper.on('blank:pointerdown', (evt: dia.Event) => scroller.startPanning(evt));
    paper.on('paper:pan', (evt: dia.Event, deltaX: number, deltaY: number) => {
        evt.preventDefault();
        scroller.el.scrollLeft += deltaX;
        scroller.el.scrollTop += deltaY;
    });
    paper.on('paper:pinch', (evt: dia.Event, x: number, y: number, scale: number) => {
        evt.preventDefault();
        scroller.zoom(scroller.zoom() * scale, { min: MIN_ZOOM, max: MAX_ZOOM, ox: x, oy: y, absolute: true });
    });

    const root = Node.createRoot();
    graph.addCell(root);
    createInitialDiagram(graph, root);

    /**
     * Lays the diagram out again and re-renders it. The view is fitted to the
     * content once, at the start; an edit, a collapse or an expansion keeps
     * the zoom and the scroll position the user has.
     */
    function refresh({ fit = false } = {}): void {
        paper.freeze();
        ensureAddButtons(graph);
        const bbox = runLayout(graph, root);
        paper.unfreeze();
        paper.updateCellsVisibility();
        // The routes are known once rendered: the insert buttons and the option
        // names are placed in a second, cheap pass. The tools of the previous
        // layout go first - hover tools included, they come back on hover.
        paper.removeTools();
        placeLinkTools(paper, actions);
        if (!fit || !bbox) return;
        scroller.zoomToFit({
            contentArea: bbox,
            padding: PAPER_PADDING,
            minScale: MIN_ZOOM,
            maxScale: 1,
            useModelGeometry: true
        });
        scroller.centerContent({ useModelGeometry: true });
    }

    const actions: ToolActions = {
        addBelow: (element, choice) => {
            addBelow(graph, element, choice);
            refresh();
        },
        delete: (element) => {
            // The tools live on the hovered view, which is about to be removed.
            paper.removeTools();
            deleteElement(graph, element);
            refresh();
        },
        insertOnLink: (link, choice) => {
            paper.removeTools();
            insertOnLink(graph, link, choice);
            refresh();
        },
        toggleGroup: (group) => {
            group.toggle();
            refresh();
        }
    };
    addHoverTools(paper, actions);
    addTooltips(paper);

    refresh({ fit: true });
}

/**
 * A root with a decision below it, and three children of the decision: a
 * node ending in an end of the diagram, a fork group with a fork group nested in its first branch, and a loop
 * group whose tree starts with a decision that splits into two. Groups are
 * created empty, so the seed fills them the way a user would. Every leaf gets
 * a child of its own, so that the join below the branches is visible.
 */
function createInitialDiagram(graph: dia.Graph, root: dia.Element): void {
    const decision = addBelow(graph, root, 'decision');

    const left = addChild(graph, decision);
    addBelow(graph, addChild(graph, left), 'end');

    const fork = insertGroup(graph, decision, 'fork');
    const branchA = addChild(graph, fork.getStart());
    const branchB = addChild(graph, fork.getStart());
    const nested = insertGroup(graph, branchA, 'fork');
    const nestedA = addChild(graph, nested.getStart());
    addChild(graph, nested.getStart());
    addChild(graph, nestedA);
    addChild(graph, branchB);
    addChild(graph, fork);

    const loop = insertGroup(graph, decision, 'loop');
    const split = addBelow(graph, loop.getStart(), 'decision');
    addChild(graph, split);
    addChild(graph, split);
    addChild(graph, loop);
}
