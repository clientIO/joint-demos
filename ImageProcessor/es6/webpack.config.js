var CopyPlugin = require('copy-webpack-plugin');
var NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

var path = process.cwd() + '/dist';

module.exports = {
    entry: './index.js',
    mode: 'development',
    output: {
        path: path,
        filename: 'bundle.js'
    },
    resolve: {
        extensions: ['.js'],
        fallback: {
            'fs' : false
        }
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
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: './index.html', to: './' },
                { from: './assets', to: './assets', noErrorOnMissing: true },
                { from: './examples', to: './examples', noErrorOnMissing: true }
            ]
        }),
        new NodePolyfillPlugin()
    ]
};
