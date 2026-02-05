/*! JointJS+ v4.2.2 (2026-01-22) - HTML5 Diagramming Framework

Copyright (c) 2025 client IO

This Source Code Form is subject to the terms of the JointJS+
License, v. 2.0. If a copy of the JointJS+ License was not
distributed with this file, You can obtain one at
https://www.jointjs.com/license or from the JointJS+ archive as was
distributed by client IO. See the LICENSE file.
*/

const CopyPlugin = require('copy-webpack-plugin');

var path = process.cwd() + '/dist';

module.exports = {
    entry: './index.ts',
    mode: 'development',
    output: {
        path: path,
        filename: 'bundle.js'
    },
    resolve: {
        extensions: ['.ts', '.js', '.css']
    },
    devtool: 'source-map',
    devServer: {
        static: path,
        hot: true,
        port: process.env.PORT || 8080,
        host: process.env.HOST || 'localhost'
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [{ loader: 'ts-loader', options: { allowTsInNodeModules: true }}]
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    {
                        loader: 'file-loader',
                        options: { outputPath: 'css/', name: '[name].css' }
                    },
                    'sass-loader'
                ]
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: './index.html', to: './' },
                { from: './favicon.png', to: './', noErrorOnMissing: true },
                { from: './assets', to: './assets', noErrorOnMissing: true },
                { from: './joint-light-theme/assets', to: './assets', noErrorOnMissing: true }
            ]
        })
    ]
};
