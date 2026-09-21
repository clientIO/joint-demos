import { dia } from '@joint/plus';

import { addChild, insertGroup } from './actions';
import { isCellVisible, runLayout } from './layout';
import type { Group } from './shapes';
import { Node, cellNamespace } from './shapes';
import { addHoverTools, addTools } from './tools';
import type { ToolActions } from './tools';

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

    // Every edit changes the graph and lays the tree out again.
    const actions: ToolActions = {
        addChild: (element) => {
            addChild(graph, element);
            refresh();
        },
        addGroup: (element, kind) => {
            insertGroup(graph, element, kind);
            refresh();
        },
        toggleGroup: (group: Group) => {
            group.toggle();
            refresh();
        }
    };

    function refresh(): void {
        // A hidden view is not disposed while it has tools; the tools come back below.
        paper.removeTools();
        paper.freeze();
        const bbox = runLayout(graph, root);
        paper.unfreeze();
        paper.updateCellsVisibility();
        addTools(paper, actions);
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


    addHoverTools(paper, actions);

    window.addEventListener('resize', () => refresh());

    refresh();
}

/**
 * A root with three children. The middle child is a fork group with a
 * fork group nested in its first branch; the left child continues into a
 * loop group. Every leaf gets a child of its own, so that the join below
 * the branches is visible.
 */
function createInitialDiagram(graph: dia.Graph, root: dia.Element): void {
    const left = addChild(graph, root);
    const group = insertGroup(graph, root, 'fork');
    const right = addChild(graph, root);

    const loop = insertGroup(graph, left, 'loop');
    addChild(graph, right);
    addChild(graph, right);

    const [branchA, branchB] = graph.getNeighbors(group.getStart(), { outbound: true });
    const nested = insertGroup(graph, branchA, 'fork');
    addChild(graph, branchB);

    const [loopNode] = graph.getNeighbors(loop.getStart(), { outbound: true });
    addChild(graph, loopNode);

    const [nestedA] = graph.getNeighbors(nested.getStart(), { outbound: true });
    addChild(graph, nestedA);

    addChild(graph, group);
}
