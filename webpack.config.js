'use strict';

module.exports = {
  entry: './src/index.js',
  output: {
    filename: './dist/table-model.js',
    library: 'tableModel',
    libraryExport: 'default',
    libraryTarget: 'umd'
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'eslint-loader',
        enforce: 'pre'
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loaders: [
          'babel-loader'
        ]
      },
    ]
  },

  devtool: 'source-map'
};
