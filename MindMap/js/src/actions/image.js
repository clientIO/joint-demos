
export function removeIdeaImage(app, idea) {
    const { graph, selection } = app;
    if (!idea.hasImage())
        return;
    idea.removeImage({ addToHistory: true });
    graph.triggerLayout();
    selection.reset([idea]);
}

export function addIdeaImage(app, idea, imageUrl) {
    const { graph, selection } = app;
    idea.addImage(imageUrl, { addToHistory: true });
    graph.triggerLayout();
    selection.reset([idea]);
}
