import { Attribute, NodeTypes } from '../diagram/const';
import { HdlNode } from '../diagram/models';

import type { App } from '../app';
import type { Model } from '../diagram/types';

/**
 * Renders the current Yosys JSON in the JSON panel.
 */
export function updateJSONPanel(app: App) {
    const { jsonPanel } = app;

    jsonPanel.setJSON(app.getYosysJSON(), `module ${app.getModuleName()}`);
}

/**
 * Highlights the JSON entry of the given model in the JSON panel.
 */
export function highlightModelJSON(app: App, model: Model | null) {
    const { jsonPanel } = app;

    jsonPanel.highlight(model ? getModelJSONPath(app, model) : null);
}

/**
 * Get the path of the Yosys JSON entry representing the given model.
 */
function getModelJSONPath(app: App, model: Model): string | null {
    const modulePath = `modules/${app.getModuleName()}`;

    if (model.isLink()) {
        // A wire is represented by the net of its source port
        const source = model.getSourceElement();
        if (!source) return null;
        if (source.get('type') === NodeTypes.Input) {
            return `${modulePath}/ports/${source.get(Attribute.Name)}`;
        }
        const netName = (source.get(Attribute.NetNames) || {})[model.source().port as string];
        return netName ? `${modulePath}/netnames/${netName}` : null;
    }

    if (!(model instanceof HdlNode)) return null;
    const name = model.getName();
    switch (model.get('type')) {
        case NodeTypes.Input:
        case NodeTypes.Output:
            return `${modulePath}/ports/${name}`;
        case NodeTypes.Constant:
        case NodeTypes.Split:
        case NodeTypes.Join:
            // Virtual nodes are not part of the Yosys JSON
            return null;
        default:
            return `${modulePath}/cells/${name}`;
    }
}
