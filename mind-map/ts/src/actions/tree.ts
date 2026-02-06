import { graphUtils } from '@joint/plus';
import type { App } from '../classes/App';
import { makeElement, makeLink } from '../shapes';
import { layoutTree } from './layout';
import { IDEA_LABEL_DEFAULT } from '../theme';
import type { Idea } from '../shapes/idea';

export function importTreeNode(app: App, data: graphUtils.ConstructTreeNode) {
    const { graph, scroller } = app;
    const cells = graphUtils.constructTree(data, { makeElement, makeLink });
    if (cells.length === 0) return;
    graph.resetCells(cells);
    layoutTree(app);
    scroller.centerContent({ useModelGeometry: true });
}

export function addNextSiblingIdea(app: App, idea: Idea): Idea | null {
    const { graph } = app;
    const parent = graph.getParent(idea);
    if (!parent) return null;
    const direction = (idea.level === 1 && !graph.getNextSibling(idea))
        ? graph.getBalancedChildDirection(parent)
        : idea.direction;
    const sibling = makeElement({
        label: IDEA_LABEL_DEFAULT,
        direction,
        siblingRank: idea.siblingRank
    });
    const link = makeLink(parent, sibling);
    graph.addCells([sibling, link], { addToHistory: true });
    graph.triggerLayout();
    return sibling;
}

export function addPrevSiblingIdea(app: App, idea: Idea): Idea | null {
    const { graph } = app;
    const parent = graph.getParent(idea);
    if (!parent) return null;
    const direction = (idea.level === 1 && !graph.getPrevSibling(idea))
        ? graph.getBalancedChildDirection(parent)
        : idea.direction;
    const sibling = makeElement({
        label: IDEA_LABEL_DEFAULT,
        direction,
        siblingRank: idea.siblingRank - 1
    });
    const link = makeLink(parent, sibling);
    graph.addCells([sibling, link], { addToHistory: true });
    graph.triggerLayout();
    return sibling;
}

export function addLastChildIdea(app: App, idea: Idea): Idea {
    const { graph } = app;
    const direction = (idea.level === 0)
        ? graph.getBalancedChildDirection(idea)
        : null;
    const child = makeElement({
        label: IDEA_LABEL_DEFAULT,
        direction
    });
    const link = makeLink(idea, child);
    graph.addCells([child, link], { addToHistory: true });
    graph.triggerLayout();
    return child;
}

export function removeIdeaBranch(app: App, idea: Idea) {
    const { graph } = app;
    // Never delete the main idea
    if (!graph.getParent(idea)) return;
    graph.removeBranch(idea, { addToHistory: true });
    graph.triggerLayout();
}
