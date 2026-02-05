/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

var App = window.App || {};

(function(joint, util) {
    App.StencilBackground = joint.dia.HighlighterView.extend({
        tagName: 'rect',

        attributes: {
            'stroke': 'none',
            'fill': 'transparent',
            'pointer-events': 'none',
            'rx': 4,
            'ry': 4,
        },

        style: {
            transition: 'fill 400ms'
        },

        options: {
            padding: 0,
            color: 'gray',
            width: null,
            height: null,
            layer: joint.dia.Paper.Layers.BACK
        },

        // Method called to highlight a CellView
        highlight(cellView) {
            const { padding, width, height } = this.options;
            const bbox = cellView.model.getBBox();
            // Highlighter is always rendered relatively to the CellView origin
            bbox.x = bbox.y = 0;
            // Custom width and height can be set
            if (Number.isFinite(width)) {
                bbox.x = (bbox.width - width) / 2;
                bbox.width = width;
            }
            if (Number.isFinite(height)) {
                bbox.y = (bbox.height - height) / 2;
                bbox.height = height;
            }
            // Increase the size of the highlighter
            bbox.inflate(padding);
            this.vel.attr(bbox.toJSON());
            // Change the color of the highlighter (allow transition)
            util.nextFrame(() => this.vel.attr('fill', this.options.color));
        }

    });
})(joint, joint.util);
