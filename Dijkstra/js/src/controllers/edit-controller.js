/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

class EditController extends Controller {
    startListening() {
        const { graph, paper } = this.context;

        this.listenTo(graph, {
            'change:source': replaceLink,
            'change:target': replaceLink,
        });

        this.listenTo(paper, {
            'link:mouseenter': showLinkTools,
            'link:mouseleave': hideLinkTools,
            'element:mouseenter': showElementTools,
            'element:mouseleave': hideElementTools,
            'element:pointerdblclick': removeElement,
            'blank:pointerdblclick': addElement,
        });
    }
}

function showLinkTools(_context, linkView, _evt) {
    linkView.showTools();
}

function hideLinkTools(_context, linkView) {
    linkView.hideTools();
}

function showElementTools(_context, elementView, _evt) {
    elementView.showTools();
}

function hideElementTools(_context, elementView) {
    elementView.hideTools();
}

// When a new link is created via UI (in Edit mode), remove the previous link
// and create a new one that has the ID constructed as "nodeA,nodeB". The
// reason we're removing the old link below is that it is not a good idea
// to change ID's of any model in JointJS.
function replaceLink({ createLink }, link, _collection, opt) {
    const sourceId = link.get('source').id;
    const targetId = link.get('target').id;
    if (opt.ui && sourceId && targetId) {
        link.remove();
        createLink(sourceId, targetId);
    }
}

function removeElement({ setStartView, setEndView, getStartView }, elementView) {
    const pathStart = getStartView();

    if (elementView.model.id === pathStart.model.id) {
        setStartView(null);
        setEndView(null);
    }
    elementView.model.remove();
}

function addElement({ createNode, size, getNodeId }, _evt, x, y) {
    const node = createNode(getNodeId());
    node.position(x - size / 2, y - size / 2);
}
