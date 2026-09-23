import { useLayoutEffect, useMemo, useState } from 'react';
import { Diagram, Paper, useGraph, useOnGraphEvents, useOnPaperEvents, usePaper } from '@joint/react-plus';
import type { CellVisibility } from '@joint/react-plus';
import type { dia } from '@joint/plus';

import { addChild, insertGroup, removeElement } from './actions';
import { areGroupsShown, isCellPainted, isCellVisible, runLayout, showGroups } from './layout';
import { renderElement } from './render-element';
import { COLORS, Group, Node, WIDEN_BY, cellNamespace } from './shapes';
import { addTools, updateTools } from './tools';
import type { ToolActions } from './tools';

const PAPER_PADDING = 40;

/** Captures nothing, so a module-level constant keeps a stable identity. */
const cellVisibility: CellVisibility = ({ model }) => isCellPainted(model);

/**
 * Native paper options the React props do not expose. The links end on the
 * model geometry: the elements are rendered by React after the model changes,
 * so a link routed against the DOM box would see the size a group had before
 * it was collapsed or expanded.
 */
const PAPER_OPTIONS: dia.Paper.Options = {
    gridSize: 1,
    defaultAnchor: { name: 'center', args: { useModelGeometry: true }},
    defaultConnectionPoint: { name: 'bbox', args: { useModelGeometry: true }}
};

/** The one element of the tree that is neither embedded nor a target of a link. */
function getRoot(graph: dia.Graph): dia.Element | undefined {
    return graph.getElements().find((element) => {
        return !element.isEmbedded() && graph.getConnectedLinks(element, { inbound: true }).length === 0;
    });
}

/**
 * A root with three children: the first continues into a loop group, the
 * second into a fork group with a fork group nested in its first branch, and
 * the third is an `if` group, with a node below it on the axis of its two
 * gates. Every leaf gets a child of its own, so that the join below the
 * branches is visible.
 */
function createInitialDiagram(graph: dia.Graph): void {
    const root = Node.create('Root');
    graph.addCell(root);

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

function fitContent(paper: dia.Paper, graph: dia.Graph): void {
    // The links count: the `skip` label of an `if` sits beside its box.
    const contentArea = graph.getCellsBBox(graph.getCells().filter(isCellVisible));
    if (!contentArea) return;
    paper.transformToFitContent({
        contentArea,
        padding: PAPER_PADDING,
        minScale: 0.1,
        maxScale: 1,
        verticalAlign: 'top',
        horizontalAlign: 'middle'
    });
}

/** Lays the whole tree out again, fits it into the paper and puts the toggles of the groups back. */
function refresh(paper: dia.Paper, graph: dia.Graph, actions: ToolActions): void {
    const root = getRoot(graph);
    if (!root) return;
    // A hidden view is not disposed while it has tools; the tools come back below.
    paper.removeTools();
    paper.freeze();
    runLayout(graph, root);
    paper.unfreeze();
    addTools(paper, actions);
    fitContent(paper, graph);
    // Last: what came back on the paper while it was being laid out - the
    // slabs of the groups, with the button off - goes away again. Twice,
    // because a link whose update has to wait for the views of its ends
    // renders those views itself, whether or not `cellVisibility` wants them
    // (`forcePostponedViewUpdate` in `dia.Paper`), and that puts the slab of a
    // group back on the paper as its content is expanded around it. The second
    // pass finds it mounted and takes it off.
    paper.updateCellsVisibility();
    paper.updateCellsVisibility();
}

/** Every edit changes the graph; the tree is laid out again. A toggle changes the model, which the editor listens to. */
function createActions(paper: dia.Paper, graph: dia.Graph): ToolActions {
    const actions: ToolActions = {
        addChild: (element) => {
            addChild(graph, element);
            refresh(paper, graph, actions);
        },
        addGroup: (element, kind) => {
            insertGroup(graph, element, kind);
            refresh(paper, graph, actions);
        },
        // The toggle changes the model; the editor listens and lays the tree out again.
        toggle: (group) => group.toggle(),
        remove: (element) => {
            removeElement(graph, element);
            refresh(paper, graph, actions);
        },
        widen: (element) => {
            const { width, height } = element.size();
            element.resize(width + WIDEN_BY, height);
            refresh(paper, graph, actions);
        }
    };
    return actions;
}

/**
 * Seeds the diagram, runs the layout, and wires the interactions - the toggle
 * of a group and the hover tools of the elements. It renders one thing, the
 * button that puts the slabs of the groups on the paper; everything on the
 * paper is drawn by the cells.
 */
function Editor() {
    const { graph } = useGraph();
    const { paper } = usePaper();
    const actions = useMemo(() => (paper ? createActions(paper, graph) : null), [paper, graph]);
    const [groupsOn, setGroupsOn] = useState(areGroupsShown());

    useLayoutEffect(() => {
        if (!paper || !actions) return;
        // Strict mode runs the effect twice; the diagram is seeded once.
        if (graph.getCells().length === 0) createInitialDiagram(graph);
        refresh(paper, graph, actions);

        // The paper fills its container through CSS; a resize only needs a refit.
        const observer = new ResizeObserver(() => fitContent(paper, graph));
        observer.observe(paper.el);
        return () => observer.disconnect();
    }, [paper, graph, actions]);

    // The toggle of a group flips `data.collapsed` on the model;
    // the tree is laid out again around the collapsed (or expanded) group.
    useOnGraphEvents({
        'change:data': (cell: dia.Cell) => {
            if (!paper || !actions || !Group.isGroup(cell)) return;
            refresh(paper, graph, actions);
        }
    });

    useOnPaperEvents({
        onElementMouseEnter: ({ view }) => {
            if (actions) updateTools(view, actions, true);
        },
        onElementMouseLeave: ({ view }) => {
            if (actions) updateTools(view, actions, false);
        }
    });

    // The slabs of the groups on or off. They are scaffolding of the layout,
    // not part of the diagram, and off by default: they are there to be looked
    // at once, to see what the tree is really hanging its subgraphs on.
    return (
        <button
            type="button"
            className="button"
            onClick={() => {
                showGroups(!areGroupsShown());
                setGroupsOn(areGroupsShown());
                paper?.updateCellsVisibility();
            }}
        >
            {groupsOn ? 'Hide the structural groups' : 'Show the structural groups'}
        </button>
    );
}

export function App() {
    return (
        <Diagram cellNamespace={cellNamespace} interactions={false}>
            <div className="stage">
                <Paper
                    className="paper"
                    renderElement={renderElement}
                    // The layout owns the positions.
                    interactive={false}
                    background={{ color: COLORS.background }}
                    cellVisibility={cellVisibility}
                    options={PAPER_OPTIONS}
                >
                    <Editor />
                </Paper>
            </div>
        </Diagram>
    );
}
