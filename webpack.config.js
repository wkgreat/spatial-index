const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
    entry: './src/index.js', // 入口文件
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    mode: 'development', // 或 'production'
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        port: 9001,
        open: true,
    },
    module: {
        rules: [
            {
                test: /\.css$/, // 处理 CSS 文件
                use: ['style-loader', 'css-loader'],
            }
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: 'src/index.html',
            filename: `index.html`
        }),
        new HtmlWebpackPlugin({
            template: 'src/demos/rtree.html',
            filename: `rtree.html`
        }),
    ]
};