const HtmlWebPackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
var path = require('path');

module.exports = {
    entry : './index.js',
    output: {
        //path: '/Users/johnny/Documents/GitHub/p3anoman.github.io/poker',
        path: path.join(__dirname, 'dist'),
        filename: '[name]-[contenthash:8].js',
        chunkFilename: 'chunk-[name]-[contenthash:8].js',
    },
    devServer: {
        allowedHosts: 'all',
        port: 1234
    },
    resolve: {
       fallback: { "crypto": false }
    },
    experiments: {
        asyncWebAssembly: true,
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                enforce: "pre",
                use: ["source-map-loader"],
            },
            {
              test: /\.(png|svg|jpg|gif|mp3|fbx|otf)$/,
              loader: 'file-loader',
              options: {
                  name: '[contenthash:8].[ext]',
              },
            },
            {
              test: /\.css$/,
              use: ['style-loader', 'css-loader']
            },
        ],
    },
    plugins: [
        new HtmlWebPackPlugin({
            template: 'index.html',   // input
            filename: 'index.html',   // output filename in dist/
        }),
        new CopyPlugin({
            patterns: [
                { from: 'cards', to: 'cards', noErrorOnMissing: false }
            ]
        }),
    ]
};
