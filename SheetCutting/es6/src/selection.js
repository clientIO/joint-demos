import { dia, highlighters, elementTools } from '@joint/plus';
import { RotateTool } from './rotate-tool';

const highlighter = highlighters.addClass;

const highlighterOptions = {
    className: 'selected-shape'
};

export function unselectElement(paper) {
    highlighter.removeAll(paper, 'selected');
    paper.removeTools();
}

export function selectElement(elementView) {
    unselectElement(elementView.paper);
    highlighter.add(elementView, 'body', 'selected', highlighterOptions);
    elementView.model.toFront({ ignoreHistory: true });
    elementView.addTools(new dia.ToolsView({
        tools: [
            new elementTools.Remove({
                scale: 1.3,
                x: -10,
                y: -10
            }),
            new RotateTool({
                gap: 20,
                buttonColor: '#1b998b',
            })
        ]
    }));
}
