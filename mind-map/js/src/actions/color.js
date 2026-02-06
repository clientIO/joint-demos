
export function changeIdeaColor(app, idea, color) {
    const { graph, selection, history } = app;
    const { undoStack } = history;
    if (undoStack.length > 0) {
        // Check if the last command was also the change of the color
        // and cancel the command if it was done on the same idea.
        let lastCommand = undoStack[undoStack.length - 1];
        if (Array.isArray(lastCommand)) {
            [lastCommand] = lastCommand;
        }
        const { action, data } = lastCommand;
        if (action === 'change:userColor' && data.id === idea.id) {
            history.cancel();
        }
    }
    
    idea.set('userColor', color, { addToHistory: true });
    graph.triggerLayout();
    // reset the toolbar color
    selection.reset([idea]);
}
