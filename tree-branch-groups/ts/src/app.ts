import { dia } from '@joint/plus';

import { addChild, insertBranchGroup } from './actions';
import { isCellVisible, runLayout } from './layout';
import { Group, Node, TOGGLE_EVENT, cellNamespace } from './shapes';
import { addHoverTools } from './tools';

const PAPER_PADDING = 40;

export function init(): void {

    const graph = new dia.Graph({}, { cellNamespace });

    const paper = new dia.Paper({
        el: document.getElementById('paper')!,
        model: graph,
        cellViewNamespace: cellNamespace,
        width: '100%',
        height: '100%',
        gridSize: 1,
        // The layout owns the positions.
        interactive: false,
        background: { color: '#F3F7F6' },
        defaultConnectionPoint: { name: 'boundary' },
        sorting: dia.Paper.sorting.APPROX,
        viewManagement: {
            lazyInitialize: true,
            disposeHidden: true
        },
        cellVisibility: (cell) => isCellVisible(cell)
    });

    const root = Node.create('Root');
    graph.addCell(root);
    createInitialDiagram(graph, root);

    function refresh(): void {
        paper.freeze();
        const bbox = runLayout(graph, root);
        paper.unfreeze();
        paper.updateCellsVisibility();
        if (!bbox) return;
        paper.transformToFitContent({
            contentArea: bbox,
            padding: PAPER_PADDING,
            minScale: 0.1,
            maxScale: 1,
            verticalAlign: 'top',
            horizontalAlign: 'middle'
        });
    }

    function toggleGroup(group: Group): void {
        // A hidden view is not disposed while it has tools.
        paper.removeTools();
        group.toggle();
        refresh();
    }

    paper.on(TOGGLE_EVENT, (elementView: dia.ElementView, evt: dia.Event) => {
        evt.stopPropagation();
        toggleGroup(elementView.model as Group);
    });

    // The button is focusable; the paper does not forward keyboard events,
    // so Enter and Space are handled on its element.
    paper.el.addEventListener('keydown', (evt: KeyboardEvent) => {
        if (evt.key !== 'Enter' && evt.key !== ' ') return;
        const target = evt.target;
        if (!(target instanceof SVGElement) || target.getAttribute('joint-selector') !== 'button') return;
        const view = paper.findView(target);
        if (!view || !Group.isGroup(view.model)) return;
        evt.preventDefault();
        toggleGroup(view.model);
    });

    addHoverTools(paper, {
        addChild: (element) => {
            addChild(graph, element);
            refresh();
        },
        addBranchGroup: (element) => {
            insertBranchGroup(graph, element);
            refresh();
        }
    });

    window.addEventListener('resize', () => refresh());

    refresh();
}

/**
 * A root with three children. The middle child is a branch group with a
 * branch group nested in its first branch. Every leaf gets a child of its
 * own, so that the join below the branches is visible.
 */
function createInitialDiagram(graph: dia.Graph, root: dia.Element): void {
    const left = addChild(graph, root);
    const group = insertBranchGroup(graph, root);
    const right = addChild(graph, root);

    addChild(graph, left);
    addChild(graph, right);
    addChild(graph, right);

    const [branchA, branchB] = graph.getNeighbors(group.getStart(), { outbound: true });
    const nested = insertBranchGroup(graph, branchA);
    addChild(graph, branchB);

    const [nestedA] = graph.getNeighbors(nested.getStart(), { outbound: true });
    addChild(graph, nestedA);

    addChild(graph, group);
}
