import { dia } from '@joint/plus';

import { addChild, insertGroup, removeElement } from './actions';
import { areGroupsShown, isCellPainted, runLayout, showGroups } from './layout';
import type { Group } from './shapes';
import { Node, WIDEN_BY, cellNamespace } from './shapes';
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
        cellVisibility: (cell) => isCellPainted(cell)
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
        toggle: (group: Group) => {
            group.toggle();
            refresh();
        },
        remove: (element) => {
            removeElement(graph, element);
            refresh();
        },
        widen: (element) => {
            const { width, height } = element.size();
            element.resize(width + WIDEN_BY, height);
            refresh();
        }
    };

    function refresh(): void {
        // A hidden view is not disposed while it has tools; the tools come back below.
        paper.removeTools();
        paper.freeze();
        const bbox = runLayout(graph, root);
        paper.unfreeze();
        addTools(paper, actions);
        if (bbox) {
            paper.transformToFitContent({
                contentArea: bbox,
                padding: PAPER_PADDING,
                minScale: 0.1,
                maxScale: 1,
                verticalAlign: 'top',
                horizontalAlign: 'middle'
            });
        }
        // Last: what came back on the paper while it was being laid out - the
        // slabs of the groups, with the button off - goes away again. Twice,
        // because a link whose update has to wait for the views of its ends
        // renders those views itself, whether or not `cellVisibility` wants
        // them (`forcePostponedViewUpdate` in `dia.Paper`), and that puts the
        // slab of a group back on the paper as its content is expanded around
        // it. The second pass finds it mounted and takes it off.
        paper.updateCellsVisibility();
        paper.updateCellsVisibility();
    }


    addHoverTools(paper, actions);

    // The slabs of the groups on or off. They are scaffolding of the layout,
    // not part of the diagram, and off by default: they are there to be looked
    // at once, to see what the tree is really hanging its subgraphs on.
    const groupsButton = document.getElementById('groups')!;
    groupsButton.addEventListener('click', () => {
        showGroups(!areGroupsShown());
        groupsButton.textContent = areGroupsShown() ? 'Hide the structural groups' : 'Show the structural groups';
        paper.updateCellsVisibility();
    });

    window.addEventListener('resize', () => refresh());

    refresh();
}

/**
 * A root with three children: the first continues into a loop group, the
 * second into a fork group with a fork group nested in its first branch, and
 * the third is an `if` group, with a node below it on the axis of its two
 * gates. Every leaf gets a child of its own, so that the join below the
 * branches is visible.
 */
function createInitialDiagram(graph: dia.Graph, root: dia.Element): void {
    const left = addChild(graph, root);
    const right = addChild(graph, root);
    const branch = insertGroup(graph, root, 'if');

    const loop = insertGroup(graph, left, 'loop');
    const group = insertGroup(graph, right, 'fork');
    addChild(graph, branch);

    const [branchA, branchB] = graph.getNeighbors(group.getStart(), { outbound: true });
    const nested = insertGroup(graph, branchA, 'fork');
    addChild(graph, branchB);

    const [loopNode] = graph.getNeighbors(loop.getStart(), { outbound: true });
    addChild(graph, loopNode);

    const [nestedA] = graph.getNeighbors(nested.getStart(), { outbound: true });
    addChild(graph, nestedA);

    // The start node of an `if` leads to its branch and, past it, to its end node.
    const branchNode = graph.getNeighbors(branch.getStart(), { outbound: true }).find((node) => node !== branch.getEnd());
    if (branchNode) addChild(graph, branchNode);

    addChild(graph, group);
}
