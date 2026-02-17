const CopyPlugin = require('copy-webpack-plugin');

const path = process.cwd() + '/dist';

module.exports = {
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },
    entry: './src/index.ts',
    output: {
        path: path,
        filename: 'bundle.js'
    },
    mode: 'development',
    module: {
        rules: [
            { test: /\.ts$/, loader: 'ts-loader' },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader',
                ],
            },
        ],
    },
    plugins: [
        new CopyPlugin([
            { from: './index.html', to: './' }
        ])
    ],
    devServer: {
        static: {
            directory: __dirname,
        },
        compress: true,
    },
};
