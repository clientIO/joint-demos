const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const dist = path.resolve(__dirname, 'dist');

module.exports = {
    resolve: {
        extensions: ['.ts', '.js']
    },
    devtool: 'source-map',
    entry: './index.js',
    output: {
        filename: 'bundle.js',
        path: dist
    },
    devServer: {
        static: dist,
        hot: true,
        port: process.env.PORT || 8080,
        host: process.env.HOST || 'localhost'
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
            }
        ]
    },

    plugins: [
        new CopyPlugin({
            patterns: [
                { from: './index.html', to: './' },
                { from: './assets', to: './assets', noErrorOnMissing: true },
            ]
        })
    ]
};
