const CopyPlugin = require('copy-webpack-plugin');

const currentPath = process.cwd() + '/dist';

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
    entry: './index.ts',
    mode: isProduction ? 'production' : 'development',
    output: {
        path: currentPath,
        filename: 'bundle.js'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    devtool: isProduction ? false : 'source-map',
    devServer: {
        static: currentPath,
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
            },
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
