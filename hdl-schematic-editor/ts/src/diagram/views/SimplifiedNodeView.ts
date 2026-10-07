// Simplified navigator element view
import { dia, util } from '@joint/plus';

import type { HdlNode } from '../models';
/**
 * Update flags for the simplified node view.
 * Map attribute changes to these flags to optimize rendering.
 */
const UpdateFlags = {
    Render: '@render',
    Update: '@update',
    Transform: '@transform'
} as const;

const markup = util.svg/* xml */`<rect @selector="body" stroke-width="2" />`;

export default class SimplifiedNodeView extends dia.ElementView<HdlNode> {

    markup: dia.MarkupJSON = markup;
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
        const doc = util.parseDOMJSON(this.markup);
        this.body = doc.selectors.body as SVGRectElement;
        this.body.classList.add(this.model.get('type').replace('.', '-'));
        this.el.appendChild(doc.fragment);
        return this;
    }

    update() {
        const { model, body } = this;
        if (!body) return;
        const { width, height } = model.size();
        body.setAttribute('width', `${width}`);
        body.setAttribute('height', `${height}`);
    }
}
