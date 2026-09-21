import { useLayoutEffect, useMemo } from 'react';
import { Diagram, Paper, useGraph, useOnGraphEvents, useOnPaperEvents, usePaper } from '@joint/react-plus';
import type { CellVisibility } from '@joint/react-plus';
import type { dia } from '@joint/plus';

import { addChild, insertGroup } from './actions';
import { isCellVisible, runLayout } from './layout';
import { renderElement } from './render-element';
import { Group, Node, cellNamespace } from './shapes';
import { addTools, updateTools } from './tools';
import type { ToolActions } from './tools';

const PAPER_PADDING = 40;

/** Captures nothing, so a module-level constant keeps a stable identity. */
const cellVisibility: CellVisibility = ({ model }) => isCellVisible(model);

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
 * A root with three children. The middle child is a fork group with a
 * fork group nested in its first branch; the left child continues into a
 * loop group. Every leaf gets a child of its own, so that the join below
 * the branches is visible.
 */
function createInitialDiagram(graph: dia.Graph): void {
    const root = Node.create('Root');
    graph.addCell(root);

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

function fitContent(paper: dia.Paper, graph: dia.Graph): void {
    // The links count: the return link of a loop runs outside of its group.
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
    paper.updateCellsVisibility();
    addTools(paper, actions);
    fitContent(paper, graph);
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
        toggleGroup: (group) => group.toggle()
    };
    return actions;
}

/**
 * Headless: seeds the diagram, runs the layout, and wires the interactions -
 * the toggle of a group and the hover tools of the elements.
 */
function Editor() {
    const { graph } = useGraph();
    const { paper } = usePaper();
    const actions = useMemo(() => (paper ? createActions(paper, graph) : null), [paper, graph]);

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

    return null;
}

export function App() {
    return (
        <Diagram cellNamespace={cellNamespace} interactions={false}>
            <div className="stage">
                <div className="hint">
                    Hover a node to add a child, a fork group or a loop group below it. The button on the start node of a group collapses it.
                </div>
                <Paper
                    className="paper"
                    renderElement={renderElement}
                    // The layout owns the positions.
                    interactive={false}
                    background={{ color: '#F3F7F6' }}
                    cellVisibility={cellVisibility}
                    options={PAPER_OPTIONS}
                >
                    <Editor />
                </Paper>
            </div>
        </Diagram>
    );
}
