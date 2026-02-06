/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

joint.dia.Element.define('collapsible.Model', {
    size: {
        width: 100,
        height: 27
    },
    z: 2,
    hidden: false,
    attrs: {
        root: {
            pointerEvents: 'none'
        },
        body: {
            width: 'calc(w)',
            height: 'calc(h)',
            strokeWidth: 1,
            fill: '#FFFFFF',
            stroke: '#A0A0A0'
        },
        label: {
            textWrap: {
                ellipsis: true,
                width: -10
            },
            textVerticalAnchor: 'middle',
            textAnchor: 'middle',
            x: 'calc(0.5 * w)',
            y: 'calc(0.5 * h)',
            fontFamily: 'source_sans_prosemibold',
            fontSize: 14
        },
        buttonGroup: {
            transform: 'translate(calc(w), calc(0.5 * h))'
        },
        button: {
            fill: '#4C65DD',
            stroke: 'none',
            x: -10,
            y: -10,
            height: 20,
            width: 30,
            rx: 10,
            ry: 10,
            cursor: 'pointer',
            event: 'element:collapse'
        },
        buttonSign: {
            transform: 'translate(5, -5)',
            stroke: '#FFFFFF',
            strokeWidth: 1.6
        }
    }
}, {

    PLUS_SIGN: 'M 1 5 9 5 M 5 1 5 9',
    MINUS_SIGN: 'M 2 5 8 5',

    markup: [{
        tagName: 'g',
        selector: 'buttonGroup',
        children: [{
            tagName: 'rect',
            selector: 'button',
            attributes: {
                'pointer-events': 'visiblePainted'
            }
        }, {
            tagName: 'path',
            selector: 'buttonSign',
            attributes: {
                'fill': 'none',
                'pointer-events': 'none'
            }
        }]
    }, {
        tagName: 'rect',
        selector: 'body',
    }, {
        tagName: 'text',
        selector: 'label'
    }],

    isHidden: function() {
        return !!this.get('hidden');
    },

    isCollapsed: function() {
        return !!this.get('collapsed');
    },

    toggleButtonVisibility: function(visible) {
        this.attr('buttonGroup', { display: visible ? 'block' : 'none' });
    },

    toggleButtonSign: function(plus) {
        if (plus) {
            this.attr('buttonSign', { d: this.PLUS_SIGN, strokeWidth: 1.6 });
        } else {
            this.attr('buttonSign', { d: this.MINUS_SIGN, strokeWidth: 1.8 });
        }
    }

});

joint.shapes.standard.Link.define('collapsible.Link', {
    attrs: {
        root: {
            pointerEvents: 'none'
        },
        line: {
            stroke: '#A0A0A0',
            strokeWidth: 1,
            targetMarker: null
        }
    },
    z: 1
}, {

    isHidden: function() {
        // If the target element is collapsed, we don't want to
        // show the link either
        var targetElement = this.getTargetElement();
        return !targetElement || targetElement.isHidden();
    }
});
