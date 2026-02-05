const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const dist = path.resolve(__dirname, 'dist');
const isProd = process.env.NODE_ENV === 'production';

module.exports = {
    resolve: {
        extensions: ['.ts', '.js']
    },
    devtool: isProd ? false : 'source-map',
    entry: './index.ts',
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
    mode: isProd ? 'production' : 'development',
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
            {
                test: /\.css$/,
                sideEffects: true,
                use: [
                    'style-loader',
                    { loader: 'css-loader', options: { url: false }}
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
