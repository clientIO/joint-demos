import { CONNECTION_COLOR, IDEA_FILL_COLORS, IDEA_IMAGE_SIZES, IDEA_LINES, IDEA_SPACING } from '../theme';

function _valueAtLevel(array, level) {
    return array[Math.min(level, array.length - 1)];
}

export function layoutTree(app) {
    const { graph, tree, scroller, paper } = app;
    // Visit all elements in breadth-first-fashion and set their
    // presentation attributes based on their distance from the root
    graph.bfs(graph.getRoot(), (idea, level) => {
        const parent = graph.getParent(idea);
        let outlineColor = idea.get('userColor');
        if (!outlineColor) {
            if (parent) {
                outlineColor = parent.get(idea.OUTLINE_COLOR_PROPERTY);
            }
            else {
                outlineColor = CONNECTION_COLOR;
            }
        }
        // The layout `direction` attribute is set for the level 1 ideas only.
        const direction = (level === 1) ? idea.get('direction') || 'R' : null;
        let layout;
        if (!parent) {
            // Only the root idea can have children on the left and right side.
            layout = 'L-R';
        }
        else {
            if (direction) {
                layout = direction;
            }
            else {
                layout = parent.get('layout');
            }
        }
        idea.set({
            line: _valueAtLevel(IDEA_LINES, level),
            spacing: _valueAtLevel(IDEA_SPACING, level),
            fillColor: _valueAtLevel(IDEA_FILL_COLORS, level),
            imageSize: _valueAtLevel(IDEA_IMAGE_SIZES, level),
            outlineColor,
            layout,
            direction,
            level
        });
        const connection = graph.getParentLink(idea);
        if (connection) {
            connection.setColor(outlineColor);
        }
        return true;
    });
    // Set the position of all elements taking the new sizes into account
    // (derived from the new presentation attributes)
    tree.layout();
    // Resize the paper to cover all elements
    paper.fitToContent({
        contentArea: tree.getLayoutBBox(),
        allowNewOrigin: 'any',
        allowNegativeBottomRight: true,
        useModelGeometry: true,
        padding: 100 * scroller.zoom()
    });
}
