import { dia, util } from '@joint/plus';
import type { Node } from '../models';
import { Attribute } from '../const';

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
        <path @selector="body" stroke-width="6" opacity="0.4" />
    `;

    /* SVG path element representing the node body */
    body: SVGPathElement | null = null;

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
            [Attribute.ActionKey]: [UpdateFlags.Update],
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
        this.el.appendChild(doc.fragment);
        return this;
    }

    update() {
        const { model, body } = this;
        body?.setAttribute('d', model.getOutlinePathData());
        body?.setAttribute('fill', model.getMinimapBackground());
    }
}
