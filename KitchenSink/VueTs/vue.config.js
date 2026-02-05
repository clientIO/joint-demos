/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

const path = require('path');

module.exports = {
    chainWebpack: config => {
        const tsRule = config.module.rule('ts');
        // change transpileOnly flag to get access to the namespaces
        tsRule
            .use('ts-loader')
            .loader('ts-loader')
            .tap(options => {
                return {
                    ...options,
                    transpileOnly: false
                };
            });
    },
    configureWebpack: {
        resolve: {
            alias: {
                '/assets': path.resolve(__dirname, '/public/assets/'),
            }
        }
    },
};
