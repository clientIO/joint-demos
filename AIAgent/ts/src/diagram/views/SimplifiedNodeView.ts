import { dia, util } from '@joint/plus';
import type { Node } from '../models';

/**
 * Update flags for the simplified node view.
 * Map attribute changes to these flags to optimize rendering.
 */
const UpdateFlags = {
    Render: '@render',
    Update: '@update',
    Transform: '@transform'
} as const;

/* Simplified element view to be used with the navigator */
export default class SimplifiedNodeView extends dia.ElementView<Node> {

    markup: dia.MarkupJSON = util.svg/* xml */`
        <rect @selector="body" rx="10" ry="10" stroke-width="6" opacity="0.4" />
    `;

    /* SVG rect element representing the node body */
    body: SVGRectElement | null = null;

    initFlag() {
        return [
            UpdateFlags.Render,
            UpdateFlags.Update,
            UpdateFlags.Transform
        ];
    }

    presentationAttributes(): dia.CellView.PresentationAttributes {
        return {
            position: [UpdateFlags.Transform],
            angle: [UpdateFlags.Transform],
            size: [UpdateFlags.Update],
        };
    }

    // calls in an animation frame after a multiple changes
    // has been made to the model
    confirmUpdate(flags: number) {
        if (this.hasFlag(flags, UpdateFlags.Render)) this.render();
        if (this.hasFlag(flags, UpdateFlags.Update)) this.update();
        // using the original `updateTransformation()` method
        if (this.hasFlag(flags, UpdateFlags.Transform)) this.updateTransformation();
        return 0;
    }

    render() {
        const doc = util.parseDOMJSON(this.markup);
        this.body = doc.selectors.body as SVGRectElement;
        this.body.classList.add(this.model.get('type'));
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
