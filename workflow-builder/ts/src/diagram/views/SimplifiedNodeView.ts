// Simplified navigator element view
import { dia, util } from '@joint/plus';
import { Action, Control, Trigger } from '../models';

import type { DiagramNode } from '../models';
/**
 * Update flags for the simplified node view.
 * Map attribute changes to these flags to optimize rendering.
 */
const UpdateFlags = {
    Render: '@render',
    Update: '@update',
    Transform: '@transform'
} as const;

/**
 * Markup definitions for different node types.
 */
const defaultMarkup = util.svg/* xml */`<rect @selector="body" rx="10" ry="10" stroke-width="6" opacity="0.4" />`;
const triggerMarkup = util.svg/* xml */`<rect @selector="body" rx="20" ry="20" stroke-width="6" opacity="0.4" />`;
const actionMarkup = util.svg/* xml */`<circle @selector="body" cx="40" cy="40" r="40" stroke-width="6" opacity="0.4" />`;
const controlMarkup = util.svg/* xml */`<rect @selector="body" rx="30" ry="30" stroke-width="6" opacity="0.4" />`;

export default class SimplifiedNodeView extends dia.ElementView<DiagramNode> {

    markup: dia.MarkupJSON = defaultMarkup;
    body: SVGRectElement | null = null;

    initFlag() {
        return [
            UpdateFlags.Render,
            UpdateFlags.Update,
            UpdateFlags.Transform
        ];
    }

    /**
     * Map attribute changes to update flags.
     */
    presentationAttributes(): dia.CellView.PresentationAttributes {
        return {
            position: [UpdateFlags.Transform],
            angle: [UpdateFlags.Transform],
            size: [UpdateFlags.Update],
        };
    }

    /**
     * The method is called within an animation frame
     * and processes the accumulated flags.
     */
    confirmUpdate(flags: number) {
        if (this.hasFlag(flags, UpdateFlags.Render)) this.render();
        if (this.hasFlag(flags, UpdateFlags.Update)) this.update();
        if (this.hasFlag(flags, UpdateFlags.Transform)) {
            // using the original `updateTransformation()` method
            this.updateTransformation();
        }
        return 0;
    }

    render() {
        const type = this.model.get('type');
        switch (type) {
            case Trigger.type:
                this.markup = triggerMarkup;
                break;
            case Action.type:
                this.markup = actionMarkup;
                break;
            case Control.type:
                this.markup = controlMarkup;
                break;
            default:
                this.markup = defaultMarkup;
        }

        const doc = util.parseDOMJSON(this.markup);
        this.body = doc.selectors.body as SVGRectElement;
        this.body.classList.add(this.model.get('type'));
        this.el.appendChild(doc.fragment);
        return this;
    }

    update() {
        const { model, body } = this;
        if (!body) return;
        const type = model.get('type');

        // Skip size update for Action nodes
        // Because they are circular and size is defined by a fixed radius
        if (type === Action.type)
            return;

        const { width, height } = model.size();
        body.setAttribute('width', `${width}`);
        body.setAttribute('height', `${height}`);
    }
}
