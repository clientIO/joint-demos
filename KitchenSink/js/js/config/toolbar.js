/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

var App = App || {};
App.config = App.config || {};

(function() {

    'use strict';

    App.config.toolbar = {
        groups: {
            left: {
                index: 1,
                align: 'left'
            },
            right: {
                index: 2,
                align: 'right'
            },
        },
        tools: [
            {
                type: 'button',
                name: 'select-file',
                group: 'left',
                attrs: {
                    button: {
                        'data-tooltip': 'File',
                        'data-tooltip-position': 'top',
                        'data-tooltip-position-selector': '.toolbar-container'
                    }
                }
            },
            {
                type: 'separator',
                group: 'left',
            },
            {
                type: 'undo',
                name: 'undo',
                group: 'left',
                attrs: {
                    button: {
                        'data-tooltip': 'Undo',
                        'data-tooltip-position': 'top',
                        'data-tooltip-position-selector': '.toolbar-container'
                    }
                }
            },
            {
                type: 'redo',
                name: 'redo',
                group: 'left',
                attrs: {
                    button: {
                        'data-tooltip': 'Redo',
                        'data-tooltip-position': 'top',
                        'data-tooltip-position-selector': '.toolbar-container'
                    }
                }
            },
            {
                type: 'separator',
                group: 'left',
            },
            {
                type: 'button',
                name: 'select-layout',
                group: 'left',
                text: 'Layout'
            },
            {
                type: 'button',
                text: 'Canvas settings',
                name: 'select-canvas-settings',
                group: 'right'
            },
            {
                type: 'separator',
                group: 'right',
            },
            {
                type: 'button',
                name: 'select-share',
                group: 'right',
                attrs: {
                    button: {
                        'data-tooltip': 'Share',
                        'data-tooltip-position': 'top',
                        'data-tooltip-position-selector': '.toolbar-container'
                    }
                }
            }
        ],
    };

    App.config.settingsInspector = {
        inputs: {
            paperColor: {
                type: 'color',
                label: 'Paper color'
            },
            snaplines: {
                type: 'toggle',
                label: 'Snaplines'
            },
            infinitePaper: {
                type: 'toggle',
                label: 'Infinite paper',
            },
            dotGrid: {
                type: 'toggle',
                label: 'Dot grid',
            },
            gridSize: {
                type: 'range',
                label: 'Grid size',
                min: 1,
                max: 50,
                step: 1
            }
        }
    };
})();
