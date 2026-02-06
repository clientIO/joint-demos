var CopyPlugin = require('copy-webpack-plugin');

var path = process.cwd() + '/dist';

module.exports = {
    entry: './index.ts',
    mode: 'development',
    output: {
        path: path,
        filename: 'bundle.js'
    },
    resolve: {
        extensions: ['.ts', '.js']
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
                use: ['style-loader', 'css-loader']
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
                { from: './assets', to: './assets', noErrorOnMissing: true }
            ]
        })
    ]
};
