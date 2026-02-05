
import type { Idea } from '../shapes/idea';
import type { App } from '../classes/App';

export function removeIdeaImage(app: App, idea: Idea) {
    const { graph, selection } = app;
    if (!idea.hasImage()) return;
    idea.removeImage({ addToHistory: true });
    graph.triggerLayout();
    selection.reset([idea]);
}

export function addIdeaImage(app: App, idea: Idea, imageUrl: string) {
    const { graph, selection } = app;
    idea.addImage(imageUrl, { addToHistory: true });
    graph.triggerLayout();
    selection.reset([idea]);
}
