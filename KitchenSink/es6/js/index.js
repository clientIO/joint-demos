/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

// This ES6 version of Kitchen Sink defines everything
// in the global variable `App`.
var App = window.App || {};

// Set a default theme.
joint.setTheme('light');

// See `views/main.js` for details.
const app = new App.MainView({ el: '#app' });

// Waiting for all the fonts to load before we render the default canvas content.
window.addEventListener('load', () => {
    app.graph.fromJSON(JSON.parse(App.config.sampleGraphs.emergencyProcedure), { ignoreUndoRedo: true });
});

// Make the `app` variable available in the console for debugging purposes.
window.app = app;
