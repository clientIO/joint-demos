import { useLayoutEffect } from 'react';
import { Diagram, Paper, useGraph, useOnPaperEvents, usePaper } from '@joint/react-plus';
import type { CellVisibility } from '@joint/react-plus';
import type { dia } from '@joint/plus';

import { addChild, deleteElement, insertGroup, insertNodeOnLink } from './actions';
import { getReturnLink } from './cycle-group';
import { gateAnchor } from './gate-anchor';
import { isCellVisible, runLayout } from './layout';
import { renderElement } from './render-element';
import { Node, cellNamespace } from './shapes';
import { createHoverTools, createLinkTools, handleElementClick } from './tools';
import type { ToolActions } from './tools';

const PAPER_PADDING = 40;

/** Captures nothing, so a module-level constant keeps a stable identity. */
const cellVisibility: CellVisibility = ({ model }) => isCellVisible(model);

/**
 * Native paper options the React props do not expose. The links end on the
 * model geometry: a group has no view at all, and the nodes are rendered by
 * React after the model changes. The anchor puts a link on the gates of a group.
 */
const PAPER_OPTIONS: dia.Paper.Options = {
    gridSize: 1,
    defaultAnchor: gateAnchor,
    defaultConnectionPoint: { name: 'bbox', args: { useModelGeometry: true }}
};

/** The one element of the tree that is neither embedded nor a target of a link. */
function getRoot(graph: dia.Graph): dia.Element | undefined {
    return graph.getElements().find((element) => {
        return !element.isEmbedded() && graph.getConnectedLinks(element, { inbound: true }).length === 0;
    });
}

/**
 * A root with three children: a node, a branch group with a branch group
 * nested in its first branch, and a cycle group with a fork on its way down
 * and two nodes on its way back up. Every leaf gets a child of its own, so
 * that the join below the branches is visible.
 */
function createInitialDiagram(graph: dia.Graph): void {
    const root = Node.create('Root');
    graph.addCell(root);

    const left = addChild(graph, root);
    const branches = insertGroup(graph, root, 'branch');
    const cycle = insertGroup(graph, root, 'cycle');

    addChild(graph, left);

    const [branchA, branchB] = graph.getNeighbors(branches.getStart(), { outbound: true });
    const nested = insertGroup(graph, branchA, 'branch');
    addChild(graph, branchB);

    const [nestedA] = graph.getNeighbors(nested.getStart(), { outbound: true });
    addChild(graph, nestedA);

    addChild(graph, branches);

    const [down] = graph.getNeighbors(cycle.getStart(), { outbound: true });
    addChild(graph, down);
    addChild(graph, down);
    // A new cycle has an empty return path; the seed puts two nodes on it.
    const up = insertNodeOnLink(graph, getReturnLink(graph, cycle)!);
    addChild(graph, up);

    addChild(graph, cycle);
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
 * Headless: seeds the diagram, runs the layout, and wires the hover tools of
 * the elements and the links.
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

    function getToolActions(paper: dia.Paper): ToolActions {
        return {
            addChild: (element) => {
                addChild(graph, element);
                refresh(paper, graph);
            },
            addGroup: (element, kind) => {
                insertGroup(graph, element, kind);
                refresh(paper, graph);
            },
            delete: (element) => {
                // The tools live on the hovered view, which is about to be removed.
                paper.removeTools();
                deleteElement(graph, element);
                refresh(paper, graph);
            },
            insertNode: (link) => {
                paper.removeTools();
                insertNodeOnLink(graph, link);
                refresh(paper, graph);
            },
            toggleGroup: (group) => {
                // The tools live on the hovered view; the content it belongs to is about to be hidden or shown.
                paper.removeTools();
                group.toggle();
                refresh(paper, graph);
            }
        };
    }

    useOnPaperEvents({
        onElementPointerClick: ({ view }) => {
            if (paper) handleElementClick(view, getToolActions(paper));
        },
        onElementMouseEnter: ({ view, model }) => {
            if (!paper) return;
            const tools = createHoverTools(graph, model, getToolActions(paper));
            if (!tools) return;
            view.removeTools();
            view.addTools(tools);
        },
        onElementMouseLeave: ({ view }) => {
            view.removeTools();
        },
        onLinkMouseEnter: ({ view, model }) => {
            if (!paper) return;
            const tools = createLinkTools(model, getToolActions(paper));
            if (!tools) return;
            view.removeTools();
            view.addTools(tools);
        },
        onLinkMouseLeave: ({ view }) => {
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
                    Hover a node to add a child, a branch group or a cycle group below it, or to delete it. Click the plus of a group to add below it; hover its start node to collapse or expand it.
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
