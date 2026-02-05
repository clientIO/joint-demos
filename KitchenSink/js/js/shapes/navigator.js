/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

const UpdateFlags = {
    Render: '@render',
    Update: '@update',
    Transform: '@transform'
};

(function(joint, util) {

    // Simplified element view for the navigator.
    // The elements in the navigator are represented by simple rectangles (no labels, no ports, etc.)
    // Note: this is an advanced example of a custom element view that overrides several methods.
    joint.shapes.app.NavigatorElementView = joint.dia.ElementView.extend({
        body: null,
        markup: util.svg/* xml */`<path @selector="body" opacity="0.4" />`,
        // updates run on view initialization
        initFlag: [UpdateFlags.Render, UpdateFlags.Update, UpdateFlags.Transform],
        // updates run when the model attribute changes
        presentationAttributes: {
            position: [UpdateFlags.Transform],
            angle: [UpdateFlags.Transform],
            size: [UpdateFlags.Update], // shape
        },
        // calls in an animation frame after a multiple changes
        // has been made to the model
        confirmUpdate: function(flags) {
            if (this.hasFlag(flags, UpdateFlags.Render)) this.render();
            if (this.hasFlag(flags, UpdateFlags.Update)) this.update();
            // using the original `updateTransformation()` method
            if (this.hasFlag(flags, UpdateFlags.Transform)) this.updateTransformation();
        },
        render: function() {
            const doc = util.parseDOMJSON(this.markup);
            this.body = doc.selectors.body;
            this.body.classList.add(this.model.get('group'));
            this.el.appendChild(doc.fragment);
        },
        update: function() {
            const { model, body } = this;
            // shape
            const { width, height } = model.size();
            const d = `M 0 0 H ${width} V ${height} H 0 Z`;
            body.setAttribute('d', d);
        }
    });

    joint.ui.widgets.iconButton = joint.ui.widgets.button.extend({
        render: function() {
            const size = this.options.size || 20;
            const imageEl = document.createElement('img');
            imageEl.style.width = `${size}px`;
            imageEl.style.height = `${size}px`;
            this.el.appendChild(imageEl);
            this.setIcon(this.options.icon);
            this.setTooltip(this.options.tooltip);
            return this;
        },
        setIcon: function(icon = '') {
            this.el.querySelector('img').src = icon;
        },
        setTooltip: function(tooltip = '') {
            this.el.dataset.tooltip = tooltip;
        }
    });

})(joint, joint.util);
