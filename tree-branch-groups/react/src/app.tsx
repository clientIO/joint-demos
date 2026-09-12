import { useLayoutEffect } from 'react';
import { Diagram, Paper, useGraph, useOnGraphEvents, useOnPaperEvents, usePaper } from '@joint/react-plus';
import type { CellVisibility } from '@joint/react-plus';
import type { dia } from '@joint/plus';

import { addChild, insertBranchGroup } from './actions';
import { isCellVisible, runLayout } from './layout';
import { renderElement } from './render-element';
import { Group, Node, cellNamespace } from './shapes';
import { createHoverTools, getToolsTarget } from './tools';

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
 * A root with three children. The middle child is a branch group with a
 * branch group nested in its first branch. Every leaf gets a child of its
 * own, so that the join below the branches is visible.
 */
function createInitialDiagram(graph: dia.Graph): void {
    const root = Node.create('Root');
    graph.addCell(root);

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

function fitContent(paper: dia.Paper, graph: dia.Graph): void {
    const contentArea = graph.getCellsBBox(graph.getElements().filter(isCellVisible));
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

/** Lays the whole tree out again and fits it into the paper. */
function refresh(paper: dia.Paper, graph: dia.Graph): void {
    const root = getRoot(graph);
    if (!root) return;
    paper.freeze();
    runLayout(graph, root);
    paper.unfreeze();
    paper.updateCellsVisibility();
    fitContent(paper, graph);
}

/**
 * Headless: seeds the diagram, runs the layout, and wires the interactions -
 * the collapse of a group and the hover tools of the elements.
 */
function Editor() {
    const { graph } = useGraph();
    const { paper } = usePaper();

    useLayoutEffect(() => {
        if (!paper) return;
        // Strict mode runs the effect twice; the diagram is seeded once.
        if (graph.getCells().length === 0) createInitialDiagram(graph);
        refresh(paper, graph);

        // The paper fills its container through CSS; a resize only needs a refit.
        const observer = new ResizeObserver(() => fitContent(paper, graph));
        observer.observe(paper.el);
        return () => observer.disconnect();
    }, [paper, graph]);

    // The collapse button of a group flips `data.collapsed` on the model;
    // the tree is laid out again around the collapsed (or expanded) group.
    useOnGraphEvents({
        'change:data': (cell: dia.Cell) => {
            if (!paper || !Group.isGroup(cell)) return;
            // A hidden view is not disposed while it has tools.
            paper.removeTools();
            refresh(paper, graph);
        }
    });

    useOnPaperEvents({
        onElementMouseEnter: ({ view, model }) => {
            if (!paper) return;
            const target = getToolsTarget(model);
            if (!target) return;
            view.removeTools();
            view.addTools(createHoverTools(target, {
                addChild: (element) => {
                    addChild(graph, element);
                    refresh(paper, graph);
                },
                addBranchGroup: (element) => {
                    insertBranchGroup(graph, element);
                    refresh(paper, graph);
                }
            }));
        },
        onElementMouseLeave: ({ view }) => {
            view.removeTools();
        }
    });

    return null;
}

export function App() {
    return (
        <Diagram cellNamespace={cellNamespace} interactions={false}>
            <div className="stage">
                <div className="hint">
                    Hover a node to add a child or a branch group below it. The button in the corner of a group collapses it.
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
