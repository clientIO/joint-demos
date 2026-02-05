import { linkTools, elementTools, dia, shapes, ui } from '@joint/plus';
import { freeTransformAttributes } from '../theme';
import { removeCell } from '../utils';

// Element tools

const removeButton = new elementTools.Remove({
    className: 'tool tool-bpmn-remove',
    x: -15,
    y: 0,
    action: (_evt, view) => {
        document.activeElement.blur();
        removeCell(view.model);
    }
});

const connectButton = new elementTools.Connect({
    x: 'calc(w + 15)',
    y: 0
});

export function addElementTools(elementView) {
    const element = elementView.model;
    if (shapes.bpmn2.CompositePool.isPool(element) || shapes.bpmn2.Swimlane.isSwimlane(element) || shapes.bpmn2.Phase.isPhase(element)) {
        elementView.addTools(new dia.ToolsView({
            tools: [
                removeButton
            ]
        }));
        new ui.BPMNFreeTransform(Object.assign({ cellView: elementView }, freeTransformAttributes));
    }
    else {
        elementView.addTools(new dia.ToolsView({
            tools: [
                removeButton,
                connectButton
            ]
        }));
        new ui.BPMNFreeTransform(Object.assign({ cellView: elementView }, freeTransformAttributes));
    }
}

export function removeElementTools(paper) {
    ui.BPMNFreeTransform.clear(paper);
    paper.removeTools();
}

// Link tools

const linkToolsView = new dia.ToolsView({
    name: 'hover',
    tools: [
        new linkTools.Vertices(),
        new linkTools.Remove({
            className: 'tool tool-bpmn-remove',
        })
    ]
});

export function addLinkTools(linkView) {
    linkView.addTools(linkToolsView);
}

export function removeLinkTools(linkView) {
    linkView.removeTools();
}
