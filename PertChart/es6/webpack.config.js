const CopyPlugin = require('copy-webpack-plugin');
const path = require('path');

const resolvedPath = path.resolve(__dirname, 'dist');

module.exports = {
    resolve: {
        extensions: ['.js']
    },
    devtool: 'inline-source-map',
    entry: './index.js',
    output: {
        filename: 'bundle.js',
        path: resolvedPath
    },
    mode: 'development',
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
            {
                test: /\.css$/,
                sideEffects: true,
                use: [
                    'style-loader',
                    'css-loader'
                ]
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader'
                ]
            }
        ]
    },
    devServer: {
        hot: true,
        static: {
            directory: resolvedPath,
        },
        compress: true
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: './index.html', to: './' },
                { from: './assets', to: './assets', noErrorOnMissing: true }
            ]
        })
    ]
};
