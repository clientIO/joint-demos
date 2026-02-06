/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

/* global Vue, App */
Vue.component('Rappid', {
    mounted: function() {
        joint.setTheme('light');
        const app = new App.MainView({ el: this.$el });
        app.graph.fromJSON(JSON.parse(App.config.sampleGraphs.emergencyProcedure), { ignoreUndoRedo: true });
    },
    template: `
        <div id="app" class="joint-app">
            <div class="app-header">
                <img src = "/assets/icons/joint-js.svg" alt="JointJS"/>
            </div>
            <div class="toolbar-container"></div>
            <div class="app-body">
                <div class="stencil-container"></div>
                <div class="paper-container"></div>
                <div class="inspector-container">
                    <div class="inspector-header hidden">
                        <button class="open-groups-btn"></button>
                        <button class="close-groups-btn"></button>
                        <span class="inspector-header-text">Properties</span>
                    </div>
                    <div class="inspector-content"></div>
                </div>
                <div class="navigator-container"></div>
            </div>
        </div>
    `
});
