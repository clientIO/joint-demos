import { V, highlighters } from '@joint/plus';
import { SELECTION_FRAME_COLOR } from '../theme';

// Selecting

export function selectParent(app, idea) {
    const { graph } = app;
    const parent = graph.getParent(idea);
    if (!parent)
        return false;
    selectIdea(app, parent);
    return true;
}

export function selectNextSibling(app, idea) {
    const { graph } = app;
    const sibling = graph.getClosestNextSibling(idea);
    if (!sibling)
        return false;
    selectIdea(app, sibling);
    return true;
}

export function selectPrevSibling(app, idea) {
    const { graph } = app;
    const sibling = graph.getClosestPrevSibling(idea);
    if (!sibling)
        return false;
    selectIdea(app, sibling);
    return true;
}

export function selectSuccessorIdea(app, idea, direction) {
    const { graph } = app;
    selectIdea(app, graph.getSuccessor(idea, direction) || graph.getRoot());
}

export function selectIdea(app, idea) {
    const { scroller, selection } = app;
    selection.reset([idea]);
    if (scroller.isElementVisible(idea))
        return;
    scroller.scrollToElement(idea, { animation: true });
}

export function deselectIdeas(app) {
    const { selection } = app;
    selection.reset([]);
}

// Highlighting

let _highlighters = [];

export function highlightIdeas(app, ideas) {
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

export function unhighlightIdeas(_app) {
    _highlighters.forEach(highlighter => highlighter.remove());
    _highlighters = [];
}

// Focusing

let _dimmer;

export function focusIdea(app, idea) {
    blurIdea(app);
    const { paper } = app;
    const ideaView = idea.findView(paper);
    const { vel } = ideaView;
    _dimmer = V('rect', Object.assign(Object.assign({}, paper.getArea().toJSON()), { fill: '#FFF', opacity: 0.8 })).addClass('dimmer');
    idea.toFront({ async: false });
    vel.before(_dimmer);
}

export function blurIdea(_app) {
    if (!_dimmer)
        return;
    _dimmer.remove();
    _dimmer = null;
}
