const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  context: __dirname,
  entry: [
    'react-hot-loader/patch',
    'webpack-dev-server/client?http://localhost:8080',
    'webpack/hot/only-dev-server',
    './js/ClientApp.jsx',
    './style/App.scss'
  ],
  devtool: 'cheap-eval-source-map',
  output: {
    path: path.join(__dirname, 'public'),
    filename: 'bundle.js',
    publicPath: '/public/'
  },
  devServer: {
    hot: true,
    publicPath: '/public/',
    historyApiFallback: true
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']
  },
  stats: {
    colors: true,
    reasons: true,
    chunks: true
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NamedModulesPlugin(),
    new ExtractTextPlugin({
      filename: 'bundle.css',
      allChunks: true
    })
  ],
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /\.jsx?$/,
        loader: 'eslint-loader',
        exclude: /node_modules/
      },
      {
        test: /\.jsx?$/,
        loader: 'babel-loader'
      },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract({
          use: 'css-loader?importLoaders=1'
        })
      },
      {
        test: /\.(sass|scss)$/,
        loader: ExtractTextPlugin.extract(['css-loader', 'sass-loader'])
      }
    ]
  }
};
