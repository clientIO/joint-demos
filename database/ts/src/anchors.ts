import { g, anchors } from '@joint/plus';

import type { dia } from '@joint/plus';

export const anchorNamespace = { ...anchors };

const customAnchor = function(this: dia.LinkView, view: dia.ElementView, magnet: SVGElement, ref: g.Point) {
    const { model } = view;
    const bbox = view.getNodeUnrotatedBBox(magnet);
    const center = model.getBBox().center();
    const angle = model.angle();
    let refPoint = ref;
    if (ref instanceof SVGElement) {
        const refView = this.paper!.findView(ref);
        refPoint = (refView) ? refView.getNodeBBox(ref).center(): new g.Point();
    }
    refPoint.rotate(center, angle);
    const anchor = (refPoint.x <= (bbox.x + bbox.width)) ? bbox.leftMiddle() : bbox.rightMiddle();
    return anchor.rotate(center, -angle);
};

Object.assign(anchorNamespace, {
    customAnchor
});

