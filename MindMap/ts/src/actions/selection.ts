import type { dia } from '@joint/plus';
import { V, highlighters } from '@joint/plus';
import type { App } from '../classes/App';
import type { Idea } from '../shapes/idea';
import { SELECTION_FRAME_COLOR } from '../theme';

// Selecting

export function selectParent(app: App, idea: Idea): boolean {
    const { graph } = app;
    const parent = graph.getParent(idea);
    if (!parent) return false;
    selectIdea(app, parent);
    return true;
}

export function selectNextSibling(app: App, idea: Idea): boolean {
    const { graph } = app;
    const sibling = graph.getClosestNextSibling(idea);
    if (!sibling) return false;
    selectIdea(app, sibling);
    return true;
}

export function selectPrevSibling(app: App, idea: Idea): boolean {
    const { graph } = app;
    const sibling = graph.getClosestPrevSibling(idea);
    if (!sibling) return false;
    selectIdea(app, sibling);
    return true;
}

export function selectSuccessorIdea(app: App, idea: Idea, direction?: string) {
    const { graph } = app;
    selectIdea(app, graph.getSuccessor(idea, direction) || graph.getRoot());
}

export function selectIdea(app: App, idea: Idea) {
    const { scroller, selection } = app;
    selection.reset([idea]);
    if (scroller.isElementVisible(idea)) return;
    scroller.scrollToElement(idea, { animation: true });
}

export function deselectIdeas(app: App) {
    const { selection } = app;
    selection.reset([]);
}

// Highlighting

let _highlighters: dia.HighlighterView[] = [];

export function highlightIdeas(app: App, ideas: Idea[]) {
    const { paper } = app;
    unhighlightIdeas(app);
    _highlighters = ideas.map(idea => {
        const ideaView = idea.findView(paper);
        return highlighters.stroke.add(ideaView, ideaView.el, 'selection', {
            padding: 8,
            rx: 5,
            ry: 5,
            attrs: {
                'stroke': SELECTION_FRAME_COLOR,
                'stroke-width': 3,
            }
        });
    });
}

export function unhighlightIdeas(_app: App) {
    _highlighters.forEach(highlighter => highlighter.remove());
    _highlighters = [];
}

// Focusing

let _dimmer: V;

export function focusIdea(app: App, idea: Idea) {
    blurIdea(app);
    const { paper } = app;
    const ideaView = idea.findView(paper);
    const { vel } = ideaView;
    _dimmer = V('rect', {
        ...paper.getArea().toJSON(),
        fill: '#FFF',
        opacity: 0.8
    }).addClass('dimmer');
    idea.toFront({ async: false });
    vel.before(_dimmer);
}

export function blurIdea(_app: App) {
    if (!_dimmer) return;
    _dimmer.remove();
    _dimmer = null;
}
