'use strict';

const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/demo/index.js',
  output: {
    path: process.cwd() + '/dist/demo',
    filename: 'index.js'
  },

  module: {
    rules: [
      {
        test: /\.s?css$/,
          loaders: [
          'style-loader',
          'css-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'eslint-loader',
        enforce: 'pre'
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      }
    ]
  },

  devtool: 'source-map',

  plugins: [
    new HtmlWebpackPlugin({ template: './src/demo/index.html' })
  ]
};
