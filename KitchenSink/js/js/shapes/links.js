/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

(function(joint, util) {

    'use strict';

    const cache = new Map();

    // Custom link definitions. It serves as a template for instantiating links.
    // The template below is used as the default link defined in `views/main.js`.

    joint.shapes.standard.Link.define('app.Link', {
        attrs: {
            line: {
                stroke: '#8f8f8f',
                strokeDasharray: '0',
                strokeWidth: 2,
                fill: 'none',
                sourceMarker: {
                    type: 'path',
                    d: 'M 0 0 0 0',
                    stroke: 'none'
                },
                targetMarker: {
                    type: 'path',
                    d: 'M 0 -5 -10 0 0 5 z',
                    stroke: 'none'
                }
            }
        },
        router: {
            name: 'normal'
        },
        connector: {
            name: 'rounded'
        },
        labels: [],
    }, {

        defaultLabel: {
            attrs: {
                rect: {
                    fill: '#ffffff',
                    stroke: '#8f8f8f',
                    strokeWidth: 1,
                    width: 'calc(w + 10)',
                    height: 'calc(h + 10)',
                    x: 'calc(x - 5)',
                    y: 'calc(y - 5)'
                }
            }
        },

        getMarkerWidth: function(type) {
            var d = (type === 'source') ? this.attr('line/sourceMarker/d') : this.attr('line/targetMarker/d');
            return this.getDataWidth(d);
        },

        getDataWidth: function(d) {

            if (cache.has(d)) {
                return cache.get(d);
            } else {
                var bbox = (new g.Path(d)).bbox();
                cache.set(d, bbox ? bbox.width : 0);
                return cache.get(d);
            }
        }

    }, {

        // The `app.Link` introduces a custom connection point, that sets the link offset
        // from the element's boundary based on the width of the marker (arrowhead).
        connectionPoint: function(line, view, magnet, _opt, type, linkView) {
            var link = linkView.model;
            var markerWidth = (link.get('type') === 'app.Link') ? link.getMarkerWidth(type) : 0;
            var opt = { offset: markerWidth, stroke: true };
            // connection point for UML shapes lies on the root group containing all the shapes components
            var modelType = view.model.get('type');
            // taking the border stroke-width into account
            if (modelType === 'standard.InscribedImage') opt.selector = 'border';
            return joint.connectionPoints.boundary.call(this, line, view, magnet, opt, type, linkView);
        }
    });

})(joint, joint.util);
