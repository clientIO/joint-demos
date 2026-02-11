import { dia, g, V } from '@joint/plus';

export const Path = dia.Element.define('Path', {
    attrs: {
        path: {
            strokeMiterlimit: 4,
            strokeLinejoin: 'miter',
            strokeLinecap: 'butt',
            strokeOpacity: 1,
            strokeDasharray: 'none',
            fillOpacity: 1,
            fillRule: 'nonzero',
            cursor: 'move'
        }
    }
}, {

    useCSSSelectors: true,
    markup: 'path',

    updateBBox: function(bbox, opt) {

        this.position(bbox.x, bbox.y, opt);
        this.resize(bbox.width || 1, bbox.height || 1, opt);
    },

    updatePathData: function(paper) {

        var view = this.findView(paper);
        var path = view.vel.findOne('path');
        var untransformedBBox = path.getBBox({ target: view.el });
        var transformedBBox = path.getBBox({ target: paper.layers });
        var position = transformedBBox.center().difference(untransformedBBox.center().difference(untransformedBBox.topLeft()));
        this.attr('path/refD', path.attr('d'), {
            nextBBox: new g.Rect(position.x, position.y, untransformedBBox.width, untransformedBBox.height),
            prevBBox: this.getBBox()
        });
    }
}, {

    createFromNode: function(pathNode, paper) {

        var bbox = V.transformRect(pathNode.getBBox(), paper.matrix().inverse());
        var p = new this({
            position: { x: bbox.x, y: bbox.y },
            size: { width: bbox.width, height: bbox.height },
            attrs: { path: { refD: pathNode.getAttribute('d') }}
        });

        return p;
    }
});
