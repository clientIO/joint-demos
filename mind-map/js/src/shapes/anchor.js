
const anchor = (elementView, _node, _ref, _opt, end, linkView) => {
    const { model: idea } = elementView;
    const isLine = idea.get('line');
    const isSource = (end === 'source');
    const bbox = idea.getBBox();
    switch (idea.get('layout')) {
        case 'L-R': {
            // Root Idea
            if (!isLine) {
                return bbox.center();
            }
            const { model: connection } = linkView;
            return (connection.getTargetCell().get('direction') === 'L')
                ? bbox.bottomLeft()
                : bbox.bottomRight();
        }
        case 'L': {
            // Left Side Idea
            if (!isLine)
                return bbox.rightMiddle();
            return isSource ? bbox.bottomLeft() : bbox.bottomRight();
        }
        case 'R':
        default: {
            // Right Side Idea
            if (!isLine)
                return bbox.leftMiddle();
            return isSource ? bbox.bottomRight() : bbox.bottomLeft();
        }
    }
};

export default anchor;
