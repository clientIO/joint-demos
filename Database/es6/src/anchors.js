import { g, anchors } from '@joint/plus';

export const anchorNamespace = Object.assign({}, anchors);

const customAnchor = function (view, magnet, ref) {
    let anchor;
    const { model } = view;
    const bbox = view.getNodeUnrotatedBBox(magnet);
    const center = model.getBBox().center();
    const angle = model.angle();
    let refPoint = ref;
    if (ref instanceof Element) {
        const refView = this.paper.findView(ref);
        refPoint = (refView) ? refView.getNodeBBox(ref).center() : new g.Point();
    }
    refPoint.rotate(center, angle);
    anchor = (refPoint.x <= (bbox.x + bbox.width)) ? bbox.leftMiddle() : bbox.rightMiddle();
    return anchor.rotate(center, -angle);
};

Object.assign(anchorNamespace, {
    customAnchor
});

